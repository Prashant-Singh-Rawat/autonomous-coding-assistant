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
    refresh_token: Optional[str] = None
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class RepositoryBase(BaseModel):
    name: str
    source_url: Optional[str] = None
    local_path: Optional[str] = None

class RepositoryCreate(RepositoryBase):
    default_branch: Optional[str] = None
    selected_branch: Optional[str] = None
    visibility: Optional[str] = None

class RepositoryResponse(RepositoryBase):
    id: str
    user_id: str
    status: str
    local_path: Optional[str] = None
    default_branch: Optional[str] = None
    selected_branch: Optional[str] = None
    visibility: Optional[str] = None
    last_indexed_commit_sha: Optional[str] = None
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

class GithubStatusResponse(BaseModel):
    connected: bool
    username: Optional[str] = None
    scopes: Optional[List[str]] = None
    connected_at: Optional[datetime] = None

class GithubRepositoryResponse(BaseModel):
    id: int
    name: str
    full_name: str
    private: bool
    html_url: str
    description: Optional[str] = None
    default_branch: str
    language: Optional[str] = None
    stargazers_count: int
    updated_at: datetime

class GithubBranchResponse(BaseModel):
    name: str
    commit_sha: str
    commit_message: Optional[str] = None
    commit_author: Optional[str] = None

class GithubOrgResponse(BaseModel):
    id: int
    login: str
    avatar_url: Optional[str] = None

class RepositoryEventResponse(BaseModel):
    id: str
    repository_id: str
    stage: str
    event_type: str
    progress_current: Optional[float] = None
    progress_total: Optional[float] = None
    detail: Optional[Dict[str, Any]] = None
    created_at: datetime
    class Config:
        from_attributes = True

class UserSettingsResponse(BaseModel):
    user_id: str
    theme: str
    updated_at: datetime
    class Config:
        from_attributes = True

class UserSettingsUpdate(BaseModel):
    theme: str

class DiagnosticRecordResponse(BaseModel):
    id: str
    symptom: str
    subsystem: str
    severity: str
    correlation_id: Optional[str] = None
    diagnosis: Optional[str] = None
    proposed_action: Optional[str] = None
    pull_request_ref: Optional[str] = None
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class SystemHealthResponse(BaseModel):
    frontend: str
    backend: Dict[str, str]
    database: str
    redis: str
    github_connectivity: str
    ai_model_connectivity: str
    automation_queue_depth: int
    worker_pool_status: str
    running_jobs: int
    cpu_percent: float
    memory_percent: float


