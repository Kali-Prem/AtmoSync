"""
Fire Event and Alert Pydantic Schemas
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class FireEventRead(BaseModel):
    id: int
    source: str
    latitude: float
    longitude: float
    acq_time: datetime
    frp_mw: float
    brightness_temp_k: Optional[float] = None
    confidence: Optional[str] = None
    daynight: Optional[str] = "D"
    state: str = "Punjab"

    class Config:
        from_attributes = True

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
