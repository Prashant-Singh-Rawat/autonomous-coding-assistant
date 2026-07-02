import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    repositories = relationship("Repository", back_populates="owner")

class Repository(Base):
    __tablename__ = "repositories"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String, index=True)
    source_url = Column(String, nullable=True)
    local_path = Column(String, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="repositories")
    files = relationship("RepositoryFile", back_populates="repository")
    reports = relationship("Report", back_populates="repository")

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
    data = Column(JSONB)
    score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    repository = relationship("Repository", back_populates="reports")
