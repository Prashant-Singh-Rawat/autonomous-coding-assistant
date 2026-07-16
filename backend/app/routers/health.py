from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app import database, auth, models, schemas
from app.services.self_healing import SelfHealingService

router = APIRouter(prefix="/health", tags=["Health & Observability"])

@router.get("/subsystems", response_model=schemas.SystemHealthResponse)
def get_detailed_system_health(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns real-time status of all backend subsystems derived from synthetic checks.
    """
    return SelfHealingService.run_health_checks(db)

@router.get("/diagnostics", response_model=List[schemas.DiagnosticRecordResponse])
def get_diagnostic_records(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Retrieves all durable diagnostic records of system self-healing actions.
    """
    return db.query(models.DiagnosticRecord).order_by(models.DiagnosticRecord.created_at.desc()).all()

@router.post("/diagnostics/{record_id}/resolve")
def resolve_diagnostic_record(
    record_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Manually resolves a diagnostic record.
    """
    record = db.query(models.DiagnosticRecord).filter(models.DiagnosticRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Diagnostic record not found")
    record.status = "resolved"
    record.resolved_at = datetime.utcnow()
    db.commit()
    return {"status": "resolved"}
