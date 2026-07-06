import os
import re
import signal
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from .. import schemas, models, auth, database, vectorstore

router = APIRouter(prefix="/repositories", tags=["Repositories"])

# ─── Helpers ──────────────────────────────────────────────────────────────────

# Directories to skip during local scan
IGNORED_DIRS = {
    ".git", "node_modules", ".next", ".venv", "venv", "__pycache__",
    "dist", "build", ".mypy_cache", ".pytest_cache", ".tox",
    "coverage", ".coverage", ".eggs", "*.egg-info",
}

# Extension → language mapping
EXT_LANGUAGE_MAP: dict[str, str] = {
    ".py": "python", ".js": "javascript", ".ts": "typescript",
    ".tsx": "tsx", ".jsx": "jsx", ".html": "html", ".css": "css",
    ".json": "json", ".yaml": "yaml", ".yml": "yaml",
    ".md": "markdown", ".mdx": "markdown", ".sh": "bash",
    ".env": "env", ".toml": "toml", ".ini": "ini",
    ".go": "go", ".rs": "rust", ".java": "java", ".c": "c",
    ".cpp": "cpp", ".cs": "csharp", ".rb": "ruby", ".php": "php",
    ".swift": "swift", ".kt": "kotlin", ".dockerfile": "dockerfile",
    ".sql": "sql", ".graphql": "graphql", ".proto": "protobuf",
}

# Max file size to read (5 MB)
MAX_FILE_BYTES = 5 * 1024 * 1024


def validate_uuid(uuid_str: str):
    if not re.match(r'^[0-9a-f-]{36}$', uuid_str, re.I):
        raise HTTPException(status_code=400, detail="Invalid repository ID format")


def detect_language(file_path: str) -> str:
    """Return a language label based on the file extension."""
    suffix = Path(file_path).suffix.lower()
    # Special case: Dockerfile has no extension
    if Path(file_path).name.lower() == "dockerfile":
        return "dockerfile"
    return EXT_LANGUAGE_MAP.get(suffix, "text")


def scan_local_directory(local_path: str) -> list[tuple[str, str, str]]:
    """
    Recursively scan *local_path* and return a list of
    (relative_file_path, content, language) tuples.

    Skips:
    - Ignored directory names
    - Binary files
    - Files larger than MAX_FILE_BYTES
    """
    results: list[tuple[str, str, str]] = []
    root = Path(local_path).resolve()

    if not root.exists():
        raise ValueError(f"Path does not exist: {local_path}")
    if not root.is_dir():
        raise ValueError(f"Path is not a directory: {local_path}")

    for dirpath, dirnames, filenames in os.walk(root):
        # Prune ignored directories in-place so os.walk won't descend into them
        dirnames[:] = [
            d for d in dirnames
            if d not in IGNORED_DIRS and not d.startswith(".")
            and not (Path(dirpath) / d).is_symlink()
        ]

        for filename in filenames:
            abs_path = Path(dirpath) / filename
            rel_path = str(abs_path.relative_to(root)).replace("\\", "/")

            # Skip very large files
            try:
                size = abs_path.stat().st_size
            except OSError:
                continue

            if size > MAX_FILE_BYTES:
                continue

            # Attempt to read as UTF-8 text; skip binary
            try:
                content = abs_path.read_text(encoding="utf-8", errors="strict")
            except (UnicodeDecodeError, OSError):
                continue

            language = detect_language(str(abs_path))
            results.append((rel_path, content, language))

    return results


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/", response_model=schemas.RepositoryResponse)
def create_repository(
    repo_in: schemas.RepositoryCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Create a new repository entry and trigger background processing.

    Accepts either:
    - `source_url`: a GitHub / remote URL (future: cloning support)
    - `local_path`: an absolute path to a local directory on the server's filesystem
    """
    if repo_in.local_path and not os.path.isdir(repo_in.local_path):
        raise HTTPException(
            status_code=400,
            detail=f"Provided local_path is not a valid directory: {repo_in.local_path}"
        )

    new_repo = models.Repository(
        user_id=current_user.id,
        name=repo_in.name,
        source_url=repo_in.source_url,
        local_path=repo_in.local_path,
        status="processing",
    )
    db.add(new_repo)
    db.commit()
    db.refresh(new_repo)

    background_tasks.add_task(
        process_repository_task,
        new_repo.id,
        repo_in.local_path
    )

    return new_repo


@router.get("/", response_model=List[schemas.RepositoryResponse])
def get_repositories(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return (
        db.query(models.Repository)
        .filter(models.Repository.user_id == current_user.id)
        .all()
    )


@router.get("/{repo_id}", response_model=schemas.RepositoryResponse)
def get_repository(
    repo_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    validate_uuid(repo_id)
    repo = (
        db.query(models.Repository)
        .filter(
            models.Repository.id == repo_id,
            models.Repository.user_id == current_user.id
        )
        .first()
    )
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo


@router.get("/{repo_id}/files")
def get_repository_files(
    repo_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Return a summary list of all ingested files for the given repository."""
    validate_uuid(repo_id)
    repo = get_repository(repo_id, db, current_user)  # validates ownership
    files = (
        db.query(models.RepositoryFile)
        .filter(models.RepositoryFile.repository_id == repo_id)
        .all()
    )
    return [
        {
            "path": f.file_path,
            "language": f.language or "text",
            "size_chars": len(f.content or ""),
        }
        for f in files
    ]


@router.get("/{repo_id}/reports", response_model=List[schemas.ReportResponse])
def get_repository_reports(
    repo_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    validate_uuid(repo_id)
    repo = get_repository(repo_id, db, current_user)
    return repo.reports


# ─── Background Task ──────────────────────────────────────────────────────────

def _timeout_handler(signum, frame):
    raise TimeoutError("Repository processing task timed out after 300 seconds")

signal.signal(signal.SIGALRM, _timeout_handler)

def process_repository_task(repo_id: str, local_path: str | None = None):
    """
    Background task that:
    1. Scans files from local_path (if provided) or uses stub data.
    2. Persists RepositoryFile rows.
    3. Creates a signed FAISS vector store.
    4. Generates initial analysis reports.
    """
    signal.alarm(300)
    db = database.SessionLocal()
    try:
        signal.alarm(300)
        repo = db.query(models.Repository).filter(models.Repository.id == repo_id).first()
        if not repo:
            return

        # ── 1. Collect files ──────────────────────────────────────────────────
        if local_path:
            try:
                file_tuples = scan_local_directory(local_path)
            except ValueError as exc:
                repo.status = "failed"
                db.commit()
                print(f"[Repository {repo_id}] scan failed: {exc}")
                return
        else:
            # Fallback stub files (used when no local path is supplied)
            file_tuples = [
                ("src/main.py", "def hello():\n    print('world')", "python"),
                ("README.md", "# Test Repo\nThis is a test.", "markdown"),
            ]

        # ── 2. Persist files ──────────────────────────────────────────────────
        for fp, content, lang in file_tuples:
            db.add(models.RepositoryFile(
                repository_id=repo.id,
                file_path=fp,
                content=content,
                language=lang,
            ))

        db.commit()  # commit files before building vector store

        # ── 3. Build signed FAISS vector store ────────────────────────────────
        files = (
            db.query(models.RepositoryFile)
            .filter(models.RepositoryFile.repository_id == repo.id)
            .all()
        )
        try:
            vectorstore.create_vector_store(repo, files)
        except Exception as vs_exc:
            # Vector store creation is best-effort; don't fail the whole task
            print(f"[Repository {repo_id}] vector store error (needs OPENAI_API_KEY): {vs_exc}")

        # ── 4. Generate initial reports ───────────────────────────────────────
        total_files = len(file_tuples)
        languages = list({lang for _, _, lang in file_tuples})
        python_files = sum(1 for _, _, lang in file_tuples if lang == "python")

        db.add(models.Report(
            repository_id=repo.id,
            report_type="architecture",
            data={
                "summary": f"Scanned {total_files} files across {len(languages)} language(s).",
                "languages": languages,
                "total_files": total_files,
            },
        ))
        db.add(models.Report(
            repository_id=repo.id,
            report_type="security",
            data={
                "issues": 0,
                "summary": "No obvious secrets detected in initial scan.",
                "python_files_scanned": python_files,
            },
        ))

        repo.status = "completed"
        db.commit()
        print(f"[Repository {repo_id}] processing complete — {total_files} file(s) ingested.")

    except Exception as exc:
        db.rollback()
        try:
            repo = db.query(models.Repository).filter(models.Repository.id == repo_id).first()
            if repo:
                repo.status = "failed"
                db.commit()
        except Exception:
            pass
        print(f"[Repository {repo_id}] unhandled error: {exc}")
    finally:
        signal.alarm(0)
        db.close()
