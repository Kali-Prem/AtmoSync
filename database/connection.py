"""
Database connection and session factory for ATMOSYNC
Supports PostgreSQL / TimescaleDB and SQLite (fallback / tests).
"""
import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from database.models import Base

# Read database URL from environment or fallback to SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/vayudrishti.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# SQLite needs connect_args check_same_thread=False and parent dir existence
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite:///"):
        sqlite_file = DATABASE_URL.replace("sqlite:///", "", 1)
        if sqlite_file and sqlite_file != ":memory:":
            db_dir = os.path.dirname(os.path.abspath(sqlite_file))
            if db_dir:
                os.makedirs(db_dir, exist_ok=True)

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_database(bind_engine=None) -> None:
    """Creates all tables if they do not already exist."""
    target_engine = bind_engine or engine
    Base.metadata.create_all(bind=target_engine)

def get_db() -> Generator[Session, None, None]:
    """Dependency for FastAPI route handlers and workers."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
