import asyncio
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from .. import models, auth, database
from ..agents.graph import app_graph, GraphState

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    query: str


class ChatResponse(BaseModel):
    reply: str
    citations: List[str] = []


@router.post("/{repo_id}", response_model=ChatResponse)
async def chat_with_repo(
    repo_id: str,
    request: ChatRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # ── Validate UUID format ───────────────────────────────────────────────────
    if not re.match(r"^[0-9a-f-]{36}$", repo_id, re.I):
        raise HTTPException(status_code=400, detail="Invalid repository ID format")

    # ── Verify ownership ───────────────────────────────────────────────────────
    repo = (
        db.query(models.Repository)
        .filter(
            models.Repository.id == repo_id,
            models.Repository.user_id == current_user.id,
        )
        .first()
    )
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    if repo.status == "processing":
        return ChatResponse(
            reply="⏳ This repository is still being processed. Please wait a moment and try again.",
            citations=[],
        )

    # ── Load real file data for agents ─────────────────────────────────────────
    db_files = (
        db.query(models.RepositoryFile)
        .filter(models.RepositoryFile.repository_id == repo_id)
        .all()
    )

    repository_files = [
        {
            "path": f.file_path,
            "language": f.language or "text",
            # Pass a short content preview to avoid huge state; agents use it for pattern matching
            "content": (f.content or "")[:4000],
        }
        for f in db_files
    ]

    # ── Build initial graph state ──────────────────────────────────────────────
    initial_state: GraphState = {
        "messages": [],
        "repository_id": repo_id,
        "user_query": request.query,
        "repository_context": "",
        "repository_files": repository_files,
        "reports": {},
        "final_response": "",
        "source_citations": [],
    }

    # ── Run the LangGraph workflow ─────────────────────────────────────────────
    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(app_graph.invoke, initial_state),
            timeout=120.0,
        )
        reply     = result.get("final_response") or "Sorry, I couldn't generate a response."
        citations = result.get("source_citations") or []

    except asyncio.TimeoutError:
        reply     = "The request timed out. Please try a simpler query."
        citations = []

    except ValueError as e:
        err_str = str(e).lower()
        if "integrity" in err_str or "missing" in err_str:
            reply = (
                "⚠️ The codebase index appears to be corrupted or tampered with. "
                "Please re-ingest the repository to rebuild the vector store."
            )
        else:
            reply = f"⚠️ Error: {e}"
        citations = []

    except Exception as e:
        reply = (
            f"❌ Unexpected error while generating response: {e}\n\n"
            "If this persists, check the backend logs for details."
        )
        citations = []

    return ChatResponse(reply=reply, citations=citations)
