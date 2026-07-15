import os
import zipfile
from typing import List, Tuple
from sqlalchemy.orm import Session
from . import models

# In a real scenario, this would use Git cloning or a GitHub App.
# For MVP, we simulate parsing a local folder or a ZIP.

def process_repository(db: Session, user_id: str, repo_name: str, files_data: List[Tuple[str, str, str]]):
    """
    Ingests files into the DB.
    files_data is a list of (file_path, content, language)
    """
    repo = models.Repository(user_id=user_id, name=repo_name, status="processing")
    db.add(repo)
    db.commit()
    db.refresh(repo)

    for file_path, content, language in files_data:
        repo_file = models.RepositoryFile(
            repository_id=repo.id,
            file_path=file_path,
            content=content,
            language=language
        )
        db.add(repo_file)

    repo.status = "completed"
    db.commit()
    return repo

def extract_zip(zip_path: str, extract_dir: str):
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)
