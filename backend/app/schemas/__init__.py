from pydantic import BaseModel


class InvestigationResponse(BaseModel):
    root_cause: str
    severity: str
    explanation: str
    suggested_solution: str
    preventive_action: str