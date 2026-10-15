from pydantic import BaseModel, Field, field_validator
from typing import Literal


Status = Literal["Open", "Investigating", "Resolved"]


class IncidentCreate(BaseModel):
    application: str
    error: str
    severity: Literal["Low", "Medium", "High", "Critical"]
    description: str

    @field_validator("severity", mode="before")
    @classmethod
    def normalize_severity(cls, value):
        if isinstance(value, str):
            value = value.strip().lower()

            severity_map = {
                "low": "Low",
                "medium": "Medium",
                "high": "High",
                "critical": "Critical"
            }

            return severity_map.get(value, value)

        return value


class IncidentResponse(BaseModel):
    id: int
    application: str
    error: str
    severity: Literal["Low", "Medium", "High", "Critical"]
    description: str
    status: Status

    root_cause: str | None = None
    investigation_severity: str | None = None
    explanation: str | None = None
    suggested_solution: str | None = None
    preventive_action: str | None = None

    # ML fields
    ml_predicted_severity: str | None = None
    incident_category: str | None = None
    similar_incident_ids: str | None = None
    created_at: str | None = None

    class Config:
        from_attributes = True


class IncidentStatusUpdate(BaseModel):
    status: Status


class InvestigationResponse(BaseModel):
    root_cause: str
    severity: str
    explanation: str
    suggested_solution: str
    preventive_action: str