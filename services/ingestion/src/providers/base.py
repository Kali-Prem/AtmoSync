"""
Abstract Base Provider Interface for Data Ingestion in ATMOSYNC
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

class BaseProvider(ABC):
    """
    Standard interface that every external data connector must implement.
    Guarantees strict separation between network transport, validation,
    normalization, and persistence.
    """

    def __init__(self, name: str, base_url: str, timeout_seconds: int = 15, retries: int = 3):
        self.name = name
        self.base_url = base_url
        self.timeout_seconds = timeout_seconds
        self.retries = retries

    @abstractmethod
    def fetch(self, **kwargs) -> Any:
        """Fetches raw data payload from the external source or local staging."""
        pass

    @abstractmethod
    def validate(self, raw_data: Any) -> List[Dict[str, Any]]:
        """Applies DataQuality rules and returns list of validated records."""
        pass

    @abstractmethod
    def normalize(self, validated_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Maps provider-specific schemas and units to canonical system format."""
        pass

    @abstractmethod
    def store(self, normalized_records: List[Dict[str, Any]], db: Session) -> int:
        """Persists canonical records into database and returns count of committed rows."""
        pass

    def run(self, db: Session, **kwargs) -> Dict[str, Any]:
        """Executes full ingestion pipeline for this provider."""
        raw = self.fetch(**kwargs)
        valid = self.validate(raw)
        norm = self.normalize(valid)
        count = self.store(norm, db)
        return {
            "provider": self.name,
            "raw_records_fetched": len(raw) if isinstance(raw, list) else 1,
            "validated_records": len(valid),
            "stored_records": count
        }
