from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI Incident Investigator"
    }


@router.get("/api/health")
def api_health_check():
    return health_check()