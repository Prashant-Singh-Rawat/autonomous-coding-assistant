<div align="center">

<img src="https://img.shields.io/badge/AI--Powered-Code%20Intelligence-blue?style=for-the-badge&logo=openai&logoColor=white" />
<img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white" />
<img src="https://img.shields.io/badge/FastAPI-0.104+-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
<img src="https://img.shields.io/badge/LangGraph-Multi--Agent-purple?style=for-the-badge&logo=chainlink&logoColor=white" />
<img src="https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql&logoColor=white" />
<img src="https://img.shields.io/badge/FAISS-Vector%20Search-orange?style=for-the-badge&logo=meta&logoColor=white" />
<img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
<img src="https://img.shields.io/badge/Deployed%20on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" />

# 🤖 Autonomous Coding Assistant

### *An elite multi-agent AI platform that ingests, analyses, and explains entire codebases*

[**🚀 Live Demo**](https://autonomous-coding-assistant.vercel.app) · [**📖 API Docs**](https://autonomous-coding-assistant-api.onrender.com/docs) · [**🐛 Report Bug**](https://github.com/Prashant-Singh-Rawat/autonomous-coding-assistant/issues) · [**💡 Request Feature**](https://github.com/Prashant-Singh-Rawat/autonomous-coding-assistant/issues)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [LangGraph Agent Workflow](#-langgraph-agent-workflow)
- [Request / Response Flow](#-request--response-flow)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Deployment](#-deployment-render--vercel)
- [Security](#-security)
- [Contributing](#-contributing)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 🌟 Overview

**Autonomous Coding Assistant** is a full-stack SaaS platform that transforms how developers understand code. Point it at any local project folder, and within seconds it:

1. **Ingests** all source files recursively (skipping `node_modules`, `.git`, etc.)
2. **Analyses** the codebase with specialized LangGraph AI agents
3. **Detects** security vulnerabilities, hardcoded secrets, and dangerous patterns
4. **Maps** the architecture — frameworks, services, and language breakdown
5. **Answers** any natural language question about the codebase with file-level citations

> 💡 Works **without** an OpenAI API key — the analysis agents fall back to pattern-based intelligence using real file data.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 📁 **Local Folder Ingestion** | Recursively scan any project directory on the backend machine |
| 🔗 **Remote URL Support** | Add GitHub/GitLab repositories by URL (cloning coming soon) |
| 🧠 **Multi-Agent Analysis** | Three specialized LangGraph agents run in sequence per query |
| 🔒 **Security Audit** | Regex-based scanning for 12+ vulnerability patterns with severity ratings |
| 🗺️ **Architecture Detection** | Auto-detect frameworks, services, databases, and language breakdown |
| 💬 **RAG Chat** | Ask questions in plain English, get answers with exact file citations |
| 📊 **Project Board** | Kanban-style task tracking with 13 label types |
| 🔐 **JWT Authentication** | Secure user accounts with bcrypt password hashing |
| 🛡️ **HMAC Integrity** | Vector stores are signed with HMAC-SHA256 to prevent tampering |
| 🚀 **One-command Deploy** | Docker Compose for local, Render + Vercel for production |

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                     AUTONOMOUS CODING ASSISTANT                         │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 FRONTEND (Next.js 15 / Vercel)                   │   │
│  │                                                                   │   │
│  │  Landing Page → Dashboard (Kanban + Repos) → Repo Detail Page    │   │
│  │  • Add Repo Modal (Local Folder / Remote URL)                     │   │
│  │  • Architecture / Security / Files tabs                           │   │
│  │  • Chat panel with quick prompts + citation badges                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                            │ HTTPS REST                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                  BACKEND (FastAPI / Render)                      │   │
│  │                                                                   │   │
│  │  /auth/*   →  JWT Authentication (signup/login)                  │   │
│  │  /repositories/*  →  CRUD + Background File Ingestion            │   │
│  │  /chat/{id}  →  LangGraph Pipeline Invocation                    │   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │           LANGGRAPH 4-NODE AGENT PIPELINE                │    │   │
│  │  │                                                           │    │   │
│  │  │  retrieve_context → analyze_architecture → security_audit │    │   │
│  │  │         ↓                    ↓                   ↓        │    │   │
│  │  │   FAISS search         File analysis        Regex scan    │    │   │
│  │  │                              ↓                            │    │   │
│  │  │                   synthesize_response                     │    │   │
│  │  │                   (GPT-4o-mini OR smart fallback)         │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                   │   │
│  │  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐   │   │
│  │  │ PostgreSQL   │  │ FAISS Vector    │  │ HMAC-SHA256      │   │   │
│  │  │ Users/Repos  │  │ Store (per repo)│  │ .integrity files │   │   │
│  │  │ Files/Reports│  │                 │  │                  │   │   │
│  │  └──────────────┘  └─────────────────┘  └──────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 LangGraph Agent Workflow

```mermaid
flowchart TD
    A([User Sends Chat Query]) --> B[Chat Router\nPOST /chat/repo_id]
    B --> C[Load Repository Files\nfrom PostgreSQL DB]
    C --> D[Build Initial GraphState\nfiles + query + repo_id]

    D --> E["🔍 Node: retrieve_context"]
    E --> F{FAISS Vector\nStore exists?}
    F -- Yes --> G[Semantic Search k=6\nsimilar code chunks]
    F -- No --> H[Return empty context]
    G --> I[Extract source citations\nfrom doc metadata]
    H --> I

    I --> J["🏗️ Node: analyze_architecture"]
    J --> K[Count files by language]
    K --> L[Detect frameworks from\nfile paths and names]
    L --> M[Identify services:\nDocker, PostgreSQL, Redis\nLangGraph, FAISS etc.]
    M --> N[Build structured\narchitecture report]

    N --> O["🔒 Node: security_audit"]
    O --> P[Scan each file content\nwith 12 regex patterns]
    P --> Q[Flag: hardcoded passwords\nAPI keys, pickle.load\neval/exec, shell=True\nSSL verify=False etc.]
    Q --> R[Assign severity:\ncritical / high / medium]
    R --> S[Build security report\nwith findings list]

    S --> T["✨ Node: synthesize_response"]
    T --> U{OpenAI API\nKey configured?}
    U -- Yes --> V[GPT-4o-mini with\nrich system prompt:\nfile list + reports\n+ FAISS context]
    U -- No --> W[Smart Fallback:\nAnswer from real file\ndata and reports]
    V --> X[Return reply + citations]
    W --> X

    X --> Y([Frontend renders response\n+ citation file badges])

    style A fill:#1e40af,color:#fff
    style Y fill:#065f46,color:#fff
    style E fill:#4c1d95,color:#fff
    style J fill:#1e3a5f,color:#fff
    style O fill:#7f1d1d,color:#fff
    style T fill:#064e3b,color:#fff
```

---

## 🌊 Request / Response Flow

```mermaid
sequenceDiagram
    participant U as User Browser
    participant FE as Next.js Frontend
    participant BE as FastAPI Backend
    participant DB as PostgreSQL
    participant LG as LangGraph
    participant VS as FAISS Store

    Note over U,VS: Repository Ingestion
    U->>FE: Add Repository (name + local_path)
    FE->>BE: POST /repositories/
    BE->>DB: INSERT Repository status=processing
    BE->>FE: 201 Created
    BE->>BE: Background Task
    BE->>BE: scan_local_directory()
    BE->>DB: INSERT RepositoryFile x N
    BE->>VS: create_vector_store() + HMAC sign
    BE->>DB: INSERT Reports + UPDATE status=completed

    Note over U,VS: Chat Analysis
    U->>FE: Type question and Send
    FE->>BE: POST /chat/repo_id + JWT token
    BE->>DB: Verify ownership + load files
    BE->>LG: invoke GraphState
    LG->>VS: similarity_search query k=6
    VS->>LG: Documents with citations
    LG->>LG: analyze_architecture
    LG->>LG: security_audit
    LG->>LG: synthesize_response
    LG->>BE: reply + citations
    BE->>FE: ChatResponse
    FE->>U: Response + citation badges
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 15 App Router | React framework with SSR |
| TypeScript | 5+ | Type safety |
| Tailwind CSS | 3 | Utility-first styling |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| FastAPI | 0.104+ | High-performance REST API |
| SQLAlchemy | 2.0+ | ORM with session management |
| Alembic | 1.12+ | Database schema migrations |
| Pydantic | 2.4+ | Request/response validation |
| python-jose | 3.3+ | JWT token creation & verification |
| passlib[bcrypt] | 1.7+ | Secure password hashing |

### AI / ML
| Technology | Version | Purpose |
|-----------|---------|---------|
| LangGraph | 0.0.10+ | Multi-agent state machine orchestration |
| LangChain | 0.1+ | LLM abstraction and tool integration |
| langchain-openai | 0.0.2+ | GPT-4o-mini integration |
| FAISS CPU | 1.7+ | Semantic vector similarity search |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| PostgreSQL 15 | Primary relational database |
| Docker Compose | Local containerised development |
| Render | Backend API + Database hosting |
| Vercel | Frontend hosting with CDN |

---

## 📁 Project Structure

```
autonomous-coding-assistant/
│
├── README.md                       ← This file
├── CONTRIBUTING.md                 ← Open issues + contribution guide
├── ARCHITECTURE.md                 ← Detailed architecture notes
├── docker-compose.yml              ← Local dev: db + backend + frontend
├── render.yaml                     ← Render deployment blueprint
├── .env.example                    ← Environment variable template
│
├── backend/
│   ├── Dockerfile                  ← Python 3.11-slim container
│   ├── requirements.txt            ← Python dependencies
│   ├── alembic.ini                 ← Database migration config
│   ├── alembic/
│   │   ├── env.py                  ← Alembic environment
│   │   └── versions/               ← Migration history
│   └── app/
│       ├── main.py                 ← FastAPI app entry point + CORS
│       ├── database.py             ← SQLAlchemy engine + SessionLocal
│       ├── models.py               ← User, Repository, RepositoryFile, Report
│       ├── schemas.py              ← Pydantic request/response schemas
│       ├── auth.py                 ← JWT creation + bcrypt utilities
│       ├── ingestion.py            ← File ingestion helpers
│       ├── vectorstore.py          ← FAISS build/load + HMAC signing
│       ├── agents/
│       │   ├── state.py            ← GraphState TypedDict
│       │   └── graph.py            ← 4-node LangGraph pipeline
│       └── routers/
│           ├── auth.py             ← POST /auth/signup, /auth/login
│           ├── repositories.py     ← Full CRUD + file scan + /files endpoint
│           └── chat.py             ← POST /chat/{repo_id} → LangGraph
│
└── frontend/
    ├── Dockerfile                  ← Node 20-alpine container
    ├── package.json
    ├── next.config.ts
    └── src/app/
        ├── layout.tsx              ← Root layout
        ├── page.tsx                ← Landing page
        ├── dashboard/
        │   └── page.tsx            ← Kanban + repos + Add Repo modal
        └── repo/[id]/
            └── page.tsx            ← Reports + files browser + real chat
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Python 3.11+](https://www.python.org/)
- [Docker + Docker Compose](https://docs.docker.com/get-docker/)
- OpenAI API Key *(optional — works without it)*

---

### Local Development (Docker) — Recommended

```bash
# 1. Clone
git clone https://github.com/Prashant-Singh-Rawat/autonomous-coding-assistant.git
cd autonomous-coding-assistant

# 2. Create environment file
cp .env.example .env
# Edit .env and set SECRET_KEY (required) and OPENAI_API_KEY (optional)

# 3. Start everything
docker-compose up --build

# 4. Open in browser
# Frontend  → http://localhost:3000
# API Docs  → http://localhost:8000/docs
```

---

### Local Development (Manual)

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

export DATABASE_URL="postgresql://user:password@localhost:5432/antigravity"
export SECRET_KEY="your-32-char-secret"
export OPENAI_API_KEY="sk-..."   # optional

alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

---

## 🔐 Environment Variables

### Backend (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `SECRET_KEY` | ✅ Yes | JWT signing secret (min 32 chars). Generate: `openssl rand -hex 32` |
| `OPENAI_API_KEY` | ❌ Optional | Enables GPT-4o-mini. Without it, smart fallback answers using real file data |

### Frontend (`.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ❌ Optional | Backend URL. Defaults to `http://localhost:8000` |

---

## 📡 API Reference

### Authentication
```
POST /auth/signup     Register new user
POST /auth/login      Login → JWT token
```

### Repositories
```
POST   /repositories/              Create + start background ingestion
GET    /repositories/              List all repos for current user
GET    /repositories/{id}          Get repository details
GET    /repositories/{id}/files    List ingested files (path, language, size)
GET    /repositories/{id}/reports  Get architecture + security reports
```

### Chat
```
POST   /chat/{repo_id}             Ask a question about the codebase
```

**Request:**
```json
{ "query": "What frameworks does this project use?" }
```

**Response:**
```json
{
  "reply": "This project uses FastAPI for the backend REST API...",
  "citations": ["backend/app/main.py", "backend/requirements.txt"]
}
```

> 🔑 All endpoints except `/auth/*` require: `Authorization: Bearer <jwt_token>`

Full interactive docs: **http://localhost:8000/docs**

---

## ☁️ Deployment (Render + Vercel)

### Backend → Render (automatic via `render.yaml`)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → **New** → **Blueprint**
3. Select your repository — Render reads `render.yaml` automatically
4. Add `OPENAI_API_KEY` in the Render dashboard environment variables
5. Click **Apply** — backend + database deploy automatically

### Frontend → Vercel

```bash
npm i -g vercel
cd frontend
vercel
```

Then in the Vercel dashboard, add:
```
NEXT_PUBLIC_API_URL = https://your-service-name.onrender.com
```

---

## 🔒 Security

| Threat | Mitigation |
|--------|-----------|
| JWT forgery | HMAC-SHA256 signed tokens with expiry |
| Pickle deserialization attack | FAISS stores verified with HMAC-SHA256 `.integrity` file before loading |
| Path traversal via repo ID | UUID format validated with regex before any DB/filesystem access |
| Hardcoded secrets in repos | Regex scanner covers 12 patterns: passwords, API keys, `eval()`, `pickle.load`, `shell=True`, etc. |
| SQL injection | SQLAlchemy ORM with parameterised queries throughout |
| CORS abuse | Configurable allowed origins (restrict in production) |
| Brute force | Bcrypt password hashing with high cost factor |

**Production checklist:**
```bash
# Restrict CORS origins in backend/app/main.py
allow_origins=["https://your-frontend.vercel.app"]

# Never commit .env files (already in .gitignore)

# Generate a strong SECRET_KEY
openssl rand -hex 32
```

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for open issues and guidelines.

```bash
# Fork → Clone → Branch → Commit → PR

git checkout -b feat/your-feature
# Use conventional commits: feat:, fix:, docs:, refactor:, chore:
git push origin feat/your-feature
# Open a Pull Request on GitHub
```

---

## 🗺️ Roadmap

- [x] Local folder ingestion with recursive file scanning
- [x] 4-node LangGraph pipeline (retrieve → architecture → security → synthesise)
- [x] HMAC-SHA256 integrity signing for FAISS vector stores
- [x] Security audit with 12+ regex patterns and severity levels
- [x] Smart fallback analysis (works without OpenAI API key)
- [x] Source file citations in chat responses
- [x] Kanban project board with 13 task label types
- [x] Add Repository modal with Local Folder / Remote URL modes
- [ ] Real-time streaming chat (Server-Sent Events)
- [ ] GitHub OAuth login
- [ ] HuggingFace offline embeddings fallback
- [ ] GitHub App for private repository cloning
- [ ] Multi-repository cross-codebase analysis
- [ ] Export analysis reports to PDF
- [ ] VS Code extension

---

## 📄 License

This project is licensed under the **MIT License**.

---

<div align="center">

**Built with ❤️ by [Prashant Singh Rawat](https://github.com/Prashant-Singh-Rawat)**

*If this project helped you, please ⭐ star the repository!*

[![GitHub stars](https://img.shields.io/github/stars/Prashant-Singh-Rawat/autonomous-coding-assistant?style=social)](https://github.com/Prashant-Singh-Rawat/autonomous-coding-assistant)

</div>
