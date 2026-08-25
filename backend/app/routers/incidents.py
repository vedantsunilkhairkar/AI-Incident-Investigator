from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.schemas.incident import IncidentCreate, IncidentResponse,IncidentStatusUpdate
from app.database import SessionLocal
from app import models
from app.services.investigator import investigate_incident
from app.services.ai_service import investigate_incident
from app.schemas import InvestigationResponse
from fastapi import HTTPException
from fastapi import Query
import logging

logger = logging.getLogger(__name__)



router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/incidents", response_model=IncidentResponse)
def create_incident(
    incident: IncidentCreate,
    db: Session = Depends(get_db)
):
    try:
        new_incident = models.Incident(
            application=incident.application,
            error=incident.error,
            severity=incident.severity,
            description=incident.description,
            status="Open"
        )

        db.add(new_incident)
        db.commit()
        db.refresh(new_incident)

        return new_incident

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to create incident"
        )

@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db)
):
    incident = db.query(models.Incident).filter(
        models.Incident.id == incident_id
    ).first()

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    return incident

@router.get("/incidents", response_model=list[IncidentResponse])
def get_incidents(
    severity: str | None = None,
    status: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(models.Incident)

    if severity:
        query = query.filter(models.Incident.severity == severity)

    if status:
        query = query.filter(models.Incident.status == status)

    return query.offset(skip).limit(limit).all()

@router.patch("/incidents/{incident_id}/status")
def update_incident_status(
    incident_id: int,
    data: IncidentStatusUpdate,
    db: Session = Depends(get_db)
):
    incident = db.query(models.Incident).filter(
        models.Incident.id == incident_id
    ).first()

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    incident.status = data.status

    db.commit()
    db.refresh(incident)

    return {
        "message": "Incident status updated",
        "incident_id": incident.id,
        "status": incident.status
    }

@router.post(
    "/incidents/{incident_id}/investigate",
    response_model=InvestigationResponse
)
def investigate(
    incident_id: int,
    db: Session = Depends(get_db)
):
    incident = db.query(models.Incident).filter(
        models.Incident.id == incident_id
    ).first()

    if not incident:
        return {"message": "Incident not found"}

    # Return saved investigation if already available
    if incident.root_cause:
        return {
            "root_cause": incident.root_cause,
            "severity": incident.investigation_severity,
            "explanation": incident.explanation,
            "suggested_solution": incident.suggested_solution,
            "preventive_action": incident.preventive_action
        }

    try:
        result = investigate_incident(incident.error)
    except Exception as e:
        logger.exception("AI investigation failed for incident %s", incident_id)
        raise HTTPException(
            status_code=500,
            detail="AI investigation failed"
        )

    incident.root_cause = result["root_cause"]
    incident.investigation_severity = result["severity"]
    incident.explanation = result["explanation"]
    incident.suggested_solution = result["suggested_solution"]
    incident.preventive_action = result["preventive_action"]

    db.commit()

    return result
