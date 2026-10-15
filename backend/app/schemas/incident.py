from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, field_validator


Status = Literal["Open", "Investigating", "Resolved"]


class IncidentCreate(BaseModel):
    application: str
    error: str
    severity: Literal["Low", "Medium", "High", "Critical"]
    description: str
    devops_tool: str | None = None
    environment: str | None = "Production"
    service_or_cluster: str | None = None

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

    # DevOps & Infrastructure fields
    devops_tool: str | None = None
    environment: str | None = None
    service_or_cluster: str | None = None
    ai_remediation_commands: str | None = None
    ai_runbook: str | None = None

    # ML fields
    ml_predicted_severity: str | None = None
    incident_category: str | None = None
    similar_incident_ids: str | None = None

    # Agentic & Generative AI fields
    agent_thought_trace: str | None = None
    architecture_diagram: str | None = None
    chat_history: str | None = None
    created_at: datetime | str | None = None

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
    remediation_commands: str | None = None
    runbook: str | None = None
    devops_tool: str | None = None
    agent_thought_trace: str | None = None
    architecture_diagram: str | None = None


class AgentChatRequest(BaseModel):
    message: str


class AgentChatResponse(BaseModel):
    reply: str
    updated_chat_history: str


class CommandExecuteRequest(BaseModel):
    command: str


class CommandExecuteResponse(BaseModel):
    command: str
    output: str
    exit_code: int
    duration_ms: int
    risk_level: str