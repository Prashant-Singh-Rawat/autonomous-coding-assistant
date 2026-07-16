import re
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app import models, auth, database, schemas
from app.services.context_builder import ContextBuilderService
from app.services.memory_service import MemoryService
from app.agents.graph import app_graph, GraphState

router = APIRouter(prefix="/workspace", tags=["Workspace"])

# ─── Request Schemas ──────────────────────────────────────────────────────────

class WorkspaceChatRequest(BaseModel):
    query: str
    active_file_path: Optional[str] = None
    active_lines: Optional[List[int]] = None
    conversation_id: Optional[str] = None

class ExplanationRequest(BaseModel):
    scope: str # 'file' | 'folder' | 'architecture'
    path: Optional[str] = None

class MemoryCreateRequest(BaseModel):
    content: str
    scope: Optional[str] = None
    memory_type: str = "fact"

class DiagramRequest(BaseModel):
    diagram_type: str # 'dependency_graph' | 'uml' | 'flowchart' | 'architecture'
    scope_path: Optional[str] = None

# ─── Endpoints ────────────────────────────────────────────────────────────────

def validate_uuid(uuid_str: str):
    if not re.match(r"^[0-9a-f-]{36}$", uuid_str, re.I):
        raise HTTPException(status_code=400, detail="Invalid repository ID format")

def check_repo_ownership(db: Session, repo_id: str, user_id: str) -> models.Repository:
    validate_uuid(repo_id)
    repo = db.query(models.Repository).filter(
        models.Repository.id == repo_id,
        models.Repository.user_id == user_id
    ).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if repo.status != "ready":
        raise HTTPException(status_code=400, detail="Repository indexing is not ready yet")
    return repo


@router.post("/{repo_id}/chat")
async def send_workspace_chat(
    repo_id: str,
    req: WorkspaceChatRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    repo = check_repo_ownership(db, repo_id, current_user.id)
    
    # 1. Handle Conversation creation
    conv_id = req.conversation_id
    if not conv_id:
        new_conv = models.Conversation(
            repository_id=repo_id,
            user_id=current_user.id,
            title=req.query[:40] + "..." if len(req.query) > 40 else req.query
        )
        db.add(new_conv)
        db.commit()
        db.refresh(new_conv)
        conv_id = new_conv.id

    # Add user message
    user_msg = models.Message(
        conversation_id=conv_id,
        role="user",
        content=req.query
    )
    db.add(user_msg)
    db.commit()

    # 2. Build Context Bundle
    context = ContextBuilderService.build_context_bundle(
        db=db,
        repository_id=repo_id,
        query=req.query,
        active_file_path=req.active_file_path,
        active_lines=req.active_lines,
        conversation_id=conv_id
    )

    # 3. Stream or execute Agent
    # Setup initial state
    files_db = db.query(models.RepositoryFile).filter(models.RepositoryFile.repository_id == repo_id).all()
    repository_files = [
        {"path": f.file_path, "language": f.language or "text", "content": (f.content or "")[:2000]}
        for f in files_db
    ]

    initial_state: GraphState = {
        "messages": [],
        "repository_id": repo_id,
        "user_query": req.query,
        "repository_context": "\n\n".join([c["content"] for c in context["semantic_chunks"]]),
        "repository_files": repository_files,
        "reports": {},
        "final_response": "",
        "source_citations": [c["source"] for c in context["semantic_chunks"]]
    }

    try:
        result = app_graph.invoke(initial_state)
        reply = result.get("final_response") or "Sorry, I couldn't generate a response."
        citations = result.get("source_citations") or []
        
        # Determine intent (agent) used
        intent = result.get("reports", {}).get("intent", "explain")

        # Save assistant response
        assistant_msg = models.Message(
            conversation_id=conv_id,
            role="assistant",
            content=reply,
            agent_type=intent,
            source_citations=citations
        )
        db.add(assistant_msg)
        db.commit()

        # Compact log history if needed
        MemoryService.compact_conversation_history(db, conv_id)

        return {
            "conversation_id": conv_id,
            "reply": reply,
            "citations": citations,
            "agent_type": intent
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent workflow execution failed: {e}")


@router.get("/{repo_id}/conversations")
def get_conversations(
    repo_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    validate_uuid(repo_id)
    return db.query(models.Conversation).filter(
        models.Conversation.repository_id == repo_id,
        models.Conversation.user_id == current_user.id
    ).order_by(models.Conversation.updated_at.desc()).all()


@router.get("/conversations/{conv_id}/messages")
def get_conversation_messages(
    conv_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify ownership of conversation
    conv = db.query(models.Conversation).filter(
        models.Conversation.id == conv_id,
        models.Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    return db.query(models.Message).filter(
        models.Message.conversation_id == conv_id
    ).order_by(models.Message.created_at.asc()).all()


@router.post("/{repo_id}/explain")
def explain_codebase_scope(
    repo_id: str,
    req: ExplanationRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    check_repo_ownership(db, repo_id, current_user.id)
    
    scope_details = f"scope: {req.scope}"
    if req.path:
        scope_details += f" at path: {req.path}"
        
    # Standard explain query triggers graph
    initial_state: GraphState = {
        "messages": [],
        "repository_id": repo_id,
        "user_query": f"Explain this {scope_details}",
        "repository_context": "",
        "repository_files": [],
        "reports": {"intent": "explain"},
        "final_response": "",
        "source_citations": [req.path] if req.path else []
    }
    
    result = app_graph.invoke(initial_state)
    return {
        "explanation": result.get("final_response"),
        "citations": result.get("source_citations", [])
    }


@router.post("/{repo_id}/generate/diagram")
def generate_codebase_diagram(
    repo_id: str,
    req: DiagramRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    check_repo_ownership(db, repo_id, current_user.id)
    
    # Check if diagram is already cached
    cached = db.query(models.Diagram).filter(
        models.Diagram.repository_id == repo_id,
        models.Diagram.diagram_type == req.diagram_type,
        models.Diagram.scope_path == req.scope_path
    ).first()
    if cached:
        return cached.graph_data

    # Generate new diagram
    initial_state: GraphState = {
        "messages": [],
        "repository_id": repo_id,
        "user_query": f"Generate {req.diagram_type} diagram for path {req.scope_path}",
        "repository_context": "",
        "repository_files": [],
        "reports": {"intent": "diagram"},
        "final_response": "",
        "source_citations": []
    }
    
    result = app_graph.invoke(initial_state)
    diagram_json = result.get("reports", {}).get("diagram_data") or {"nodes": [], "edges": []}
    
    # Cache in DB
    new_diagram = models.Diagram(
        repository_id=repo_id,
        diagram_type=req.diagram_type,
        scope_path=req.scope_path,
        graph_data=diagram_json
    )
    db.add(new_diagram)
    db.commit()
    
    return diagram_json


@router.get("/{repo_id}/findings")
def get_scan_findings(
    repo_id: str,
    finding_type: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    check_repo_ownership(db, repo_id, current_user.id)
    
    query = db.query(models.Finding).filter(models.Finding.repository_id == repo_id)
    if finding_type:
        query = query.filter(models.Finding.finding_type == finding_type)
        
    return query.order_by(models.Finding.created_at.desc()).all()


@router.get("/{repo_id}/search")
def get_semantic_search(
    repo_id: str,
    q: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    check_repo_ownership(db, repo_id, current_user.id)
    
    context = ContextBuilderService.build_context_bundle(
        db=db,
        repository_id=repo_id,
        query=q,
        k_chunks=8
    )
    return context["semantic_chunks"]


@router.post("/{repo_id}/memory")
def create_project_memory(
    repo_id: str,
    req: MemoryCreateRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    check_repo_ownership(db, repo_id, current_user.id)
    
    memory = MemoryService.add_project_memory(
        db=db,
        repository_id=repo_id,
        content=req.content,
        scope=req.scope,
        memory_type=req.memory_type
    )
    return memory


@router.get("/{repo_id}/memory")
def get_project_memories(
    repo_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    check_repo_ownership(db, repo_id, current_user.id)
    return db.query(models.ProjectMemory).filter(
        models.ProjectMemory.repository_id == repo_id
    ).all()
