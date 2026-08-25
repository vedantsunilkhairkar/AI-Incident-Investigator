from fastapi import APIRouter

router = APIRouter()


@router.get("/system/info")
def system_info():
    return {
        "application": "AI Incident Investigator",
        "version": "1.0.0",
        "environment": "development"
    }