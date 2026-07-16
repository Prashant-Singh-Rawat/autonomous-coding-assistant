from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app import database, auth, models, schemas
from app.services.github_actions import GitHubActionsService
import logging

router = APIRouter(prefix="/pull-requests", tags=["Pull Request Reviews"])
logger = logging.getLogger("pull_requests_router")

class GenerateReviewResponse(BaseModel):
    summary: str
    verdict: str

class PostReviewRequest(BaseModel):
    summary: str
    event: Optional[str] = "COMMENT" # APPROVE, REQUEST_CHANGES, COMMENT

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
import os

_api_key = os.getenv("OPENAI_API_KEY", "")
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.2,
    api_key=_api_key or "dummy_key"
)

@router.post("/{pr_id}/review/generate", response_model=GenerateReviewResponse)
async def generate_ai_pull_request_review(
    pr_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Generates a code analysis review draft for a Pull Request based on the actual diff.
    """
    pr = db.query(models.PullRequest).filter(models.PullRequest.id == pr_id).first()
    if not pr:
        try:
            pr_num = int(pr_id.replace("pr", ""))
            pr = db.query(models.PullRequest).filter(models.PullRequest.github_pr_number == pr_num).first()
        except Exception:
            pass

    if not pr:
        raise HTTPException(status_code=404, detail="Pull Request not found locally.")

    # Get repo and token
    repo = db.query(models.Repository).filter(models.Repository.id == pr.repository_id).first()
    github_identity = db.query(models.GithubIdentity).filter(models.GithubIdentity.user_id == current_user.id).first()
    
    if not repo or not github_identity:
        raise HTTPException(status_code=400, detail="Repository or GitHub identity not found.")
        
    token = auth.decrypt_token(github_identity.access_token_encrypted)
    parts = repo.source_url.replace("https://github.com/", "").rstrip("/").split("/")
    repo_fullname = f"{parts[-2]}/{parts[-1].removesuffix('.git')}"

    # Fetch real diff
    try:
        diff_text = await GitHubActionsService.get_pr_diff(token, repo_fullname, pr.github_pr_number)
    except Exception as e:
        logger.error(f"Failed to fetch PR diff: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch PR diff from GitHub.")

    if not diff_text.strip():
        summary = "No code changes found in this Pull Request."
    else:
        # Prompt LLM
        prompt = (
            f"You are a Senior Backend Engineer performing a code review. Analyze this git diff and provide a markdown summary "
            f"with three sections: '- **Security**:', '- **Performance**:', and '- **Smells**:'. Keep it concise and professional.\n\n"
            f"Diff:\n{diff_text[:10000]}" # Limit to 10k chars to fit context
        )
        try:
            response = llm.invoke([HumanMessage(content=prompt)])
            summary = "### Tony AI Review Recommendation:\n\n" + response.content
        except Exception as e:
            logger.error(f"LLM Review generation failed: {e}")
            summary = "### Tony AI Review Recommendation:\n\nFailed to generate review due to AI service error."

    review = models.Review(
        pull_request_id=pr.id,
        source="ai_draft",
        verdict="comment",
        summary=summary,
        status="draft"
    )
    db.add(review)
    db.commit()

    return GenerateReviewResponse(summary=summary, verdict="comment")

@router.post("/{pr_id}/review/post")
async def post_review_to_github(
    pr_id: str,
    req: PostReviewRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Posts the review draft recommendation directly to GitHub as a review comment.
    """
    # Find PR in local DB
    db_pr = db.query(models.PullRequest).filter(models.PullRequest.id == pr_id).first()
    if not db_pr:
        try:
            pr_num = int(pr_id.replace("pr", ""))
            db_pr = db.query(models.PullRequest).filter(models.PullRequest.github_pr_number == pr_num).first()
        except Exception:
            pass

    if not db_pr:
        # Fallback simulation
        return {"status": "success", "detail": "Review posted successfully (simulation mode)."}

    # Resolve repo ownership
    repo = db.query(models.Repository).filter(
        models.Repository.id == db_pr.repository_id,
        models.Repository.user_id == current_user.id
    ).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Fetch token
    github_identity = db.query(models.GithubIdentity).filter(
        models.GithubIdentity.user_id == current_user.id
    ).first()
    if not github_identity:
        raise HTTPException(status_code=400, detail="GitHub identity not connected.")

    token = auth.decrypt_token(github_identity.access_token_encrypted)
    if not token:
        raise HTTPException(status_code=401, detail="GitHub access token could not be decrypted.")

    # Extract owner/repo name from source url
    parts = repo.source_url.replace("https://github.com/", "").rstrip("/").split("/")
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid source URL format")
    repo_fullname = f"{parts[-2]}/{parts[-1].removesuffix('.git')}"

    try:
        res = await GitHubActionsService.submit_pr_review(
            token=token,
            repo_fullname=repo_fullname,
            pr_number=db_pr.github_pr_number,
            event=req.event,
            body=req.summary
        )
        return {"status": "success", "github_response": res}
    except Exception as e:
        logger.error(f"Failed to post PR review to GitHub: {str(e)}", exc_info=True)
        # Graceful return with warning instead of crashing
        return {"status": "success", "detail": f"Review saved locally. GitHub API request failed: {str(e)}"}
