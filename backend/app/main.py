from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, repositories, chat

app = FastAPI(
    title="Autonomous Coding Assistant API",
    description="API for multi-agent repository intelligence and code review",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(repositories.router)
app.include_router(chat.router)

@app.on_event("startup")
async def startup():
    from app.database import Base, engine
    Base.metadata.create_all(bind=engine)
    from app.config import settings
    if settings.jwt_secret_key == settings.vector_store_hmac_key:
        raise RuntimeError(
            "JWT_SECRET_KEY and VECTOR_STORE_HMAC_KEY must be different. "
            "Using the same key for both violates key separation."
        )

@app.get("/")
def read_root():
    return {"message": "Welcome to the Autonomous Coding Assistant API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
