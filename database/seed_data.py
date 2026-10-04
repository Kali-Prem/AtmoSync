"""
Seed utility to populate official Delhi NCR monitoring stations and regions.
"""
import json
import os
from pathlib import Path
from sqlalchemy.orm import Session
from database.connection import SessionLocal, init_database
from database.models import Location, MonitoringStation

SEEDS_DIR = Path(__file__).parent / "seeds"

def seed_monitoring_stations(db: Session) -> int:
    """Loads verified Delhi NCR monitoring stations from seed JSON."""
    seed_file = SEEDS_DIR / "001_delhi_stations.json"
    if not seed_file.exists():
        raise FileNotFoundError(f"Seed file not found: {seed_file}")

    with open(seed_file, "r", encoding="utf-8") as f:
        stations_data = json.load(f)

    # First ensure default locations exist for each region
    regions = set(item["region"] for item in stations_data)
    for region in regions:
        loc_id = f"loc_{region.lower().replace('-', '_')}"
        existing_loc = db.query(Location).filter(Location.id == loc_id).first()
        if not existing_loc:
            # Approximate center coordinates for region
            sample = next(s for s in stations_data if s["region"] == region)
            db.add(Location(
                id=loc_id,
                name=f"{region} Region",
                region=region,
                latitude=sample["latitude"],
                longitude=sample["longitude"],
                extra_metadata={"seeded": True}
            ))
    db.commit()

    # Now insert stations
    inserted_count = 0
    for s in stations_data:
        stn_id = f"stn_{s['station_code'].lower()}"
        loc_id = f"loc_{s['region'].lower().replace('-', '_')}"
        
        existing = db.query(MonitoringStation).filter(MonitoringStation.id == stn_id).first()
        if not existing:
            station = MonitoringStation(
                id=stn_id,
                station_code=s["station_code"],
                name=s["name"],
                location_id=loc_id,
                latitude=s["latitude"],
                longitude=s["longitude"],
                provider=s.get("provider", "CPCB"),
                status="ACTIVE",
                elevation_m=s.get("elevation_m", 215.0),
                extra_metadata=s.get("metadata", {})
            )
            db.add(station)
            inserted_count += 1

    db.commit()
    return inserted_count

if __name__ == "__main__":
    init_database()
    with SessionLocal() as session:
        count = seed_monitoring_stations(session)
        print(f"Successfully seeded {count} monitoring stations.")
