from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import schemas, models, auth, database
from ..services.github_oauth_service import GitHubOAuthService

router = APIRouter(prefix="/integrations", tags=["Integrations"])

@router.get("/github/status", response_model=schemas.GithubStatusResponse)
def get_github_status(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    github_identity = db.query(models.GithubIdentity).filter(models.GithubIdentity.user_id == current_user.id).first()
    if not github_identity:
        return schemas.GithubStatusResponse(connected=False)
        
    return schemas.GithubStatusResponse(
        connected=True,
        username=github_identity.github_username,
        scopes=github_identity.granted_scopes.split(",") if github_identity.granted_scopes else [],
        connected_at=github_identity.connected_at
    )

@router.delete("/github")
async def disconnect_github(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    github_identity = db.query(models.GithubIdentity).filter(models.GithubIdentity.user_id == current_user.id).first()
    if not github_identity:
        raise HTTPException(status_code=404, detail="GitHub not connected")
        
    access_token = auth.decrypt_token(github_identity.access_token_encrypted)
    if access_token:
        try:
            await GitHubOAuthService.revoke_token(access_token)
        except Exception:
            pass # Even if GitHub API fails, we still disconnect locally
            
    db.delete(github_identity)
    db.commit()
    return {"detail": "GitHub disconnected"}
