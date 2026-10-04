"""
Alerts & Regulatory GRAP Enforcement Router
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import Alert
from apps.api.src.schemas.alert import AlertRead

router = APIRouter(prefix="/alerts", tags=["Regulatory Alerts"])

@router.get("/active", response_model=List[AlertRead])
def get_active_alerts(db: Session = Depends(get_db)):
    """Retrieves all active GRAP and meteorological emergency alerts."""
    return db.query(Alert).filter(Alert.status == "ACTIVE").all()
