import hmac
import hashlib
from datetime import datetime
from sqlalchemy.orm import Session
from app import models
from app.services.automation_engine import AutomationEngine

class GitHubSyncService:
    @staticmethod
    def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
        """
        Verifies that the webhook payload matches the signature sent by GitHub using HMAC-SHA256.
        """
        if not signature or not secret:
            return False
        
        # GitHub signature is in the format: sha256=xxx
        sha_type, signature_hash = signature.split("=") if "=" in signature else ("", signature)
        if sha_type != "sha256":
            return False

        mac = hmac.new(secret.encode(), msg=payload, digestmod=hashlib.sha256)
        return hmac.compare_digest(mac.hexdigest(), signature_hash)

    @staticmethod
    def process_incoming_event(db: Session, repository_id: str, event_type: str, payload: dict) -> models.GithubEvent:
        """
        Normalizes the webhook payload, saves a normalized event record,
        and updates pull_requests, issues, or commits cache.
        """
        # Save event
        payload_hash = hashlib.sha256(str(payload).encode()).hexdigest()
        db_event = models.GithubEvent(
            repository_id=repository_id,
            event_type=event_type,
            payload_hash=payload_hash,
            processing_status="pending"
        )
        db.add(db_event)
        db.commit()
        db.refresh(db_event)

        try:
            # Normalize specific events
            if event_type == "pull_request":
                action = payload.get("action")
                pr_data = payload.get("pull_request", {})
                pr_number = pr_data.get("number")
                
                if action in ["opened", "synchronize", "reopened", "closed"]:
                    # Update PR cache
                    db_pr = db.query(models.PullRequest).filter(
                        models.PullRequest.repository_id == repository_id,
                        models.PullRequest.github_pr_number == pr_number
                    ).first()
                    
                    state = "open"
                    if pr_data.get("merged"):
                        state = "merged"
                    elif pr_data.get("state") == "closed":
                        state = "closed"

                    if not db_pr:
                        db_pr = models.PullRequest(
                            repository_id=repository_id,
                            github_pr_number=pr_number,
                            title=pr_data.get("title", ""),
                            author=pr_data.get("user", {}).get("login", "unknown"),
                            state=state,
                            base_branch=pr_data.get("base", {}).get("ref", ""),
                            head_branch=pr_data.get("head", {}).get("ref", ""),
                            mergeable_state=pr_data.get("mergeable_state")
                        )
                        db.add(db_pr)
                    else:
                        db_pr.title = pr_data.get("title", db_pr.title)
                        db_pr.state = state
                        db_pr.mergeable_state = pr_data.get("mergeable_state", db_pr.mergeable_state)
                        db_pr.last_synced_at = datetime.utcnow()
                    db.commit()

            elif event_type == "issues":
                action = payload.get("action")
                issue_data = payload.get("issue", {})
                issue_number = issue_data.get("number")
                
                if action in ["opened", "closed", "reopened"]:
                    db_issue = db.query(models.Issue).filter(
                        models.Issue.repository_id == repository_id,
                        models.Issue.github_issue_number == issue_number
                    ).first()
                    
                    state = issue_data.get("state", "open")
                    
                    if not db_issue:
                        db_issue = models.Issue(
                            repository_id=repository_id,
                            github_issue_number=issue_number,
                            title=issue_data.get("title", ""),
                            author=issue_data.get("user", {}).get("login", "unknown"),
                            state=state,
                            labels=[l.get("name") for l in issue_data.get("labels", [])]
                        )
                        db.add(db_issue)
                    else:
                        db_issue.title = issue_data.get("title", db_issue.title)
                        db_issue.state = state
                        db_issue.labels = [l.get("name") for l in issue_data.get("labels", [])]
                        db_issue.last_synced_at = datetime.utcnow()
                    db.commit()

            elif event_type == "push":
                # Push event contains commits
                commits = payload.get("commits", [])
                branch = payload.get("ref", "").replace("refs/heads/", "")
                for c in commits:
                    db_commit = db.query(models.Commit).filter(
                        models.Commit.repository_id == repository_id,
                        models.Commit.sha == c.get("id")
                    ).first()
                    if not db_commit:
                        db_commit = models.Commit(
                            repository_id=repository_id,
                            sha=c.get("id"),
                            author=c.get("author", {}).get("name", "unknown"),
                            message=c.get("message", ""),
                            branch=branch,
                            committed_at=datetime.utcnow() # Push event lacks precise commit details inside payload sometimes, set current
                        )
                        db.add(db_commit)
                db.commit()

            db_event.processing_status = "success"
            db_event.processed_at = datetime.utcnow()
            db.commit()

            # Trigger automation rules evaluation
            AutomationEngine.evaluate_rules(db, repository_id, event_type, payload)

        except Exception as e:
            print(f"[GitHubSync] Failed to process event {event_type}: {e}")
            db_event.processing_status = "failed"
            db.commit()

        return db_event
