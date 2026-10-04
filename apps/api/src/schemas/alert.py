"""
Alert Pydantic Schemas
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel

class AlertRead(BaseModel):
    id: str
    type: str
    severity: str
    location_id: Optional[str] = None
    triggered_at: datetime
    message: str
    status: str
    extra_metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
