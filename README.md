# Autonomous Coding Assistant

An elite cross-functional multi-agent repository intelligence platform. This SaaS product ingests code repositories, orchestrates AI agents using LangGraph to analyze the code, and provides a beautiful dashboard for insights, security audits, and RAG-powered codebase chats.

## Architecture Highlights
- **Frontend**: Next.js App Router, Tailwind CSS, TypeScript
- **Backend**: FastAPI, SQLAlchemy (PostgreSQL)
- **AI Orchestration**: LangGraph, LangChain
- **Vector DB**: FAISS (for codebase semantic retrieval)
- **Deployment**: Docker Compose

## Quickstart

### Prerequisites
- Docker & Docker Compose
- OpenAI API Key (or other LLM provider config)

### Running Locally

1. Create a `.env` file in the **project root** (same directory as `docker-compose.yml`):
   ```env
   DATABASE_URL=postgresql://user:password@db:5432/antigravity
   SECRET_KEY=your_super_secret_jwt_key   # generate with: openssl rand -hex 32
   OPENAI_API_KEY=your_openai_api_key_here
   ```
   > ⚠️ Never commit this file. It is already in `.gitignore`.

2. Start the services using Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - **Frontend**: http://localhost:3000
   - **Backend API Docs**: http://localhost:8000/docs
   - **Database**: `localhost:5432`

## Features
- **Repository Ingestion**: Scans files and builds a semantic vector space representation.
- **Agentic Analysis**: Uses LangGraph to orchestrate Specialized Agents (Architecture, Security, Mentorship) over the codebase.
- **RAG Chat**: Ask natural language questions about the repository and get answers with exact file citations.
- **Audit Reports**: Automatic generation of Security and Performance scorecards.

## Folder Structure
- `/frontend`: Next.js web application.
- `/backend`: FastAPI service, containing `app/agents` for LangGraph logic.
- `docker-compose.yml`: Local infrastructure orchestrator.

## Security & Limitations
This MVP simulates the git ingestion by providing dummy files unless the GitHub integration is fully fleshed out. Production deployment requires proper JWT signing keys, restricted CORS headers, and secure handling of API keys.
