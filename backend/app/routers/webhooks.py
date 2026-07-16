import os
from fastapi import APIRouter, Header, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from app import database, models
from app.services.github_sync import GitHubSyncService

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@router.post("/github")
async def github_webhook_receiver(
    request: Request,
    x_hub_signature_256: str = Header(None),
    x_github_event: str = Header(None),
    db: Session = Depends(database.get_db)
):
    """
    Main webhook receiver endpoint that validates HMAC signatures and parses events.
    """
    if not x_hub_signature_256 or not x_github_event:
        raise HTTPException(status_code=400, detail="Missing required webhook headers")

    payload = await request.body()
    
    # Retrieve webhook settings from database to get correct verification secret
    # For MVP we can match the repository using the payload's repository name/URL
    # or fallback to GITHUB_WEBHOOK_SECRET env var.
    payload_json = {}
    try:
        payload_json = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    repo_url = payload_json.get("repository", {}).get("html_url", "")
    if not repo_url:
         raise HTTPException(status_code=400, detail="Repository details missing from payload")

    # Match repository in DB
    repo = db.query(models.Repository).filter(
        models.Repository.source_url.contains(repo_url.replace("https://github.com/", ""))
    ).first()
    if not repo:
         raise HTTPException(status_code=404, detail="No matching repository configured")

    # Fetch webhook secret
    webhook_secret = os.getenv("GITHUB_WEBHOOK_SECRET", "default_secret")
    db_webhook = db.query(models.Webhook).filter(models.Webhook.repository_id == repo.id).first()
    if db_webhook and db_webhook.secret_ref:
         webhook_secret = db_webhook.secret_ref

    # Verify signature
    is_valid = GitHubSyncService.verify_webhook_signature(
        payload=payload,
        signature=x_hub_signature_256,
        secret=webhook_secret
    )
    if not is_valid:
        raise HTTPException(status_code=401, detail="Signature verification failed")

    # Process and sync cache
    GitHubSyncService.process_incoming_event(
        db=db,
        repository_id=repo.id,
        event_type=x_github_event,
        payload=payload_json
    )

    return {"status": "event normalized and synced"}
