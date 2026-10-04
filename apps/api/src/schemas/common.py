"""
Common Pydantic Schemas for ATMOSYNC API
"""
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")

class HealthResponse(BaseModel):
    status: str = Field("healthy", description="Service health state")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    app_name: str
    version: str
    environment: str
    database: Dict[str, Any]
    active_providers: Dict[str, str]

class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[T] = None
    meta: Optional[Dict[str, Any]] = None
