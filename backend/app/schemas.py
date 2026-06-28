from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class RepositoryBase(BaseModel):
    name: str
    source_url: Optional[str] = None
    local_path: Optional[str] = None

class RepositoryCreate(RepositoryBase):
    pass

class RepositoryResponse(RepositoryBase):
    id: str
    user_id: str
    status: str
    local_path: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class ReportResponse(BaseModel):
    id: str
    repository_id: str
    report_type: str
    data: Dict[str, Any]
    score: Optional[float]
    created_at: datetime
    class Config:
        from_attributes = True
