from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, repositories, chat, integrations, workspace, webhooks, enterprise, github, repository, health, pull_requests, agents
from app.database import Base, engine

# Create tables for MVP instead of waiting for alembic run
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Autonomous Coding Assistant API",
    description="API for multi-agent repository intelligence and code review",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev only, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(repositories.router)
app.include_router(repositories.settings_router)
app.include_router(chat.router)
app.include_router(integrations.router)
app.include_router(workspace.router)
app.include_router(webhooks.router)
app.include_router(enterprise.router)
app.include_router(github.router)
app.include_router(repository.router)
app.include_router(health.router)
app.include_router(pull_requests.router)
app.include_router(agents.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Autonomous Coding Assistant API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
