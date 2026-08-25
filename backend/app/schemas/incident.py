from pydantic import BaseModel, Field
from typing import Literal

Status = Literal["Open", "Investigating", "Resolved"]

class IncidentCreate(BaseModel):
    application: str = Field(min_length=2)
    error: str = Field(min_length=2)
    severity: Literal["Low", "Medium", "High", "Critical"]
    description: str = Field(min_length=5)


class IncidentResponse(BaseModel):
    id: int
    application: str
    error: str
    severity: Literal["Low", "Medium", "High", "Critical"]
    description: str
    status: str

    root_cause: str | None = None
    investigation_severity: str | None = None
    explanation: str | None = None
    suggested_solution: str | None = None
    preventive_action: str | None = None

    class Config:
        from_attributes = True


class IncidentStatusUpdate(BaseModel):
    status: Literal["Open", "In Progress", "Resolved", "Closed"]


class InvestigationResponse(BaseModel):
    root_cause: str
    severity: str
    explanation: str
    suggested_solution: str
    preventive_action: str

class IncidentStatusUpdate(BaseModel):
    status: str