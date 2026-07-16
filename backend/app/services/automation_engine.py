from sqlalchemy.orm import Session
from app import models
from app.celery_app import celery_app

class AutomationEngine:
    @staticmethod
    def evaluate_rules(db: Session, repository_id: str, trigger_event: str, event_payload: dict):
        """
        Queries all active rules for a repository, filters by event trigger,
        and enqueues the designated celery automation task.
        """
        rules = db.query(models.AutomationRule).filter(
            models.AutomationRule.repository_id == repository_id,
            models.AutomationRule.trigger_event == trigger_event,
            models.AutomationRule.is_enabled == True
        ).all()

        for rule in rules:
            # Check custom JSON condition if matches
            # Enqueue task based on rule.action_type
            task_name = None
            queue_name = "general_automation"

            if rule.action_type == "auto_review":
                task_name = "app.tasks.run_auto_pr_review"
                queue_name = "ai_review"
            elif rule.action_type == "auto_scan":
                task_name = "app.tasks.run_auto_security_scan"
                queue_name = "scans"
            elif rule.action_type == "auto_label":
                task_name = "app.tasks.run_auto_issue_labeling"
                queue_name = "general_automation"

            if task_name:
                # Dispatch task asynchronously with parameters
                celery_app.send_task(
                    task_name,
                    args=[repository_id, event_payload, rule.auto_apply],
                    queue=queue_name
                )

                # Save an agent run log entry
                agent_run = models.AgentRun(
                    repository_id=repository_id,
                    agent_type=rule.action_type,
                    triggered_by=rule.id,
                    status="running"
                )
                db.add(agent_run)
                db.commit()
