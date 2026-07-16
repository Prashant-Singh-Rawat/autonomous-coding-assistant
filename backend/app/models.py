import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, JSON, Boolean, BigInteger, Integer
from sqlalchemy.orm import relationship
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)
    is_email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    repositories = relationship("Repository", back_populates="owner")
    github_identity = relationship("GithubIdentity", back_populates="user", uselist=False, cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

class GithubIdentity(Base):
    __tablename__ = "github_identities"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    github_user_id = Column(BigInteger, unique=True)
    github_username = Column(String)
    access_token_encrypted = Column(String)
    refresh_token_encrypted = Column(String, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    granted_scopes = Column(String) # Comma separated or JSON string
    connected_at = Column(DateTime, default=datetime.utcnow)
    last_synced_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="github_identity")

class OAuthState(Base):
    __tablename__ = "oauth_states"
    id = Column(String, primary_key=True, default=generate_uuid)
    state_token = Column(String, unique=True, index=True)
    user_id = Column(String, nullable=True) # None if login flow
    purpose = Column(String) # login, connect_repo_access
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    token_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    revoked_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="refresh_tokens")

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(String, primary_key=True, default=generate_uuid)
    github_org_id = Column(BigInteger, unique=True)
    name = Column(String)
    avatar_url = Column(String, nullable=True)
    cached_at = Column(DateTime, default=datetime.utcnow)

    repositories = relationship("Repository", back_populates="organization")

class Repository(Base):
    __tablename__ = "repositories"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    organization_id = Column(String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    name = Column(String, index=True)
    source_url = Column(String, nullable=True)
    local_path = Column(String, nullable=True)
    status = Column(String, default="selected") # selected/cloning/scanning/embedding/ready/failed
    current_task = Column(String, nullable=True)
    indexing_status = Column(JSON, nullable=True)
    default_branch = Column(String, nullable=True)
    selected_branch = Column(String, nullable=True)
    visibility = Column(String, nullable=True) # public or private
    last_indexed_commit_sha = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="repositories")
    files = relationship("RepositoryFile", back_populates="repository", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="repository", cascade="all, delete-orphan")
    organization = relationship("Organization", back_populates="repositories")
    events = relationship("RepositoryEvent", back_populates="repository", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="repository", cascade="all, delete-orphan")
    vector_index = relationship("VectorIndex", back_populates="repository", uselist=False, cascade="all, delete-orphan")

class RepositoryEvent(Base):
    __tablename__ = "repository_events"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"))
    stage = Column(String) # cloning, scanning, embedding
    event_type = Column(String) # started, progress, completed, failed
    detail = Column(JSON, nullable=True)
    progress_current = Column(Float, nullable=True)
    progress_total = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    repository = relationship("Repository", back_populates="events")

class VectorIndex(Base):
    __tablename__ = "vector_indexes"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"), unique=True)
    storage_path = Column(String)
    signature_hash = Column(String)
    embedding_model = Column(String)
    file_count = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_verified_at = Column(DateTime, default=datetime.utcnow)

    repository = relationship("Repository", back_populates="vector_index")

class Job(Base):
    __tablename__ = "jobs"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"))
    job_type = Column(String) # clone, scan, embed
    celery_task_id = Column(String, nullable=True)
    status = Column(String, default="pending") # pending, running, completed, failed
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    repository = relationship("Repository", back_populates="jobs")

class UserSettings(Base):
    __tablename__ = "user_settings"
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    theme = Column(String, default="system") # light, dark, system
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class RepositoryFile(Base):
    __tablename__ = "repository_files"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id"))
    file_path = Column(String, index=True)
    content = Column(String)
    language = Column(String, nullable=True)
    
    repository = relationship("Repository", back_populates="files")

class Report(Base):
    __tablename__ = "reports"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id"))
    report_type = Column(String, index=True) # e.g. security, architecture
    data = Column(JSON)
    score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    repository = relationship("Repository", back_populates="reports")

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"))
    role = Column(String) # user, assistant, system
    content = Column(String)
    agent_type = Column(String, nullable=True)
    source_citations = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")

class ProjectMemory(Base):
    __tablename__ = "project_memories"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"))
    scope = Column(String, nullable=True) # pointer to path
    memory_type = Column(String) # fact, finding_summary, preference
    content = Column(String)
    confidence = Column(Float, default=1.0)
    source = Column(String) # user_confirmed, agent_derived
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

class Finding(Base):
    __tablename__ = "findings"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"))
    finding_type = Column(String) # security, smell, duplicate, tech_debt, performance
    severity = Column(String) # critical, high, medium, low
    file_path = Column(String)
    line_start = Column(Integer, nullable=True)
    line_end = Column(Integer, nullable=True)
    title = Column(String)
    description = Column(String)
    status = Column(String, default="open") # open, acknowledged, resolved
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

class Diagram(Base):
    __tablename__ = "diagrams"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"))
    diagram_type = Column(String) # dependency_graph, uml, flowchart, architecture
    scope_path = Column(String, nullable=True)
    graph_data = Column(JSON)
    generated_from_commit_sha = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DependencyEdge(Base):
    __tablename__ = "dependency_edges"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"))
    source_file = Column(String)
    target_file = Column(String)
    edge_type = Column(String) # import, call, inherits
    created_at = Column(DateTime, default=datetime.utcnow)

class PullRequest(Base):
    __tablename__ = "pull_requests"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"))
    github_pr_number = Column(Integer)
    title = Column(String)
    author = Column(String)
    state = Column(String) # open, closed, merged
    base_branch = Column(String)
    head_branch = Column(String)
    mergeable_state = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_synced_at = Column(DateTime, default=datetime.utcnow)

    reviews = relationship("Review", back_populates="pull_request", cascade="all, delete-orphan")

class Issue(Base):
    __tablename__ = "issues"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"))
    github_issue_number = Column(Integer)
    title = Column(String)
    author = Column(String)
    state = Column(String) # open, closed
    labels = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_synced_at = Column(DateTime, default=datetime.utcnow)

class Commit(Base):
    __tablename__ = "commits"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"))
    sha = Column(String, index=True)
    author = Column(String)
    message = Column(String)
    branch = Column(String)
    ai_summary = Column(String, nullable=True)
    committed_at = Column(DateTime)

class Review(Base):
    __tablename__ = "reviews"
    id = Column(String, primary_key=True, default=generate_uuid)
    pull_request_id = Column(String, ForeignKey("pull_requests.id", ondelete="CASCADE"))
    source = Column(String) # ai_draft, ai_posted, human
    verdict = Column(String) # approve, request_changes, comment
    summary = Column(String)
    inline_comments = Column(JSON, nullable=True)
    status = Column(String, default="draft") # draft, submitted
    created_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)

    pull_request = relationship("PullRequest", back_populates="reviews")

class GithubEvent(Base):
    __tablename__ = "github_events"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"))
    event_type = Column(String)
    payload_hash = Column(String)
    received_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    processing_status = Column(String, default="pending") # pending, success, failed

class AutomationRule(Base):
    __tablename__ = "automation_rules"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"))
    trigger_event = Column(String)
    condition = Column(JSON)
    action_type = Column(String)
    is_enabled = Column(Boolean, default=True)
    auto_apply = Column(Boolean, default=False)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AgentRun(Base):
    __tablename__ = "agent_runs"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"))
    agent_type = Column(String)
    triggered_by = Column(String, nullable=True)
    status = Column(String) # running, success, failed
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    result_summary = Column(String, nullable=True)
    error_message = Column(String, nullable=True)

class Webhook(Base):
    __tablename__ = "webhooks"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"))
    github_webhook_id = Column(BigInteger, nullable=True)
    secret_ref = Column(String)
    status = Column(String) # active, failing
    last_delivery_at = Column(DateTime, nullable=True)
    last_delivery_status = Column(String, nullable=True)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"))
    type = Column(String)
    title = Column(String)
    body = Column(String)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class N8NIntegration(Base):
    __tablename__ = "n8n_integrations"
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"))
    outbound_webhook_url = Column(String)
    inbound_endpoint_token = Column(String)
    enabled_events = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class EnterpriseOrganization(Base):
    __tablename__ = "enterprise_organizations"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class OrgMember(Base):
    __tablename__ = "org_members"
    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("enterprise_organizations.id", ondelete="CASCADE"))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    role = Column(String) # owner, admin, member, billing_only, read_only
    created_at = Column(DateTime, default=datetime.utcnow)

class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("enterprise_organizations.id", ondelete="CASCADE"))
    plan = Column(String, default="free") # free, pro, enterprise
    status = Column(String, default="active")
    current_period_end = Column(DateTime, nullable=True)
    stripe_customer_id = Column(String, nullable=True)

class DeploymentProvider(Base):
    __tablename__ = "deployment_providers"
    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("enterprise_organizations.id", ondelete="CASCADE"))
    provider_type = Column(String) # vercel, render, aws, docker
    credentials = Column(String) # encrypted JSON
    created_at = Column(DateTime, default=datetime.utcnow)

class Deployment(Base):
    __tablename__ = "deployments"
    id = Column(String, primary_key=True, default=generate_uuid)
    provider_id = Column(String, ForeignKey("deployment_providers.id", ondelete="CASCADE"))
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"))
    environment = Column(String) # staging, production
    status = Column(String) # building, succeeded, failed
    commit_sha = Column(String, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class SlackIntegration(Base):
    __tablename__ = "slack_integrations"
    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("enterprise_organizations.id", ondelete="CASCADE"))
    webhook_url = Column(String)
    channel = Column(String, nullable=True)
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("enterprise_organizations.id", ondelete="CASCADE"))
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, index=True)       # e.g. "team:change_role"
    detail = Column(String, nullable=True)    # JSON-serialised extra context
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class DiagnosticRecord(Base):
    __tablename__ = "diagnostic_records"
    id = Column(String, primary_key=True, default=generate_uuid)
    symptom = Column(String, nullable=False)
    subsystem = Column(String, nullable=False) # e.g. "Core API", "Sync", "Database"
    severity = Column(String, default="warning") # warning, critical
    correlation_id = Column(String, nullable=True)
    diagnosis = Column(String, nullable=True)
    proposed_action = Column(String, nullable=True)
    pull_request_ref = Column(String, nullable=True)
    status = Column(String, default="detected") # detected, diagnosed, proposed, resolved
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)






