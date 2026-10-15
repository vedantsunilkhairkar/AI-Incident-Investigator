from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from datetime import datetime

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="user", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    application = Column(String, index=True)
    error = Column(Text)
    severity = Column(String, index=True)
    description = Column(Text)
    status = Column(String, index=True)

    root_cause = Column(Text, nullable=True)
    investigation_severity = Column(String, nullable=True)
    explanation = Column(Text, nullable=True)
    suggested_solution = Column(Text, nullable=True)
    preventive_action = Column(Text, nullable=True)

    # ML fields
    embedding = Column(Text, nullable=True)           # JSON-serialized vector
    ml_predicted_severity = Column(String, nullable=True)  # ML severity prediction
    incident_category = Column(String, nullable=True) # e.g. Database, Auth, Network
    similar_incident_ids = Column(Text, nullable=True) # JSON list [3, 7, 12]
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)


class IncidentHistory(Base):
    __tablename__ = "incident_history"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, index=True)

    action = Column(String, nullable=False)

    description = Column(Text, nullable=True)

    root_cause = Column(Text, nullable=True)
    investigation_severity = Column(String, nullable=True)
    explanation = Column(Text, nullable=True)
    suggested_solution = Column(Text, nullable=True)
    preventive_action = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )