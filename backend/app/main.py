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


def seed_demo_incidents():
    db = SessionLocal()
    try:
        demo_incidents = [
            {
                "id": 101,
                "application": "payment-gateway",
                "error": "ConnectionTimeoutError: Database pool exhausted",
                "severity": "Critical",
                "description": "Database connection pool saturated causing 504 Gateway Timeouts across checkout services.",
                "status": "Investigating",
                "root_cause": "High connection churn without proper pooling configuration in Kubernetes deployment.",
                "devops_tool": "Kubernetes",
                "environment": "Production",
                "incident_category": "Database",
                "suggested_solution": "Scale PgBouncer read-replicas and increase max_connections in PostgreSQL.",
                "ai_remediation_commands": "kubectl scale deployment pgbouncer --replicas=3 -n database\nkubectl rollout status deployment/pgbouncer -n database",
                "ai_runbook": "### Immediate Remediation\n1. Scale PgBouncer deployment to 3 replicas.\n2. Inspect database active connections: `SELECT count(*) FROM pg_stat_activity;`",
            },
            {
                "id": 102,
                "application": "auth-service",
                "error": "RedisClusterDown: MOVED 12182 10.0.4.12:6379",
                "severity": "High",
                "description": "Redis master failover occurred but replica node did not promote automatically.",
                "status": "Open",
                "root_cause": "Sentinel quorum failed due to network partition in us-east-1a.",
                "devops_tool": "Docker",
                "environment": "Staging",
                "incident_category": "Infrastructure",
                "suggested_solution": "Execute sentinel failover auth-cache-master and restart unhealthy pods.",
                "ai_remediation_commands": "docker exec -it redis-sentinel redis-cli -p 26379 sentinel failover auth-cache-master\ndocker restart auth-service-replica-1",
                "ai_runbook": "### Sentinel Recovery Runbook\n1. Check quorum: `sentinel master auth-cache-master`\n2. Trigger manual failover\n3. Verify slave promotion",
            },
            {
                "id": 103,
                "application": "frontend-ingress",
                "error": "NGINX 502 Bad Gateway: Upstream SSL handshake failed",
                "severity": "Medium",
                "description": "Ingress controller SSL certificate expired during rolling cert-manager renewal.",
                "status": "Resolved",
                "root_cause": "Cert-manager ACME challenge rate-limited by Let's Encrypt.",
                "devops_tool": "Terraform",
                "environment": "Production",
                "incident_category": "Networking",
                "suggested_solution": "Force cert-manager secret renewal with Cloudflare DNS-01 provider.",
                "ai_remediation_commands": "kubectl delete secret frontend-tls -n ingress-nginx\nkubectl get certificate frontend-tls -n ingress-nginx -o wide",
                "ai_runbook": "### Ingress SSL Renewal Runbook\n1. Delete expired TLS secret to force cert-manager re-issuance\n2. Inspect cert-manager challenges: `kubectl get challenges -A`",
            },
        ]

        for item in demo_incidents:
            existing = db.query(models.Incident).filter(models.Incident.id == item["id"]).first()
            if not existing:
                inc = models.Incident(**item)
                db.add(inc)
                db.flush()
                db.add(models.IncidentHistory(
                    incident_id=inc.id,
                    action="Incident Created",
                    description=f"Incident #{inc.id} registered for {inc.application} in {inc.environment}."
                ))
                db.add(models.IncidentHistory(
                    incident_id=inc.id,
                    action="AI Investigation Completed",
                    description=f"Autonomous triage identified root cause: {inc.root_cause}"
                ))
        db.commit()
    except Exception as e:
        db.rollback()
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    seed_demo_incidents()


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