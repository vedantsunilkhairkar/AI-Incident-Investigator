from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app import models
from app.auth import verify_token
from app.database import SessionLocal

router = APIRouter(prefix="/analytics", tags=["Analytics"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    username = verify_token(token)
    if username is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return username


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── SUMMARY ─────────────────────────────────────────────────────────────────

@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """
    High-level dashboard numbers:
    total incidents, by status, by severity, resolution rate, most broken app.
    """
    all_incidents = db.query(models.Incident).all()
    total = len(all_incidents)

    if total == 0:
        return {
            "total": 0,
            "open": 0,
            "investigating": 0,
            "resolved": 0,
            "resolution_rate": 0,
            "critical_count": 0,
            "top_broken_app": None,
            "top_category": None,
        }

    status_counts = Counter(i.status for i in all_incidents)
    severity_counts = Counter(i.severity for i in all_incidents)
    app_counts = Counter(i.application for i in all_incidents)
    category_counts = Counter(
        i.incident_category for i in all_incidents if i.incident_category
    )

    resolved = status_counts.get("Resolved", 0)
    resolution_rate = round((resolved / total) * 100, 1) if total > 0 else 0

    top_app = app_counts.most_common(1)[0][0] if app_counts else None
    top_category = category_counts.most_common(1)[0][0] if category_counts else None

    return {
        "total": total,
        "open": status_counts.get("Open", 0),
        "investigating": status_counts.get("Investigating", 0),
        "resolved": resolved,
        "resolution_rate": resolution_rate,
        "critical_count": severity_counts.get("Critical", 0),
        "high_count": severity_counts.get("High", 0),
        "medium_count": severity_counts.get("Medium", 0),
        "low_count": severity_counts.get("Low", 0),
        "top_broken_app": top_app,
        "top_broken_app_count": app_counts[top_app] if top_app else 0,
        "top_category": top_category,
    }


# ─── TOP BROKEN APPS ─────────────────────────────────────────────────────────

@router.get("/top-apps")
def get_top_apps(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Return the most frequently broken applications."""
    all_incidents = db.query(models.Incident).all()
    app_counts = Counter(i.application for i in all_incidents)

    return [
        {"application": app, "incident_count": count}
        for app, count in app_counts.most_common(limit)
    ]


# ─── SEVERITY DISTRIBUTION ───────────────────────────────────────────────────

@router.get("/severity-distribution")
def get_severity_distribution(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Severity breakdown across all incidents."""
    all_incidents = db.query(models.Incident).all()
    counts = Counter(i.severity for i in all_incidents)

    return {
        "Critical": counts.get("Critical", 0),
        "High": counts.get("High", 0),
        "Medium": counts.get("Medium", 0),
        "Low": counts.get("Low", 0),
    }


# ─── CATEGORY BREAKDOWN ──────────────────────────────────────────────────────

@router.get("/categories")
def get_categories(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Incident count grouped by ML-predicted category."""
    all_incidents = db.query(models.Incident).all()
    counts = Counter(
        i.incident_category for i in all_incidents if i.incident_category
    )

    return [
        {"category": cat, "count": count}
        for cat, count in counts.most_common()
    ]


# ─── REPEAT ERRORS ───────────────────────────────────────────────────────────

@router.get("/repeat-errors")
def get_repeat_errors(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """
    Top repeated error patterns.
    Groups by the first 80 characters of the error message.
    """
    all_incidents = db.query(models.Incident).all()
    error_counts = Counter(
        i.error[:80] for i in all_incidents if i.error
    )

    return [
        {"error_pattern": err, "count": count}
        for err, count in error_counts.most_common(limit)
        if count > 1  # only show actual repeats
    ]


# ─── RECENT TREND (LAST 7 DAYS) ──────────────────────────────────────────────

@router.get("/trend")
def get_trend(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """
    Number of incidents per day over the last N days.
    """
    all_incidents = (
        db.query(models.Incident)
        .filter(models.Incident.created_at.isnot(None))
        .all()
    )

    today = datetime.utcnow().date()
    result = []

    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        count = sum(
            1 for i in all_incidents
            if i.created_at and i.created_at.date() == day
        )
        result.append({
            "date": day.isoformat(),
            "count": count,
        })

    return result
