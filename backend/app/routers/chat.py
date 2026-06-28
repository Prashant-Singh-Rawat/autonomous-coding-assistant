from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from .. import schemas, models, auth, database
from ..agents.graph import app_graph, GraphState

router = APIRouter(prefix="/chat", tags=["Chat"])

class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    reply: str

@router.post("/{repo_id}", response_model=ChatResponse)
def chat_with_repo(
    repo_id: str, 
    request: ChatRequest, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify ownership
    repo = db.query(models.Repository).filter(models.Repository.id == repo_id, models.Repository.user_id == current_user.id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    # Initialize state
    initial_state: GraphState = {
        "messages": [],
        "repository_id": repo_id,
        "user_query": request.query,
        "repository_context": "",
        "reports": {},
        "final_response": ""
    }
    
    try:
        # result = app_graph.invoke(initial_state)
        # reply = result.get("final_response", "Sorry, I couldn't generate a response.")
        
        reply = f"Simulated response to: '{request.query}'. Please set OPENAI_API_KEY for full functionality."
    except ValueError as e:
        if "integrity" in str(e).lower():
            reply = "The codebase index appears to be corrupted. Please re-ingest the repository."
        else:
            reply = f"Error: {str(e)}"
    except Exception as e:
        reply = f"Error generating response: {str(e)}"
        
    return ChatResponse(reply=reply)
