from .database import engine, Base,SessionLocal
from . import models
from fastapi import FastAPI,Depends
from app.routers import system,health,incidents
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Incident Investigator",
    description="AI-powered software incident investigation platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI Incident Investigator"
    }

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def home():
    return {
        "message": "AI Incident Investigator API"
    }


app.include_router(system.router)
app.include_router(health.router)
app.include_router(incidents.router)