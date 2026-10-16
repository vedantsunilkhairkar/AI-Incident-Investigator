from .database import engine, Base,SessionLocal
from . import models
from fastapi import FastAPI,Depends
from app.routers import system, health, incidents, auth, analytics
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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
app.include_router(auth.router)
app.include_router(analytics.router)