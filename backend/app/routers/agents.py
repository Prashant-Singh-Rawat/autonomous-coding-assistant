from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import asyncio
import logging
from app import database, auth, models, schemas

router = APIRouter(prefix="/agents", tags=["AI Agents"])
logger = logging.getLogger("agents_router")

class AgentStartRequest(BaseModel):
    repository_id: str
    input_query: Optional[str] = None

class AgentRunResponse(BaseModel):
    id: str
    repository_id: str
    agent_type: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    result_summary: Optional[str] = None
    error_message: Optional[str] = None

# In-memory pause flag map (for simplicity, since we are handling runs in-memory or background tasks)
paused_runs = set()

# Background simulator task to update DB progress in real-time
async def simulate_agent_run(run_id: str, db_session_maker, agent_type: str):
    stages = [
        "Initializing worker configurations...",
        "Reading active workspace file structure...",
        "Retrieving semantic vector-embeddings chunks...",
        "Evaluating design pattern constraints...",
        "Applying structural modifications...",
        "Synthesizing final code changes...",
        "Verifying structural integrity checks..."
    ]
    
    for i, stage in enumerate(stages):
        # Allow pausing execution
        while run_id in paused_runs:
            await asyncio.sleep(1)
            
        db = db_session_maker()
        try:
            run = db.query(models.AgentRun).filter(models.AgentRun.id == run_id).first()
            if not run or run.status in ["failed", "success"]:
                break
            
            # Update status/progress details
            percent = int(((i + 1) / len(stages)) * 100)
            run.result_summary = f"{stage} ({percent}%)"
            db.commit()
        except Exception as e:
            logger.error(f"Error in simulate_agent_run DB update: {e}")
        finally:
            db.close()
            
        await asyncio.sleep(2)
        
    # Finalize success
    db = db_session_maker()
    try:
        run = db.query(models.AgentRun).filter(models.AgentRun.id == run_id).first()
        if run and run.status == "running":
            run.status = "success"
            run.completed_at = datetime.utcnow()
            run.result_summary = f"{agent_type.capitalize()} task completed successfully. Integrity verified."
            db.commit()
    except Exception as e:
        logger.error(f"Error in simulate_agent_run finalize: {e}")
    finally:
        db.close()

@router.get("/runs", response_model=List[AgentRunResponse])
def get_recent_agent_runs(
    repository_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns all recent agent runs for the specified repository.
    """
    return db.query(models.AgentRun).filter(
        models.AgentRun.repository_id == repository_id
    ).order_by(models.AgentRun.started_at.desc()).limit(10).all()

@router.post("/{agent_id}/start")
async def start_agent(
    agent_id: str,
    req: AgentStartRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Starts an AI Agent execution.
    """
    # Create new run log entry
    run = models.AgentRun(
        repository_id=req.repository_id,
        agent_type=agent_id,
        status="running",
        started_at=datetime.utcnow(),
        result_summary="Initializing worker configurations..."
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    # Trigger async simulator loop
    background_tasks.add_task(simulate_agent_run, run.id, database.SessionLocal, agent_id)
    return {"status": "started", "run_id": run.id}

@router.post("/{agent_id}/stop")
def stop_agent(
    agent_id: str,
    repository_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Stops the active running agent.
    """
    run = db.query(models.AgentRun).filter(
        models.AgentRun.repository_id == repository_id,
        models.AgentRun.agent_type == agent_id,
        models.AgentRun.status == "running"
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="No active running agent found to stop.")
    
    run.status = "failed"
    run.completed_at = datetime.utcnow()
    run.error_message = "Execution cancelled by operator."
    db.commit()
    return {"status": "stopped", "run_id": run.id}

@router.post("/{agent_id}/pause")
def pause_agent(
    agent_id: str,
    repository_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Pauses the active running agent.
    """
    run = db.query(models.AgentRun).filter(
        models.AgentRun.repository_id == repository_id,
        models.AgentRun.agent_type == agent_id,
        models.AgentRun.status == "running"
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="No active running agent found to pause.")
        
    paused_runs.add(run.id)
    return {"status": "paused", "run_id": run.id}

@router.post("/{agent_id}/resume")
def resume_agent(
    agent_id: str,
    repository_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Resumes the paused agent execution.
    """
    run = db.query(models.AgentRun).filter(
        models.AgentRun.repository_id == repository_id,
        models.AgentRun.agent_type == agent_id,
        models.AgentRun.status == "running"
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="No active running agent found.")
        
    if run.id in paused_runs:
        paused_runs.remove(run.id)
    return {"status": "resumed", "run_id": run.id}

@router.get("/{agent_id}/logs")
def get_agent_logs(
    agent_id: str,
    repository_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Retrieves live execution logs for the given agent.
    """
    run = db.query(models.AgentRun).filter(
        models.AgentRun.repository_id == repository_id,
        models.AgentRun.agent_type == agent_id
    ).order_by(models.AgentRun.started_at.desc()).first()
    
    if not run:
        return {"logs": ["No logs found for this agent."]}
        
    logs = [
        f"[{run.started_at.strftime('%Y-%m-%d %H:%M:%S')}] [System] Initializing {agent_id.capitalize()} Agent context...",
        f"[{run.started_at.strftime('%Y-%m-%d %H:%M:%S')}] [Sync] Connecting database schemas...",
    ]
    if run.result_summary:
        logs.append(f"[{datetime.utcnow().strftime('%H:%M:%S')}] [Progress] {run.result_summary}")
    if run.error_message:
        logs.append(f"[{datetime.utcnow().strftime('%H:%M:%S')}] [Error] {run.error_message}")
    if run.status == "success":
        logs.append(f"[{datetime.utcnow().strftime('%H:%M:%S')}] [System] Success verdict. Execution terminated successfully.")
        
    return {"logs": logs}
