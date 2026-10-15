# 🤖 AI Incident Investigator

An AI-powered incident investigation platform for SRE and DevOps teams. Automatically investigates production incidents, finds similar past issues using ML, and suggests verified fixes — all powered by Google Gemini.

## ✨ Features

- **AI Investigation** — Gemini AI automatically identifies root cause, severity, explanation, and suggested fix for every incident
- **RAG-Enhanced Analysis** — Retrieval-Augmented Generation injects your own organization's past resolved incidents into the AI prompt for more accurate, context-aware answers
- **Similar Incident Search** — ML embeddings (Gemini embedding model) find past incidents similar to the current one with cosine similarity scores
- **ML Category Detection** — Automatically classifies incidents (Database, Network, Auth, Timeout, etc.)
- **Analytics Dashboard** — Resolution rate, top broken apps, critical count, ML-detected patterns
- **User Authentication** — JWT-based login/register with cookie-synced sessions
- **Incident Management** — Create, filter, search, and update incident statuses

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS |
| **Backend** | FastAPI (Python), SQLAlchemy ORM |
| **Database** | PostgreSQL |
| **AI / ML** | Google Gemini (`gemini-2.0-flash`, `gemini-embedding-exp-03-07`) |
| **Auth** | JWT (`python-jose`), bcrypt |

## 📁 Project Structure

```
AI-Incident-Investigator/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── database.py          # PostgreSQL connection
│   │   ├── models.py            # SQLAlchemy models (with ML columns)
│   │   ├── auth.py              # JWT + bcrypt helpers
│   │   ├── routers/
│   │   │   ├── incidents.py     # Incident CRUD + AI investigate + /similar
│   │   │   ├── analytics.py     # ML analytics endpoints
│   │   │   └── auth.py          # Register / Login
│   │   ├── services/
│   │   │   ├── ai_service.py    # Gemini AI + RAG prompt builder
│   │   │   └── ml_service.py    # Embeddings, cosine similarity, categories
│   │   └── schemas/             # Pydantic request/response schemas
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx             # Dashboard with analytics bar
    │   ├── login/page.tsx
    │   ├── register/page.tsx
    │   ├── profile/page.tsx
    │   └── incidents/
    │       ├── new/page.tsx     # Create incident
    │       └── [id]/page.tsx    # Incident detail + similar incidents widget
    └── services/
        └── api.ts               # Typed API client
```

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL
- Google Gemini API key

### 1. Clone the repository
```bash
git clone https://github.com/vedantsunilkhairkar/AI-Incident-Investigator.git
cd AI-Incident-Investigator
```

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
# or: source .venv/bin/activate  # Mac/Linux

pip install -r requirements.txt
```

Create `backend/.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/incident_db
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET_KEY=your_secret_key_here
```

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Login (username or email) |
| `GET` | `/incidents` | List incidents |
| `POST` | `/incidents` | Create incident + generate embedding |
| `POST` | `/incidents/{id}/investigate` | Trigger AI investigation (RAG) |
| `GET` | `/incidents/{id}/similar` | ML similar incidents search |
| `GET` | `/analytics/summary` | Summary stats for dashboard |
| `GET` | `/analytics/top-apps` | Most broken apps |
| `GET` | `/analytics/categories` | ML category breakdown |

## 🧠 How ML Works

1. **On incident creation** → Gemini generates a 768-dim embedding of the error + description, and predicts the category
2. **On AI investigation** → The system searches past resolved incidents by cosine similarity, injects the top matches into the Gemini prompt (RAG), resulting in more accurate suggestions informed by your org's actual fixes
3. **Similar incidents widget** → Shows historical matches with similarity % score and expandable verified fix cards

## 📸 Screenshots

> Dashboard with ML Insights bar, Similar Past Incidents widget, and RAG-enhanced AI investigation

## 📄 License

MIT

---

Built with ❤️ using Google Gemini AI
