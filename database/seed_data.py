"""
Seed utility to populate official Delhi NCR monitoring stations and regions.
"""
import json
import os
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.orm import Session
from database.connection import SessionLocal, init_database
from database.models import Location, MonitoringStation

SEEDS_DIR = Path(__file__).parent / "seeds"

def ensure_columns_exist(db: Session) -> None:
    """Ensures newly added columns exist in existing SQLite or PostgreSQL tables."""
    try:
        bind = db.get_bind()
        dialect = bind.dialect.name
        if dialect == "sqlite":
            result = db.execute(text("PRAGMA table_info(monitoring_stations)")).fetchall()
            col_names = [r[1] for r in result]
            if "is_default_anchor" not in col_names:
                db.execute(text("ALTER TABLE monitoring_stations ADD COLUMN is_default_anchor BOOLEAN DEFAULT 0"))
                db.commit()
        else:
            db.execute(text("ALTER TABLE monitoring_stations ADD COLUMN IF NOT EXISTS is_default_anchor BOOLEAN DEFAULT FALSE"))
            db.commit()
    except Exception:
        db.rollback()

def seed_monitoring_stations(db: Session) -> int:
    """Loads verified Delhi NCR monitoring stations from seed JSON."""
    seed_file = SEEDS_DIR / "001_delhi_stations.json"
    if not seed_file.exists():
        raise FileNotFoundError(f"Seed file not found: {seed_file}")

    # Ensure schema exists before querying or inserting
    init_database(bind_engine=db.get_bind())
    ensure_columns_exist(db)

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

    # Now insert or update stations
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
                is_default_anchor=s.get("is_default_anchor", False),
                extra_metadata=s.get("metadata", {})
            )
            db.add(station)
            inserted_count += 1
        else:
            existing.name = s["name"]
            existing.latitude = s["latitude"]
            existing.longitude = s["longitude"]
            existing.elevation_m = s.get("elevation_m", 215.0)
            existing.is_default_anchor = s.get("is_default_anchor", False)
            meta = existing.extra_metadata or {}
            meta.update(s.get("metadata", {}))
            existing.extra_metadata = meta

    db.commit()
    return inserted_count

if __name__ == "__main__":
    init_database()
    with SessionLocal() as session:
        count = seed_monitoring_stations(session)
        print(f"Successfully seeded {count} monitoring stations.")
