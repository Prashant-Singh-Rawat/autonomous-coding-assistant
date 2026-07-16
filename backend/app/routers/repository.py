import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import re

from .. import schemas, models, auth, database

router = APIRouter(prefix="/repository", tags=["Repository Status"])
logger = logging.getLogger("repository_router")

def validate_uuid(uuid_str: str):
    if not re.match(r"^[0-9a-f-]{36}$", uuid_str, re.I):
        raise HTTPException(status_code=400, detail="Invalid repository ID format")

@router.get("/index")
def get_repository_index_status(
    repo_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Retrieves the detailed indexing status and vector index metadata for a repository.
    """
    validate_uuid(repo_id)
    
    # Query repository owned by current user
    repo = db.query(models.Repository).filter(
        models.Repository.id == repo_id,
        models.Repository.user_id == current_user.id
    ).first()
    
    if not repo:
        logger.warning(f"Repository {repo_id} not found or unauthorized for user {current_user.email}")
        raise HTTPException(status_code=404, detail="Repository not found")

    # Fetch VectorIndex if available
    v_index = db.query(models.VectorIndex).filter(
        models.VectorIndex.repository_id == repo_id
    ).first()

    # Fetch recent jobs (limit 5)
    jobs = db.query(models.Job).filter(
        models.Job.repository_id == repo_id
    ).order_by(models.Job.created_at.desc()).limit(5).all()

    # Fetch recent repository events (limit 10)
    events = db.query(models.RepositoryEvent).filter(
        models.RepositoryEvent.repository_id == repo_id
    ).order_by(models.RepositoryEvent.created_at.desc()).limit(10).all()

    response_data = {
        "repository": {
            "id": repo.id,
            "name": repo.name,
            "status": repo.status,
            "current_task": repo.current_task,
            "indexing_status": repo.indexing_status,
            "default_branch": repo.default_branch,
            "selected_branch": repo.selected_branch,
            "visibility": repo.visibility,
            "last_indexed_commit_sha": repo.last_indexed_commit_sha,
            "created_at": repo.created_at.isoformat() if repo.created_at else None,
        },
        "vector_index": None,
        "recent_jobs": [
            {
                "id": j.id,
                "job_type": j.job_type,
                "status": j.status,
                "celery_task_id": j.celery_task_id,
                "error_message": j.error_message,
                "started_at": j.started_at.isoformat() if j.started_at else None,
                "completed_at": j.completed_at.isoformat() if j.completed_at else None,
                "created_at": j.created_at.isoformat() if j.created_at else None,
            }
            for j in jobs
        ],
        "recent_events": [
            {
                "id": ev.id,
                "stage": ev.stage,
                "event_type": ev.event_type,
                "progress_current": ev.progress_current,
                "progress_total": ev.progress_total,
                "detail": ev.detail,
                "created_at": ev.created_at.isoformat() if ev.created_at else None,
            }
            for ev in events
        ]
    }

    if v_index:
        response_data["vector_index"] = {
            "id": v_index.id,
            "storage_path": v_index.storage_path,
            "signature_hash": v_index.signature_hash,
            "embedding_model": v_index.embedding_model,
            "file_count": v_index.file_count,
            "last_verified_at": v_index.last_verified_at.isoformat() if v_index.last_verified_at else None,
            "created_at": v_index.created_at.isoformat() if v_index.created_at else None,
        }

    return response_data
