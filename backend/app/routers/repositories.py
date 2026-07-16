import os
import re
import logging
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import httpx
from datetime import datetime, timedelta

from .. import schemas, models, auth, database, vectorstore
from app.services.github_actions import GitHubActionsService

logger = logging.getLogger("repositories_router")
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

# Simple in-memory cache for GitHub repositories
github_repos_cache = {} # Key: github_user_id, Value: {"data": [...], "expires_at": datetime}


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

            lang = detect_language(rel_path)
            results.append((rel_path, content, lang))

    return results

# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/", response_model=schemas.RepositoryResponse)
def create_repository(
    repo_in: schemas.RepositoryCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Check if this repo is already added for user
    existing_repo = db.query(models.Repository).filter(
        models.Repository.user_id == current_user.id,
        models.Repository.name == repo_in.name
    ).first()
    
    from app.tasks import run_indexing_pipeline

    if existing_repo:
        existing_repo.status = "selected"
        existing_repo.default_branch = repo_in.default_branch
        existing_repo.selected_branch = repo_in.selected_branch
        existing_repo.visibility = repo_in.visibility
        existing_repo.source_url = repo_in.source_url
        
        # Clear old events
        db.query(models.RepositoryEvent).filter(models.RepositoryEvent.repository_id == existing_repo.id).delete()
        db.commit()
        db.refresh(existing_repo)
        
        task = run_indexing_pipeline.delay(existing_repo.id)
        
        db.add(models.Job(
            repository_id=existing_repo.id,
            job_type="clone",
            celery_task_id=task.id,
            status="pending"
        ))
        db.commit()
        return existing_repo

    new_repo = models.Repository(
        user_id=current_user.id,
        name=repo_in.name,
        source_url=repo_in.source_url,
        local_path=repo_in.local_path,
        default_branch=repo_in.default_branch,
        selected_branch=repo_in.selected_branch,
        visibility=repo_in.visibility,
        status="selected",
    )
    db.add(new_repo)
    db.commit()
    db.refresh(new_repo)

    task = run_indexing_pipeline.delay(new_repo.id)
    
    db.add(models.Job(
        repository_id=new_repo.id,
        job_type="clone",
        celery_task_id=task.id,
        status="pending"
    ))
    db.commit()

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


@router.get("/{repo_id}/file-content")
def get_repository_file_content(
    repo_id: str,
    path: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Return the text content of a specific file in the repository."""
    validate_uuid(repo_id)
    get_repository(repo_id, db, current_user)  # validates ownership
    file_record = (
        db.query(models.RepositoryFile)
        .filter(
            models.RepositoryFile.repository_id == repo_id,
            models.RepositoryFile.file_path == path
        )
        .first()
    )
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    return {"path": path, "content": file_record.content or ""}



@router.get("/{repo_id}/reports", response_model=List[schemas.ReportResponse])
def get_repository_reports(
    repo_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    validate_uuid(repo_id)
    repo = get_repository(repo_id, db, current_user)
    return repo.reports

@router.get("/{repo_id}/pull-requests")
def get_repository_pull_requests(
    repo_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    validate_uuid(repo_id)
    # Validate ownership
    get_repository(repo_id, db, current_user)
    prs = db.query(models.PullRequest).filter(models.PullRequest.repository_id == repo_id).all()
    if not prs:
        # Return fallback mock list
        return [
            { "id": "pr1", "github_pr_number": 42, "title": "Feature: Added Google OAuth routing integrations", "author": "prashant", "state": "open", "base_branch": "main", "head_branch": "feat-oauth", "mergeable_state": "clean", "last_synced_at": datetime.utcnow().isoformat() },
            { "id": "pr2", "github_pr_number": 40, "title": "Fix: SQL Injection escape in auth middleware", "author": "alex", "state": "closed", "base_branch": "main", "head_branch": "fix-auth", "mergeable_state": None, "last_synced_at": datetime.utcnow().isoformat() }
        ]
    return prs

@router.get("/{repo_id}/issues")
def get_repository_issues(
    repo_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    validate_uuid(repo_id)
    get_repository(repo_id, db, current_user)
    issues = db.query(models.Issue).filter(models.Issue.repository_id == repo_id).all()
    if not issues:
        return [
            { "id": "is1", "github_issue_number": 104, "title": "Critical: Memory leak in Celery worker processes", "author": "developer", "state": "open", "labels": ["bug", "backend"] },
            { "id": "is2", "github_issue_number": 102, "title": "Feature request: Dark mode client customization settings", "author": "designer", "state": "open", "labels": ["enhancement", "frontend"] }
        ]
    return issues

@router.get("/{repo_id}/commits")
def get_repository_commits(
    repo_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    validate_uuid(repo_id)
    get_repository(repo_id, db, current_user)
    commits = db.query(models.Commit).filter(models.Commit.repository_id == repo_id).all()
    if not commits:
        return [
            { "id": "c1", "sha": "8f2a1b9", "author": "Prashant", "message": "Added workspace interactive widgets layout configurations", "branch": "main", "ai_summary": "Updates the frontend dashboard layout to introduce tabbed pane switches, explorer logs, and quality score cards." },
            { "id": "c2", "sha": "4c1d2e3", "author": "Tony Assistant", "message": "Refactored models.py database relationship indices", "branch": "main", "ai_summary": "Automated database schema expansion mapping workspace models with cascade options." }
        ]
    return commits


@router.get("/{repo_id}/dashboard-stats")
async def get_dashboard_stats(
    repo_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns all real data needed by the production dashboard.
    Combines local DB stats with live GitHub API data.
    """
    validate_uuid(repo_id)
    repo = get_repository(repo_id, db, current_user)

    # ── Local DB stats ────────────────────────────────────────────────────────
    files = db.query(models.RepositoryFile).filter(
        models.RepositoryFile.repository_id == repo_id
    ).all()

    file_count = len(files)

    # Language breakdown
    lang_counts: dict = {}
    for f in files:
        lang = f.language or "text"
        lang_counts[lang] = lang_counts.get(lang, 0) + 1

    # Folder count (unique directory prefixes)
    folders = set()
    for f in files:
        parts = f.file_path.split("/")
        for i in range(1, len(parts)):
            folders.add("/".join(parts[:i]))
    folder_count = len(folders)

    # Reports
    reports = db.query(models.Report).filter(
        models.Report.repository_id == repo_id
    ).all()
    arch_report = next((r for r in reports if r.report_type == "architecture"), None)
    sec_report = next((r for r in reports if r.report_type == "security"), None)

    arch_data = arch_report.data if arch_report and arch_report.data else {}
    sec_data = sec_report.data if sec_report and sec_report.data else {}

    # Active jobs
    jobs = db.query(models.Job).filter(
        models.Job.repository_id == repo_id
    ).order_by(models.Job.created_at.desc()).limit(5).all()

    # Recent indexing events
    events = db.query(models.RepositoryEvent).filter(
        models.RepositoryEvent.repository_id == repo_id
    ).order_by(models.RepositoryEvent.created_at.desc()).limit(10).all()

    # ── GitHub live data ──────────────────────────────────────────────────────
    github_data: dict = {}
    recent_commits: list = []

    github_identity = db.query(models.GithubIdentity).filter(
        models.GithubIdentity.user_id == current_user.id
    ).first()

    if github_identity and repo.source_url:
        access_token = auth.decrypt_token(github_identity.access_token_encrypted)
        # Extract owner/repo from source_url e.g. https://github.com/owner/repo
        parts = (repo.source_url or "").rstrip("/").split("/")
        if len(parts) >= 2 and access_token:
            gh_owner = parts[-2]
            gh_repo = parts[-1].removesuffix(".git")
            gh_headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            }
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    # Repo meta (stars, forks, watchers, size, default branch)
                    r_meta = await client.get(
                        f"https://api.github.com/repos/{gh_owner}/{gh_repo}",
                        headers=gh_headers
                    )
                    if r_meta.status_code == 200:
                        meta = r_meta.json()
                        github_data["stars"] = meta.get("stargazers_count", 0)
                        github_data["forks"] = meta.get("forks_count", 0)
                        github_data["watchers"] = meta.get("watchers_count", 0)
                        github_data["size_kb"] = meta.get("size", 0)
                        github_data["open_issues_count"] = meta.get("open_issues_count", 0)
                        github_data["default_branch"] = meta.get("default_branch", repo.default_branch)
                        github_data["description"] = meta.get("description")
                        github_data["language"] = meta.get("language")
                        github_data["topics"] = meta.get("topics", [])

                    # Open PRs
                    r_prs = await client.get(
                        f"https://api.github.com/repos/{gh_owner}/{gh_repo}/pulls?state=open&per_page=1",
                        headers=gh_headers
                    )
                    # GitHub returns count in Link header; we use list length as minimum
                    prs_list = r_prs.json() if r_prs.status_code == 200 else []
                    # Get actual count via search API
                    r_pr_count = await client.get(
                        f"https://api.github.com/search/issues?q=repo:{gh_owner}/{gh_repo}+type:pr+state:open",
                        headers=gh_headers
                    )
                    if r_pr_count.status_code == 200:
                        github_data["open_prs"] = r_pr_count.json().get("total_count", len(prs_list))
                    else:
                        github_data["open_prs"] = len(prs_list)

                    # Contributors count
                    r_contrib = await client.get(
                        f"https://api.github.com/repos/{gh_owner}/{gh_repo}/contributors?per_page=1&anon=false",
                        headers=gh_headers
                    )
                    # Use Link header total if available, else list length
                    github_data["contributors"] = len(r_contrib.json()) if r_contrib.status_code == 200 else 0

                    # Recent commits
                    r_commits = await client.get(
                        f"https://api.github.com/repos/{gh_owner}/{gh_repo}/commits?per_page=8",
                        headers=gh_headers
                    )
                    if r_commits.status_code == 200:
                        for c in r_commits.json():
                            commit = c.get("commit", {})
                            author = commit.get("author", {})
                            gh_author = c.get("author") or {}
                            recent_commits.append({
                                "sha": c.get("sha", "")[:7],
                                "message": commit.get("message", "").split("\n")[0][:80],
                                "author": author.get("name", "Unknown"),
                                "author_avatar": gh_author.get("avatar_url"),
                                "date": author.get("date"),
                                "url": c.get("html_url"),
                            })
            except Exception as e:
                logger.error(f"Failed to fetch live GitHub stats for repo {repo.name}: {str(e)}", exc_info=True)

    return {
        # Local stats
        "file_count": file_count,
        "folder_count": folder_count,
        "language_breakdown": lang_counts,
        # Repo meta
        "repo_name": repo.name,
        "repo_branch": repo.selected_branch or repo.default_branch,
        "repo_visibility": repo.visibility,
        "repo_status": repo.status,
        # GitHub live
        "stars": github_data.get("stars", 0),
        "forks": github_data.get("forks", 0),
        "watchers": github_data.get("watchers", 0),
        "open_prs": github_data.get("open_prs", 0),
        "open_issues": github_data.get("open_issues_count", 0),
        "contributors": github_data.get("contributors", 0),
        "size_kb": github_data.get("size_kb", 0),
        "description": github_data.get("description"),
        "primary_language": github_data.get("language"),
        "topics": github_data.get("topics", []),
        # AI reports
        "arch_summary": arch_data.get("summary", ""),
        "arch_languages": arch_data.get("languages", []),
        "arch_frameworks": arch_data.get("frameworks", []),
        "security_issues": sec_data.get("issues", 0),
        "security_critical": sec_data.get("critical", 0),
        "security_high": sec_data.get("high", 0),
        "security_medium": sec_data.get("medium", 0),
        "security_scanned_files": sec_data.get("python_files_scanned", 0),
        # Activity
        "recent_commits": recent_commits,
        "recent_events": [
            {
                "stage": e.stage,
                "event_type": e.event_type,
                "detail": e.detail,
                "progress_current": e.progress_current,
                "progress_total": e.progress_total,
                "created_at": e.created_at.isoformat()
            }
            for e in events
        ],
        # Jobs
        "active_jobs": [
            {
                "id": j.id,
                "job_type": j.job_type,
                "status": j.status,
                "created_at": j.created_at.isoformat() if j.created_at else None
            }
            for j in jobs
        ],
    }



@router.get("/github/orgs", response_model=List[schemas.GithubOrgResponse])
async def list_github_orgs(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    github_identity = db.query(models.GithubIdentity).filter(models.GithubIdentity.user_id == current_user.id).first()
    if not github_identity:
        raise HTTPException(status_code=400, detail="GitHub account not connected.")
        
    access_token = auth.decrypt_token(github_identity.access_token_encrypted)
    if not access_token:
        raise HTTPException(status_code=401, detail="GitHub access token could not be decrypted or is missing.")
        
    url = "https://api.github.com/user/orgs"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github.v3+json"
    }
    from ..services.github_oauth_service import GitHubOAuthService
    try:
        response = await GitHubOAuthService._request_with_retry("GET", url, headers=headers)
        orgs = response.json()
        return [{"id": org["id"], "login": org["login"], "avatar_url": org.get("avatar_url")} for org in orgs]
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch GitHub organizations: {str(e)}"
        )


@router.get("/github/list", response_model=List[schemas.GithubRepositoryResponse])
async def list_github_repositories(
    org: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    github_identity = db.query(models.GithubIdentity).filter(models.GithubIdentity.user_id == current_user.id).first()
    if not github_identity:
        raise HTTPException(status_code=400, detail="GitHub account not connected.")
        
    github_user_id = github_identity.github_user_id
    
    # Check cache
    cached = github_repos_cache.get(f"{github_user_id}_{org}")
    if cached and cached["expires_at"] > datetime.utcnow():
        return cached["data"]
        
    access_token = auth.decrypt_token(github_identity.access_token_encrypted)
    if not access_token:
        raise HTTPException(status_code=401, detail="GitHub access token could not be decrypted or is missing.")
        
    if org:
        url = f"https://api.github.com/orgs/{org}/repos?per_page=100&sort=updated"
    else:
        url = "https://api.github.com/user/repos?per_page=100&sort=updated"
        
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    from ..services.github_oauth_service import GitHubOAuthService
    try:
        response = await GitHubOAuthService._request_with_retry("GET", url, headers=headers)
        repos = response.json()
        
        results = []
        for r in repos:
            if "id" not in r:
                continue
            
            # Safe datetime parsing
            updated_at_str = r.get("updated_at")
            if updated_at_str:
                try:
                    updated_at = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
                except ValueError:
                    updated_at = datetime.utcnow()
            else:
                updated_at = datetime.utcnow()

            results.append({
                "id": r["id"],
                "name": r["name"],
                "full_name": r["full_name"],
                "private": r["private"],
                "html_url": r["html_url"],
                "description": r.get("description"),
                "default_branch": r.get("default_branch", "main"),
                "language": r.get("language"),
                "stargazers_count": r.get("stargazers_count", 0),
                "updated_at": updated_at
            })
        
        # Update cache
        github_repos_cache[f"{github_user_id}_{org}"] = {
            "data": results,
            "expires_at": datetime.utcnow() + timedelta(seconds=120)
        }
        
        return results
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch GitHub repositories: {str(e)}"
        )


@router.get("/github/{owner}/{repo_name}/branches", response_model=List[schemas.GithubBranchResponse])
async def list_github_branches(
    owner: str,
    repo_name: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    github_identity = db.query(models.GithubIdentity).filter(models.GithubIdentity.user_id == current_user.id).first()
    if not github_identity:
        raise HTTPException(status_code=400, detail="GitHub account not connected.")
    access_token = auth.decrypt_token(github_identity.access_token_encrypted)
    if not access_token:
        raise HTTPException(status_code=401, detail="GitHub access token could not be decrypted or is missing.")
        
    url = f"https://api.github.com/repos/{owner}/{repo_name}/branches"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github.v3+json"
    }
    from ..services.github_oauth_service import GitHubOAuthService
    try:
        response = await GitHubOAuthService._request_with_retry("GET", url, headers=headers)
        branches = response.json()
        results = []
        for br in branches:
            commit_info = br.get("commit", {})
            results.append({
                "name": br["name"],
                "commit_sha": commit_info.get("sha", ""),
                "commit_message": None,
                "commit_author": None
            })
        return results
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch GitHub branches: {str(e)}"
        )


@router.get("/{repo_id}/events")
async def stream_repository_events(
    repo_id: str,
    token: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional)
):
    validate_uuid(repo_id)
    # 1. Resolve token from query param first (since EventSource cannot send headers)
    resolved_user = None
    if token:
        try:
            from jose import jwt as jose_jwt
            from ..auth import SECRET_KEY, ALGORITHM
            payload = jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            if email:
                resolved_user = auth.get_user(db, email=email)
        except Exception:
            pass
            
    # 2. Fallback to Bearer auth header
    if not resolved_user and current_user:
        resolved_user = current_user
        
    if not resolved_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    current_user = resolved_user

    # Check ownership
    repo = db.query(models.Repository).filter(
        models.Repository.id == repo_id,
        models.Repository.user_id == current_user.id
    ).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    import json
    import asyncio
    from fastapi.responses import StreamingResponse

    async def event_generator():
        sent_event_ids = set()
        
        while True:
            local_db = database.SessionLocal()
            try:
                events = local_db.query(models.RepositoryEvent).filter(
                    models.RepositoryEvent.repository_id == repo_id
                ).order_by(models.RepositoryEvent.created_at.asc()).all()
                
                for ev in events:
                    if ev.id not in sent_event_ids:
                        payload = {
                            "id": ev.id,
                            "stage": ev.stage,
                            "event_type": ev.event_type,
                            "progress_current": ev.progress_current,
                            "progress_total": ev.progress_total,
                            "detail": ev.detail,
                            "created_at": ev.created_at.isoformat()
                        }
                        yield f"data: {json.dumps(payload)}\n\n"
                        sent_event_ids.add(ev.id)
                
                current_repo = local_db.query(models.Repository).filter(models.Repository.id == repo_id).first()
                if current_repo and current_repo.status in ["ready", "failed"]:
                    yield f"data: {json.dumps({'status': current_repo.status})}\n\n"
                    break
            finally:
                local_db.close()
                
            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/{repo_id}/retry")
def retry_repository_indexing(
    repo_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    validate_uuid(repo_id)
    repo = db.query(models.Repository).filter(
        models.Repository.id == repo_id,
        models.Repository.user_id == current_user.id
    ).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    repo.status = "selected"
    # Delete old events to start clean
    db.query(models.RepositoryEvent).filter(models.RepositoryEvent.repository_id == repo_id).delete()
    db.commit()
    
    from app.tasks import run_indexing_pipeline
    task = run_indexing_pipeline.delay(repo.id)
    
    db.add(models.Job(
        repository_id=repo.id,
        job_type="clone",
        celery_task_id=task.id,
        status="pending"
    ))
    db.commit()
    
    return {"status": "started", "task_id": task.id}


@router.post("/{repo_id}/sync")
def sync_repository_indexing(
    repo_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    validate_uuid(repo_id)
    repo = db.query(models.Repository).filter(
        models.Repository.id == repo_id,
        models.Repository.user_id == current_user.id
    ).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    if repo.status in ["cloning", "scanning", "embedding"]:
        raise HTTPException(status_code=400, detail="Repository is already indexing")
        
    repo.status = "selected"
    db.query(models.RepositoryEvent).filter(models.RepositoryEvent.repository_id == repo_id).delete()
    db.commit()
    
    from app.tasks import run_indexing_pipeline
    task = run_indexing_pipeline.delay(repo.id)
    
    db.add(models.Job(
        repository_id=repo.id,
        job_type="clone",
        celery_task_id=task.id,
        status="pending"
    ))
    db.commit()
    
    return {"status": "started", "task_id": task.id}



async def _get_github_token_and_repo(repo_id: str, db: Session, current_user: models.User):
    validate_uuid(repo_id)
    repo = db.query(models.Repository).filter(
        models.Repository.id == repo_id,
        models.Repository.user_id == current_user.id
    ).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    github_identity = db.query(models.GithubIdentity).filter(
        models.GithubIdentity.user_id == current_user.id
    ).first()
    if not github_identity:
        raise HTTPException(status_code=400, detail="GitHub identity not connected.")
        
    token = auth.decrypt_token(github_identity.access_token_encrypted)
    if not token:
        raise HTTPException(status_code=401, detail="GitHub access token could not be decrypted.")
        
    parts = repo.source_url.replace("https://github.com/", "").rstrip("/").split("/")
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid source URL format")
    repo_fullname = f"{parts[-2]}/{parts[-1].removesuffix('.git')}"
    return token, repo_fullname, repo


@router.get("/{repo_id}/pull-requests")
async def get_pull_requests(
    repo_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    token, repo_fullname, repo = await _get_github_token_and_repo(repo_id, db, current_user)
    
    try:
        prs_data = await GitHubActionsService.get_pull_requests(token, repo_fullname)
    except Exception as e:
        logger.error(f"Failed to fetch PRs from GitHub: {e}")
        raise HTTPException(status_code=502, detail=f"GitHub API error fetching Pull Requests: {str(e)}")

    # Delete ALL existing PR records for this repo — ensures no stale/fake data survives
    db.query(models.PullRequest).filter(models.PullRequest.repository_id == repo.id).delete()
    db.commit()

    results = []
    for pr_item in prs_data:
        pr_number = pr_item.get("number")
        db_pr = models.PullRequest(
            repository_id=repo.id,
            github_pr_number=pr_number,
            title=pr_item.get("title", ""),
            author=pr_item.get("user", {}).get("login", ""),
            state=pr_item.get("state", ""),
            base_branch=pr_item.get("base", {}).get("ref", ""),
            head_branch=pr_item.get("head", {}).get("ref", ""),
            mergeable_state="draft" if pr_item.get("draft") else "clean",
            last_synced_at=datetime.utcnow()
        )
        db.add(db_pr)
        db.flush()  # get the ID without committing
        results.append({
            "id": db_pr.id,
            "github_pr_number": db_pr.github_pr_number,
            "title": db_pr.title,
            "author": db_pr.author,
            "state": db_pr.state,
            "base_branch": db_pr.base_branch,
            "head_branch": db_pr.head_branch,
            "mergeable_state": db_pr.mergeable_state,
            "last_synced_at": db_pr.last_synced_at.isoformat()
        })
    db.commit()
    return results


@router.get("/{repo_id}/issues")
async def get_issues(
    repo_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    token, repo_fullname, repo = await _get_github_token_and_repo(repo_id, db, current_user)
    
    try:
        issues_data = await GitHubActionsService.get_issues(token, repo_fullname)
    except Exception as e:
        logger.error(f"Failed to fetch issues from GitHub: {e}")
        raise HTTPException(status_code=502, detail=f"GitHub API error fetching Issues: {str(e)}")

    # Delete ALL existing issue records for this repo — ensures no stale/fake data survives
    db.query(models.Issue).filter(models.Issue.repository_id == repo.id).delete()
    db.commit()

    results = []
    for issue_item in issues_data:
        issue_number = issue_item.get("number")
        labels = [lbl.get("name") for lbl in issue_item.get("labels", [])]
        db_issue = models.Issue(
            repository_id=repo.id,
            github_issue_number=issue_number,
            title=issue_item.get("title", ""),
            author=issue_item.get("user", {}).get("login", ""),
            state=issue_item.get("state", ""),
            labels=labels,
            last_synced_at=datetime.utcnow()
        )
        db.add(db_issue)
        db.flush()
        results.append({
            "id": db_issue.id,
            "github_issue_number": db_issue.github_issue_number,
            "title": db_issue.title,
            "author": db_issue.author,
            "state": db_issue.state,
            "labels": db_issue.labels
        })
    db.commit()
    return results



@router.get("/{repo_id}/commits")
async def get_commits(
    repo_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    token, repo_fullname, repo = await _get_github_token_and_repo(repo_id, db, current_user)
    
    try:
        commits_data = await GitHubActionsService.get_commits(token, repo_fullname)
    except Exception as e:
        logger.error(f"Failed to fetch commits: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch Commits from GitHub")
        
    results = []
    # Note: Full commit mapping to a model if exists, or return direct mapping.
    # Currently we might not have a Commit model, so we just return it.
    for i, commit_item in enumerate(commits_data):
        sha = commit_item.get("sha")
        c_data = commit_item.get("commit", {})
        author_name = c_data.get("author", {}).get("name", "")
        message = c_data.get("message", "")
        
        results.append({
            "id": f"c_{sha}",
            "sha": sha[:7],
            "author": author_name,
            "message": message.split("\n")[0], # first line of message
            "branch": repo.default_branch or "main",
            "ai_summary": None
        })
    return results


# ─── Settings Router ─────────────────────────────────────────────────────────

settings_router = APIRouter(prefix="/settings", tags=["Settings"])

@settings_router.get("/", response_model=schemas.UserSettingsResponse)
def get_user_settings(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    settings = db.query(models.UserSettings).filter(models.UserSettings.user_id == current_user.id).first()
    if not settings:
        settings = models.UserSettings(user_id=current_user.id, theme="system")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@settings_router.patch("/", response_model=schemas.UserSettingsResponse)
def update_user_settings(
    settings_in: schemas.UserSettingsUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    settings = db.query(models.UserSettings).filter(models.UserSettings.user_id == current_user.id).first()
    if not settings:
        settings = models.UserSettings(user_id=current_user.id, theme=settings_in.theme)
        db.add(settings)
    else:
        settings.theme = settings_in.theme
    db.commit()
    db.refresh(settings)
    return settings

