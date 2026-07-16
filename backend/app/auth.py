import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import base64
import hashlib
from cryptography.fernet import Fernet
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from . import database, models, schemas

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "CRITICAL: SECRET_KEY environment variable is not set. "
        "Set a strong, random secret before starting the server."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days for local dev

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

# Initialize Fernet for token encryption
def get_fernet_key(secret: str) -> bytes:
    # Hash the secret to ensure it's exactly 32 bytes, then base64 encode for Fernet
    digest = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(digest)

fernet = Fernet(get_fernet_key(SECRET_KEY))

def encrypt_token(token: str) -> str:
    if not token:
        return token
    return fernet.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str:
    if not encrypted_token:
        return encrypted_token
    return fernet.decrypt(encrypted_token.encode()).decode()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7) # Refresh token valid for 7 days
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_refresh_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None

def get_user(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    token_query: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    actual_token = token or token_query
    if not actual_token:
        # Check if auth header is missing or Bearer isn't passed
        raise credentials_exception
    try:
        payload = jwt.decode(actual_token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = get_user(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

from fastapi import Request

async def get_current_user_optional(
    request: Request,
    db: Session = Depends(database.get_db)
) -> Optional[models.User]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return get_user(db, email=email)
    except JWTError:
        return None

