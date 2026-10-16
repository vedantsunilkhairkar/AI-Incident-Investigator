# 🤖 AI Incident Investigator — Autonomous DevOps & SRE Copilot

[![CI/CD Pipeline](https://github.com/vedantsunilkhairkar/AI-Incident-Investigator/actions/workflows/ci.yml/badge.svg)](https://github.com/vedantsunilkhairkar/AI-Incident-Investigator/actions/workflows/ci.yml)
[![Docker Support](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![Kubernetes Ready](https://img.shields.io/badge/Kubernetes-Manifests-326CE5?logo=kubernetes&logoColor=white)](k8s/)
[![Next.js 16](https://img.shields.io/badge/Frontend-Next.js%2016-black?logo=next.js)](frontend/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](backend/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini%20Flash%20Lite-4285F4?logo=google&logoColor=white)](backend/app/services/)

An enterprise-grade **Autonomous SRE & DevOps Incident Copilot** built for high-velocity engineering teams. Powered by **Google Gemini** and **Vector RAG Embeddings**, it analyzes production outages across **Kubernetes, Docker, AWS, Terraform, NGINX, and CI/CD pipelines**, executes autonomous multi-step diagnostic probes (ReAct Engine), simulates remediation in a safe terminal sandbox, and generates full SRE post-mortems with one click.

---

## ⚡ Core Capabilities

- **Autonomous SRE Agent (ReAct OODA Loop)**: Multi-step diagnostic engine (`Telemetry Mining` ➔ `Diagnostic Tool Probe` ➔ `Metrics Correlation` ➔ `Blast-Radius Safety Audit`).
- **Interactive Terminal Sandbox**: Execute diagnostic & remediation CLI commands in an interactive browser terminal with safety guardrails against destructive operations (`rm -rf`, `DROP TABLE`).
- **Failure Topology Mapping (Generative AI)**: Visual graph showing user ingress, upstream proxies, and the failing microservice highlighted with animated hazard alerts.
- **RAG-Enhanced Investigation**: Retrieves internal resolved incidents with cosine similarity matching (`gemini-embedding-001`) to ground fixes in past post-mortems.
- **Interactive SRE Copilot Chat**: Floating slide-over AI assistant to ask real-time questions during live outages (*"What is the blast radius?", "Give me a rollback command"*).
- **1-Click Markdown Post-Mortem Export**: Generates industry-standard SRE post-mortems ready for Jira, Notion, or Slack.
- **DevOps Incident Presets**: One-click simulators for K8s OOMKilled, Terraform DynamoDB state lock, NGINX 502 Bad Gateway, and GitHub Actions build failures.

---

## 🛠️ Architecture & Tech Stack

```
                          ┌──────────────────────────┐
                          │   Next.js 16 Frontend    │
                          │   (Tailwind, React 19)   │
                          └────────────┬─────────────┘
                                       │ HTTP / REST
                                       ▼
                          ┌──────────────────────────┐
                          │     FastAPI Backend      │
                          │ (Python 3.12, Uvicorn)   │
                          └──────┬────────────┬──────┘
                                 │            │
            ┌────────────────────┘            └────────────────────┐
            ▼                                                      ▼
┌──────────────────────────┐                              ┌─────────────────┐
│     PostgreSQL 16        │                              │  Google Gemini  │
│ (Embeddings & Telemetry) │                              │ (SRE & Vectors) │
└──────────────────────────┘                              └─────────────────┘
```

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| **Backend** | FastAPI (Python 3.12), SQLAlchemy, Pydantic v2, Uvicorn |
| **Database** | PostgreSQL 16 (with JSON vector storage) |
| **AI / Copilot** | Google Gemini 3.5 Flash Lite (`gemini-embedding-001` for RAG) |
| **DevOps / CI-CD** | Docker (Multi-stage), Docker Compose, Kubernetes manifests, GitHub Actions |

---

## 🚀 Deployment Options

### Option 1: 1-Click Free Cloud Deployment (Recommended for Resumes)

#### 1. Deploy Backend & Database on Render:
1. Fork or push this repository to your GitHub account: `https://github.com/vedantsunilkhairkar/AI-Incident-Investigator`.
2. Sign up at [Render.com](https://render.com) using your GitHub account.
3. Click **"New +"** ➔ **"Blueprint"** ➔ Select your repository.
4. Render automatically reads `render.yaml` and spins up:
   - Managed **PostgreSQL Database**
   - **FastAPI Backend Web Service**
5. Add your `GEMINI_API_KEY` in the Environment tab.
6. Copy your live backend URL (e.g. `https://ai-incident-backend.onrender.com`).

#### 2. Deploy Frontend on Vercel:
1. Sign up at [Vercel.com](https://vercel.com) using GitHub.
2. Click **"Add New Project"** ➔ Select `AI-Incident-Investigator`.
3. Set **Root Directory** to `frontend`.
4. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL` = `https://your-backend-name.onrender.com`
5. Click **"Deploy"** — your live public demo URL is ready in 60 seconds!

---

### Option 2: Docker Compose (Single Command Local / VPS / AWS EC2)

Run the entire multi-service stack (Frontend + Backend + PostgreSQL) with a single command:

```bash
# Clone the repository
git clone https://github.com/vedantsunilkhairkar/AI-Incident-Investigator.git
cd AI-Incident-Investigator

# Provide your Gemini API Key in .env
echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env

# Spin up all 3 containers
docker compose up -d --build
```

Access the stack:
- **Frontend App:** [http://localhost:3000](http://localhost:3000)
- **FastAPI API & Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL:** Port `5432`

---

### Option 3: Kubernetes Cluster Deployment (`k8s/`)

Deploy to any Kubernetes cluster (Minikube, Kind, AWS EKS, or GKE):

```bash
# 1. Create namespace & secrets
kubectl create namespace incident-investigator
kubectl create secret generic incident-secrets \
  --from-literal=DB_PASSWORD=yourdbpassword \
  --from-literal=SECRET_KEY=supersecretjwtkey \
  --from-literal=GEMINI_API_KEY=your_gemini_api_key \
  -n incident-investigator

# 2. Apply manifests
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend-ingress.yaml

# 3. Check status
kubectl get pods -n incident-investigator
```

---

## 💻 Local Development Setup

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run server with hot reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Security & Best Practices
- Non-root user execution inside Docker containers (`appuser` UID 10001, `nextjs` UID 1001).
- Healthcheck probes on all containers (`/` and `pg_isready`).
- Automated multi-stage builds reducing image attack surfaces and sizes by ~80%.
- Strict JWT authentication with bcrypt hashing.

---

## 📜 License
MIT © 2026 Vedant Khairkar
