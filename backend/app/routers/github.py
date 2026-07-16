from datetime import datetime
from typing import List, Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import schemas, models, auth, database
from ..services.github_oauth_service import GitHubOAuthService

router = APIRouter(prefix="/github", tags=["GitHub Integration"])
logger = logging.getLogger("github_router")

class GithubConnectRequest(BaseModel):
    code: Optional[str] = None
    access_token: Optional[str] = None

@router.post("/connect", status_code=status.HTTP_200_OK)
async def connect_github(
    req: GithubConnectRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Connects a GitHub account to the currently authenticated user.
    Accepts either an authorization 'code' (exchanged for a token) or a direct 'access_token'.
    """
    access_token = req.access_token

    if req.code:
        logger.info("Exchanging auth code for GitHub access token")
        try:
            token_data = await GitHubOAuthService.exchange_code_for_token(req.code)
            access_token = token_data.get("access_token")
        except HTTPException as he:
            logger.error(f"HTTPException exchanging code: {he.detail}")
            raise he
        except Exception as e:
            logger.error(f"Unexpected error exchanging code: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to exchange code: {str(e)}")

    if not access_token:
        raise HTTPException(
            status_code=400,
            detail="Either 'code' or 'access_token' must be provided to connect GitHub."
        )

    # Fetch user profile to verify token and get details
    logger.info("Fetching GitHub user profile with access token")
    try:
        user_profile = await GitHubOAuthService.get_user_profile(access_token)
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to fetch GitHub profile: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch GitHub profile: {str(e)}")

    github_user_id = user_profile.get("id")
    github_username = user_profile.get("login")
    if not github_user_id or not github_username:
        raise HTTPException(
            status_code=400,
            detail="Failed to retrieve valid GitHub user details (id/login) from profile."
        )

    try:
        # Check if the GitHub identity is already connected to another user
        existing_identity = db.query(models.GithubIdentity).filter(
            models.GithubIdentity.github_user_id == github_user_id,
            models.GithubIdentity.user_id != current_user.id
        ).first()
        if existing_identity:
            raise HTTPException(
                status_code=409,
                detail="This GitHub account is already connected to another user account."
            )

        github_identity = db.query(models.GithubIdentity).filter(
            models.GithubIdentity.user_id == current_user.id
        ).first()

        if github_identity:
            github_identity.access_token_encrypted = auth.encrypt_token(access_token)
            github_identity.github_user_id = github_user_id
            github_identity.github_username = github_username
            github_identity.granted_scopes = "read:user,user:email,repo,read:org"
            github_identity.connected_at = datetime.utcnow()
            github_identity.last_synced_at = datetime.utcnow()
        else:
            github_identity = models.GithubIdentity(
                user_id=current_user.id,
                github_user_id=github_user_id,
                github_username=github_username,
                access_token_encrypted=auth.encrypt_token(access_token),
                granted_scopes="read:user,user:email,repo,read:org"
            )
            db.add(github_identity)
        
        db.commit()
        logger.info(f"GitHub account {github_username} successfully connected for user {current_user.email}")
        return {
            "status": "connected",
            "github_username": github_username,
            "github_user_id": github_user_id
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Database error connecting GitHub: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error saving GitHub credentials")


@router.get("/user")
async def get_github_user(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns the connected GitHub user's profile information.
    """
    github_identity = db.query(models.GithubIdentity).filter(
        models.GithubIdentity.user_id == current_user.id
    ).first()
    
    if not github_identity:
        raise HTTPException(status_code=400, detail="GitHub account not connected.")

    access_token = auth.decrypt_token(github_identity.access_token_encrypted)
    if not access_token:
        raise HTTPException(status_code=401, detail="GitHub access token could not be decrypted or is missing.")

    try:
        profile = await GitHubOAuthService.get_user_profile(access_token)
        return profile
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error fetching user profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user profile from GitHub: {str(e)}")


@router.get("/organizations", response_model=List[schemas.GithubOrgResponse])
async def get_github_organizations(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Lists the GitHub organizations the authenticated user belongs to.
    """
    github_identity = db.query(models.GithubIdentity).filter(
        models.GithubIdentity.user_id == current_user.id
    ).first()
    
    if not github_identity:
        raise HTTPException(status_code=400, detail="GitHub account not connected.")

    access_token = auth.decrypt_token(github_identity.access_token_encrypted)
    if not access_token:
        raise HTTPException(status_code=401, detail="GitHub access token could not be decrypted or is missing.")

    url = "https://api.github.com/user/orgs"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github.v3+json"
    }

    try:
        response = await GitHubOAuthService._request_with_retry("GET", url, headers=headers)
        orgs = response.json()
        return [{"id": org["id"], "login": org["login"], "avatar_url": org.get("avatar_url")} for org in orgs]
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error listing organizations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve organizations from GitHub: {str(e)}")


@router.get("/repos", response_model=List[schemas.GithubRepositoryResponse])
async def get_github_repos(
    org: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Lists repositories available to the connected user from GitHub (either user repositories or org repositories).
    """
    github_identity = db.query(models.GithubIdentity).filter(
        models.GithubIdentity.user_id == current_user.id
    ).first()
    
    if not github_identity:
        raise HTTPException(status_code=400, detail="GitHub account not connected.")

    access_token = auth.decrypt_token(github_identity.access_token_encrypted)
    if not access_token:
        raise HTTPException(status_code=401, detail="GitHub access token could not be decrypted or is missing.")

    if org:
        url = f"https://api.github.com/orgs/{org}/repos?per_page=100&sort=updated"
    else:
        url = "https://api.github.com/user/repos?per_page=100&sort=updated"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github.v3+json"
    }

    try:
        response = await GitHubOAuthService._request_with_retry("GET", url, headers=headers)
        repos = response.json()
        
        results = []
        for r in repos:
            if "id" not in r:
                continue
            
            # Safe datetime parsing
            updated_at_str = r.get("updated_at")
            if updated_at_str:
                try:
                    updated_at = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
                except ValueError:
                    updated_at = datetime.utcnow()
            else:
                updated_at = datetime.utcnow()

            results.append({
                "id": r["id"],
                "name": r["name"],
                "full_name": r["full_name"],
                "private": r["private"],
                "html_url": r["html_url"],
                "description": r.get("description"),
                "default_branch": r.get("default_branch", "main"),
                "language": r.get("language"),
                "stargazers_count": r.get("stargazers_count", 0),
                "updated_at": updated_at
            })
        return results
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error listing GitHub repositories: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve repositories from GitHub: {str(e)}")


@router.get("/rate_limit")
async def get_github_rate_limit(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Fetches the current GitHub API rate limit status for the connected user.
    """
    github_identity = db.query(models.GithubIdentity).filter(
        models.GithubIdentity.user_id == current_user.id
    ).first()
    
    if not github_identity:
        raise HTTPException(status_code=400, detail="GitHub account not connected.")

    access_token = auth.decrypt_token(github_identity.access_token_encrypted)
    if not access_token:
        raise HTTPException(status_code=401, detail="GitHub access token could not be decrypted or is missing.")

    url = "https://api.github.com/rate_limit"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github.v3+json"
    }

    try:
        response = await GitHubOAuthService._request_with_retry("GET", url, headers=headers)
        return response.json()
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error fetching GitHub rate limit: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve rate limit from GitHub: {str(e)}")

