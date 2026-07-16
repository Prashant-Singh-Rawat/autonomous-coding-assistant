import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from .. import schemas, models, auth, database
from ..services.github_oauth_service import GitHubOAuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = auth.get_user(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=409, detail="An account already exists — log in instead?")
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login_for_access_token(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = auth.get_user(db, email=form_data.username)
    if not user or not user.hashed_password or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    
    refresh_token = auth.create_refresh_token(data={"sub": user.email})
    
    # Store refresh token in db
    db_token = models.RefreshToken(user_id=user.id, token_hash=auth.get_password_hash(refresh_token))
    db.add(db_token)
    db.commit()
    
    # Set httpOnly cookie for refresh token
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="strict")
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/refresh", response_model=schemas.Token)
def refresh_token(response: Response, refresh_token: str, db: Session = Depends(database.get_db)):
    payload = auth.verify_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    email = payload.get("sub")
    user = auth.get_user(db, email=email)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    # Optional: Check if token exists and is not revoked in DB
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/logout")
def logout(response: Response, refresh_token: str, db: Session = Depends(database.get_db)):
    response.delete_cookie("refresh_token")
    return {"detail": "Logged out"}

@router.get("/me")
def get_me(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Return the authenticated user's profile including GitHub identity."""
    github_identity = db.query(models.GithubIdentity).filter(
        models.GithubIdentity.user_id == current_user.id
    ).first()
    return {
        "id": current_user.id,
        "email": current_user.email,
        "github_connected": github_identity is not None,
        "github_username": github_identity.github_username if github_identity else None,
        "github_avatar_url": f"https://avatars.githubusercontent.com/{github_identity.github_username}" if github_identity else None,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }

@router.get("/github/login")
def github_login(db: Session = Depends(database.get_db)):
    state = secrets.token_urlsafe(32)
    oauth_state = models.OAuthState(state_token=state, purpose="login", expires_at=datetime.utcnow() + timedelta(minutes=10))
    db.add(oauth_state)
    db.commit()
    return RedirectResponse(GitHubOAuthService.get_authorize_url(state, "login"))

@router.get("/github/connect")
async def github_connect(
    token: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """
    Initiates GitHub OAuth for connecting repo access.
    Accepts the JWT as a query parameter (?token=...) because this endpoint
    is triggered by a browser redirect, which cannot carry Authorization headers.
    """
    # Resolve user from query token or Authorization header
    current_user = None
    if token:
        try:
            current_user = await auth.get_current_user(token=token, db=db)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid or expired token. Please log in again.")
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required. Please log in first.")
    
    state = secrets.token_urlsafe(32)
    oauth_state = models.OAuthState(state_token=state, user_id=current_user.id, purpose="connect_repo_access", expires_at=datetime.utcnow() + timedelta(minutes=10))
    db.add(oauth_state)
    db.commit()
    return RedirectResponse(GitHubOAuthService.get_authorize_url(state, "connect_repo_access"))

@router.get("/github/callback")
async def github_callback(state: str, code: str, response: Response, db: Session = Depends(database.get_db)):
    oauth_state = db.query(models.OAuthState).filter(models.OAuthState.state_token == state).first()
    if not oauth_state or oauth_state.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired state token")
        
    db.delete(oauth_state)
    db.commit()
    
    try:
        token_data = await GitHubOAuthService.exchange_code_for_token(code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to retrieve access token")
        
    user_profile = await GitHubOAuthService.get_user_profile(access_token)
    github_user_id = user_profile.get("id")
    github_username = user_profile.get("login")
    
    if oauth_state.purpose == "login":
        # Handle GitHub Login
        github_identity = db.query(models.GithubIdentity).filter(models.GithubIdentity.github_user_id == github_user_id).first()
        
        if github_identity:
            user = github_identity.user
        else:
            emails = await GitHubOAuthService.get_user_emails(access_token)
            primary_email = next((e["email"] for e in emails if e.get("primary")), None)
            
            if not primary_email:
                raise HTTPException(status_code=400, detail="No primary email found on GitHub")
                
            user = auth.get_user(db, email=primary_email)
            if not user:
                user = models.User(email=primary_email, is_email_verified=True)
                db.add(user)
                db.commit()
                db.refresh(user)
                
            github_identity = models.GithubIdentity(
                user_id=user.id,
                github_user_id=github_user_id,
                github_username=github_username,
                access_token_encrypted=auth.encrypt_token(access_token),
                granted_scopes="read:user,user:email"
            )
            db.add(github_identity)
            db.commit()
            
        # Log the user in
        access_token_jwt = auth.create_access_token(data={"sub": user.email})
        refresh_token = auth.create_refresh_token(data={"sub": user.email})
        response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="strict")
        
        # Redirect to frontend dashboard or specific onboarding step
        return RedirectResponse(f"http://localhost:3000/api/auth/callback/success?access_token={access_token_jwt}")
        
    elif oauth_state.purpose == "connect_repo_access":
        # Connect repo access to an already authenticated user
        user = db.query(models.User).filter(models.User.id == oauth_state.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        github_identity = db.query(models.GithubIdentity).filter(models.GithubIdentity.user_id == user.id).first()
        
        if github_identity:
            github_identity.access_token_encrypted = auth.encrypt_token(access_token)
            github_identity.github_user_id = github_user_id
            github_identity.github_username = github_username
            github_identity.granted_scopes = "read:user,user:email,repo,read:org"
            github_identity.connected_at = datetime.utcnow()
        else:
            github_identity = models.GithubIdentity(
                user_id=user.id,
                github_user_id=github_user_id,
                github_username=github_username,
                access_token_encrypted=auth.encrypt_token(access_token),
                granted_scopes="read:user,user:email,repo,read:org"
            )
            db.add(github_identity)
        db.commit()
        return RedirectResponse("http://localhost:3000/onboarding/github?success=true")
