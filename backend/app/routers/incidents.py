import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app import models
from app.database import SessionLocal
from app.auth import verify_token
from app.schemas.incident import (
    IncidentCreate,
    IncidentResponse,
    IncidentStatusUpdate,
    InvestigationResponse,
)
from app.services.ai_service import investigate_incident
from app.services.data_cleaner import (
    clean_incident_data,
    validate_incident_data,
)
from app.services.ml_service import (
    generate_embedding,
    find_similar_incidents,
    predict_category,
)

logger = logging.getLogger(__name__)

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    username = verify_token(token)

    if username is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    return username


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def add_history(
    db: Session,
    incident_id: int,
    action: str,
    description: str,
    root_cause: str | None = None,
    investigation_severity: str | None = None,
    explanation: str | None = None,
    suggested_solution: str | None = None,
    preventive_action: str | None = None,
):
    history = models.IncidentHistory(
        incident_id=incident_id,
        action=action,
        description=description,
        root_cause=root_cause,
        investigation_severity=investigation_severity,
        explanation=explanation,
        suggested_solution=suggested_solution,
        preventive_action=preventive_action,
    )

    db.add(history)


# ─── CREATE INCIDENT ────────────────────────────────────────────────────────

@router.post(
    "/incidents",
    response_model=IncidentResponse
)
def create_incident(
    incident: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    try:
        cleaned_data = clean_incident_data({
            "application": incident.application,
            "error": incident.error,
            "severity": incident.severity,
            "description": incident.description,
        })

        is_valid, errors = validate_incident_data(cleaned_data)

        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Invalid incident data",
                    "errors": errors,
                }
            )

        new_incident = models.Incident(
            application=cleaned_data["application"],
            error=cleaned_data["error"],
            severity=cleaned_data["severity"],
            description=cleaned_data["description"],
            status="Open",
        )

        db.add(new_incident)
        db.commit()
        db.refresh(new_incident)

        # ── ML: Generate embedding + predict category (background-safe) ──
        try:
            combined_text = (
                f"{cleaned_data['application']} {cleaned_data['error']} {cleaned_data['description']}"
            )

            embedding = generate_embedding(combined_text)
            if embedding:
                new_incident.embedding = json.dumps(embedding)

            category = predict_category(
                cleaned_data["error"],
                cleaned_data["description"],
            )
            new_incident.incident_category = category

            db.commit()
            db.refresh(new_incident)

            logger.info(
                "ML processing done for incident %s: category=%s, embedding=%s",
                new_incident.id,
                category,
                "yes" if embedding else "no",
            )
        except Exception as ml_err:
            # ML failure must NOT block incident creation
            logger.warning("ML processing failed for incident %s: %s", new_incident.id, ml_err)

        add_history(
            db,
            new_incident.id,
            "Incident Created",
            f"Incident created by {current_user}. Category: {new_incident.incident_category or 'Unknown'}.",
        )

        db.commit()

        return new_incident

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to create incident",
        )


# ─── GET SINGLE INCIDENT ─────────────────────────────────────────────────────

@router.get(
    "/incidents/{incident_id}",
    response_model=IncidentResponse
)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    incident = (
        db.query(models.Incident)
        .filter(models.Incident.id == incident_id)
        .first()
    )

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    return incident


# ─── GET ALL INCIDENTS ───────────────────────────────────────────────────────

@router.get(
    "/incidents",
    response_model=list[IncidentResponse]
)
def get_incidents(
    severity: str | None = None,
    status: str | None = None,
    category: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    query = db.query(models.Incident)

    if severity:
        query = query.filter(models.Incident.severity == severity)

    if status:
        query = query.filter(models.Incident.status == status)

    if category:
        query = query.filter(models.Incident.incident_category == category)

    return query.order_by(models.Incident.id.desc()).offset(skip).limit(limit).all()


# ─── UPDATE STATUS ───────────────────────────────────────────────────────────

@router.patch("/incidents/{incident_id}/status")
def update_incident_status(
    incident_id: int,
    data: IncidentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    incident = (
        db.query(models.Incident)
        .filter(models.Incident.id == incident_id)
        .first()
    )

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    old_status = incident.status
    incident.status = data.status

    add_history(
        db,
        incident.id,
        "Status Changed",
        f"Status changed from {old_status} to {data.status} by {current_user}.",
    )

    db.commit()
    db.refresh(incident)

    return incident


# ─── AI INVESTIGATE ──────────────────────────────────────────────────────────

@router.post(
    "/incidents/{incident_id}/investigate",
    response_model=InvestigationResponse
)
def investigate(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    incident = (
        db.query(models.Incident)
        .filter(models.Incident.id == incident_id)
        .first()
    )

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    incident.status = "Investigating"

    add_history(
        db,
        incident.id,
        "AI Investigation Started",
        f"AI investigation started by {current_user}.",
    )

    db.commit()
    db.refresh(incident)

    # ── ML: Find similar past incidents for RAG ──────────────────────────
    similar = []
    try:
        if incident.embedding:
            current_vec = json.loads(incident.embedding)
            similar = find_similar_incidents(db, current_vec, exclude_id=incident_id)

            if similar:
                # Save the IDs of similar incidents on the record
                incident.similar_incident_ids = json.dumps([s["id"] for s in similar])
                db.commit()

                logger.info(
                    "Found %d similar incidents for incident %s: %s",
                    len(similar),
                    incident_id,
                    [s["id"] for s in similar],
                )
        else:
            logger.info("Incident %s has no embedding — using standard investigation", incident_id)
    except Exception as ml_err:
        logger.warning("Similar incident search failed: %s", ml_err)
        similar = []

    # ── Gemini RAG Investigation ─────────────────────────────────────────
    try:
        result = investigate_incident(
            application=incident.application,
            error_message=incident.error,
            description=incident.description,
            severity=incident.severity,
            similar_incidents=similar if similar else None,
        )

    except Exception:
        logger.exception(
            "AI investigation failed for incident %s", incident_id
        )

        incident.status = "Open"

        add_history(
            db,
            incident.id,
            "AI Investigation Failed",
            "AI investigation could not be completed. Incident returned to Open status.",
        )

        db.commit()
        db.refresh(incident)

        raise HTTPException(
            status_code=500,
            detail="AI investigation failed. The incident has been returned to Open status.",
        )

    # ── Save results ─────────────────────────────────────────────────────
    incident.root_cause = result["root_cause"]
    incident.investigation_severity = result["severity"]
    incident.explanation = result["explanation"]
    incident.suggested_solution = result["suggested_solution"]
    incident.preventive_action = result["preventive_action"]
    incident.ml_predicted_severity = result["severity"]

    # Status → Resolved (AI has analysed it; engineer can change if needed)
    incident.status = "Resolved"

    rag_note = f" Used {len(similar)} historical match(es) for RAG." if similar else ""

    add_history(
        db,
        incident.id,
        "AI Investigation Completed",
        f"AI analysis completed by {current_user}.{rag_note}",
        root_cause=result["root_cause"],
        investigation_severity=result["severity"],
        explanation=result["explanation"],
        suggested_solution=result["suggested_solution"],
        preventive_action=result["preventive_action"],
    )

    db.commit()
    db.refresh(incident)

    return result


# ─── SIMILAR INCIDENTS ───────────────────────────────────────────────────────

@router.get("/incidents/{incident_id}/similar")
def get_similar_incidents(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """
    Return top 3 resolved incidents most similar to this one.
    Requires the incident to have an embedding (generated on creation).
    """
    incident = (
        db.query(models.Incident)
        .filter(models.Incident.id == incident_id)
        .first()
    )

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if not incident.embedding:
        return {
            "incident_id": incident_id,
            "message": "No embedding found for this incident. It may have been created before ML was enabled.",
            "similar": [],
        }

    try:
        current_vec = json.loads(incident.embedding)
        similar = find_similar_incidents(db, current_vec, exclude_id=incident_id)
    except Exception as e:
        logger.exception("Similar incident search failed: %s", e)
        raise HTTPException(status_code=500, detail="Similar incident search failed")

    return {
        "incident_id": incident_id,
        "total_found": len(similar),
        "similar": similar,
    }


# ─── INCIDENT HISTORY ────────────────────────────────────────────────────────

@router.get("/incidents/{incident_id}/history")
def get_incident_history(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    incident = (
        db.query(models.Incident)
        .filter(models.Incident.id == incident_id)
        .first()
    )

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    history = (
        db.query(models.IncidentHistory)
        .filter(
            models.IncidentHistory.incident_id == incident_id
        )
        .order_by(models.IncidentHistory.id.asc())
        .all()
    )

    return [
        {
            "id": item.id,
            "incident_id": item.incident_id,
            "action": item.action,
            "description": item.description,
            "root_cause": item.root_cause,
            "investigation_severity": item.investigation_severity,
            "explanation": item.explanation,
            "suggested_solution": item.suggested_solution,
            "preventive_action": item.preventive_action,
            "created_at": item.created_at,
        }
        for item in history
    ]