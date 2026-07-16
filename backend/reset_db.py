import os
from sqlalchemy import create_engine, MetaData
from dotenv import load_dotenv
load_dotenv()
from app.database import Base
from app.models import *

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/antigravity")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
print("Database tables recreated successfully.")
