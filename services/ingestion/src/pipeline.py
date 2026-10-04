"""
Master Ingestion Pipeline Coordinator for ATMOSYNC
"""
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from services.ingestion.src.providers.weather_open_meteo import OpenMeteoWeatherProvider
from services.ingestion.src.providers.aq_openaq import OpenAqAirQualityProvider
from services.ingestion.src.providers.fire_nasa_firms import NasaFirmsFireProvider
from services.ingestion.src.providers.chemical_cams import CamsChemicalProvider

logger = logging.getLogger("vayudrishti.ingestion")

class IngestionPipeline:
    """Orchestrates multi-source verified data ingestion into the database."""

    def __init__(self):
        self.weather_provider = OpenMeteoWeatherProvider()
        self.aq_provider = OpenAqAirQualityProvider()
        self.fire_provider = NasaFirmsFireProvider()
        self.cams_provider = CamsChemicalProvider()

    def ingest_weather(self, db: Session, latitude: float = 28.6139, longitude: float = 77.2090, location_id: Optional[str] = None) -> Dict[str, Any]:
        """Ingests live meteorological fields."""
        logger.info(f"Ingesting weather for ({latitude}, {longitude})...")
        try:
            raw = self.weather_provider.fetch(latitude=latitude, longitude=longitude)
            valid = self.weather_provider.validate(raw)
            norm = self.weather_provider.normalize(valid)
            stored = self.weather_provider.store(norm, db, location_id=location_id)
            return {"status": "SUCCESS", "records_stored": stored}
        except Exception as e:
            logger.error(f"Weather ingestion failed: {str(e)}")
            return {"status": "FAILED", "error": str(e)}

    def ingest_air_quality(self, db: Session, station_id: str = "stn_dl_anand_vihar") -> Dict[str, Any]:
        """Ingests live air quality observations."""
        logger.info(f"Ingesting air quality for station {station_id}...")
        try:
            raw = self.aq_provider.fetch(station_id=station_id)
            valid = self.aq_provider.validate(raw)
            norm = self.aq_provider.normalize(valid)
            stored = self.aq_provider.store(norm, db)
            return {"status": "SUCCESS", "records_stored": stored}
        except Exception as e:
            logger.error(f"Air quality ingestion failed: {str(e)}")
            return {"status": "FAILED", "error": str(e)}

    def ingest_fires(self, db: Session, days: int = 1) -> Dict[str, Any]:
        """Ingests satellite active fire hotspots."""
        logger.info(f"Ingesting satellite fire hotspots for past {days} days...")
        try:
            raw = self.fire_provider.fetch(days=days)
            valid = self.fire_provider.validate(raw)
            norm = self.fire_provider.normalize(valid)
            stored = self.fire_provider.store(norm, db)
            return {"status": "SUCCESS", "records_stored": stored}
        except Exception as e:
            logger.error(f"Fire ingestion failed: {str(e)}")
            return {"status": "FAILED", "error": str(e)}

    def run_all(self, db: Session) -> Dict[str, Any]:
        """Runs complete ingestion cycle."""
        w_res = self.ingest_weather(db)
        aq_res = self.ingest_air_quality(db)
        f_res = self.ingest_fires(db)
        return {
            "weather": w_res,
            "air_quality": aq_res,
            "fires": f_res
        }
