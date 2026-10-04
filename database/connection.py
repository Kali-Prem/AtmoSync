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
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite needs connect_args check_same_thread=False
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_database() -> None:
    """Creates all tables if they do not already exist."""
    Base.metadata.create_all(bind=engine)

def get_db() -> Generator[Session, None, None]:
    """Dependency for FastAPI route handlers and workers."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
