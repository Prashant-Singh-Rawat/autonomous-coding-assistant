import re
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from .. import schemas, models, auth, database, ingestion, vectorstore

router = APIRouter(prefix="/repositories", tags=["Repositories"])

def validate_uuid(uuid_str: str):
    if not re.match(r'^[0-9a-f-]{36}$', uuid_str, re.I):
        raise HTTPException(status_code=400, detail="Invalid repository ID format")

@router.post("/", response_model=schemas.RepositoryResponse)
def create_repository(
    repo_in: schemas.RepositoryCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Simulates repository ingestion. In a real app, this might clone from GitHub.
    For now, it creates the DB entry and schedules processing.
    """
    new_repo = models.Repository(
        user_id=current_user.id,
        name=repo_in.name,
        source_url=repo_in.source_url,
        status="processing"
    )
    db.add(new_repo)
    db.commit()
    db.refresh(new_repo)
    
    # Simulate processing in background
    background_tasks.add_task(process_repository_task, new_repo.id)
    
    return new_repo

@router.get("/", response_model=List[schemas.RepositoryResponse])
def get_repositories(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Repository).filter(models.Repository.user_id == current_user.id).all()

@router.get("/{repo_id}", response_model=schemas.RepositoryResponse)
def get_repository(repo_id: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    validate_uuid(repo_id)
    repo = db.query(models.Repository).filter(models.Repository.id == repo_id, models.Repository.user_id == current_user.id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo

@router.get("/{repo_id}/reports", response_model=List[schemas.ReportResponse])
def get_repository_reports(repo_id: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    validate_uuid(repo_id)
    repo = get_repository(repo_id, db, current_user)
    return repo.reports

def process_repository_task(repo_id: str):
    """
    Background task to process files, create vector store, and run initial analysis.
    """
    db = database.SessionLocal()
    try:
        repo = db.query(models.Repository).filter(models.Repository.id == repo_id).first()
        if not repo:
            return
        
        # 1. Simulate finding files
        fake_files = [
            ("src/main.py", "def hello():\n    print('world')", "python"),
            ("README.md", "# Test Repo\nThis is a test.", "markdown")
        ]
        
        for fp, content, lang in fake_files:
            db.add(models.RepositoryFile(repository_id=repo.id, file_path=fp, content=content, language=lang))
        
        # 2. Build vector store
        db.commit() # commit files first
        files = db.query(models.RepositoryFile).filter(models.RepositoryFile.repository_id == repo.id).all()
        # vectorstore.create_vector_store(repo, files) # uncomment when OpenAI key is present
        
        # 3. Generate initial reports via LangGraph agents
        # Simulated for MVP
        db.add(models.Report(repository_id=repo.id, report_type="architecture", data={"summary": "Simple python app."}))
        db.add(models.Report(repository_id=repo.id, report_type="security", data={"issues": 0, "summary": "No obvious secrets."}))
        
        repo.status = "completed"
        db.commit()
    finally:
        db.close()
