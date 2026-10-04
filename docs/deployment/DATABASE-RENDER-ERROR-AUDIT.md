# Database Render Error Audit — ATMOSYNC (SIH-26082)

**Project:** ATMOSYNC — Air Pollution–Weather Coupled Forecasting System for Delhi NCR  
**SIH Problem Statement:** SIH-26082  
**Audit Date:** 2026-10-04  
**Status:** Audit Completed & Root Cause Verified  

---

## 1. Original Error Analysis

The initial deployment on Render failed with the following traceback and exception:

```text
sqlalchemy.exc.OperationalError:
(sqlite3.OperationalError) no such table: locations
```

The failing query was:

```sql
SELECT locations.id AS locations_id, locations.name AS locations_name, locations.region AS locations_region, locations.latitude AS locations_latitude, locations.longitude AS locations_longitude, locations.extra_metadata AS locations_extra_metadata, locations.created_at AS locations_created_at 
FROM locations 
WHERE locations.id = ?
 LIMIT ? OFFSET ?
```

Parameters passed: `('loc_delhi_east', 1, 0)`

---

## 2. Repository Database Audit Findings

```text
Database engine:                     SQLite (default fallback / Render free tier) / PostgreSQL 16 + TimescaleDB (production supported)
Database URL source:                 os.getenv("DATABASE_URL", "sqlite:///./data/vayudrishti.db") via database/connection.py & apps/api/src/core/config.py
Migration system:                    SQLAlchemy DeclarativeBase metadata DDL (`Base.metadata.create_all(bind=engine)`) via database/connection.py:init_database(), with static reference DDL in database/migrations/001_initial_schema.sql
Migration directory:                 database/migrations/ (contains 001_initial_schema.sql)
locations model:                     class Location(Base) in database/models.py (table: locations, PK: id VARCHAR(64))
locations table creation mechanism:  Base.metadata.create_all(bind=engine) invoked by init_database()
Seed mechanism:                      seed_monitoring_stations(db) in database/seed_data.py reading verified CAAQMS stations from database/seeds/001_delhi_stations.json
Startup initialization:              apps/api/src/main.py:lifespan() calls init_database() on FastAPI startup
Render database configuration:       render.yaml: type: web, name: atmosync-api, DATABASE_URL=sqlite:///./data/vayudrishti.db
```

---

## 3. Root Cause Determination

The audit evaluated the possible causes:

```text
[ ] A. migrations were never executed
[X] B. migrations exist but Render does not execute them
[X] C. database points to a new empty SQLite file
[ ] D. application is using the wrong DATABASE_URL
[X] E. table creation exists but is never called
[X] F. seed/init code assumes tables already exist
[ ] G. Render filesystem/database configuration is incorrect
[ ] H. another actual cause discovered during audit
```

### Verified Cause:

1. **Empty Database on Render (C):**  
   The SQLite database file `data/vayudrishti.db` is matched by `*.db` in `.gitignore` (line 72). Consequently, when Render clones the Git repository into the build environment, no database file exists.

2. **Flawed Render Build Command (B & E):**  
   In `render.yaml`, the backend service had:
   ```yaml
   buildCommand: "pip install --upgrade pip && pip install -r apps/api/requirements.txt && python scripts/cli.py db seed"
   ```
   Render executed `python scripts/cli.py db seed` without first running `python scripts/cli.py db init`.

3. **Missing Pre-condition in Seed Code (F):**  
   In `scripts/cli.py`, `cmd_db_seed()` was defined as:
   ```python
   def cmd_db_seed(args):
       logger.info("Seeding verified Delhi NCR monitoring stations...")
       with SessionLocal() as db:
           count = seed_monitoring_stations(db)
           logger.info(f"Successfully seeded {count} stations.")
   ```
   `cmd_db_seed()` did not call `init_database()`.  
   Inside `database/seed_data.py`:
   ```python
   def seed_monitoring_stations(db: Session) -> int:
       ...
       for region in regions:
           loc_id = f"loc_{region.lower().replace('-', '_')}"
           existing_loc = db.query(Location).filter(Location.id == loc_id).first()
   ```
   On line 26, `db.query(Location).filter(Location.id == loc_id).first()` was executed before the `locations` table was created. SQLite connected to the fresh, empty database and raised:
   ```text
   sqlite3.OperationalError: no such table: locations
   ```
   This crashed the Render build command immediately.

4. **Startup vs Build Timing:**  
   Because `python scripts/cli.py db seed` failed during the build phase, the service never progressed to `startCommand`, and the FastAPI `lifespan` hook (`apps/api/src/main.py`) never had the opportunity to run.

---

## 4. Local Reproduction Confirmation

The exact failure was reproduced in the local environment by setting:
```bash
DATABASE_URL=sqlite:///./test_clean.db .venv/bin/python scripts/cli.py db seed
```
This produced the identical stack trace:
```text
sqlite3.OperationalError: no such table: locations
[SQL: SELECT locations.id AS locations_id, locations.name AS locations_name, ...
FROM locations 
WHERE locations.id = ?
 LIMIT ? OFFSET ?]
[parameters: ('loc_delhi_east', 1, 0)]
```

---

## 5. Verification of Model Schema for `locations`

The `Location` model in `database/models.py` adheres to all application contracts:

```python
class Location(Base):
    __tablename__ = "locations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    region: Mapped[str] = mapped_column(String(64), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    extra_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    stations: Mapped[list["MonitoringStation"]] = relationship("MonitoringStation", back_populates="location")
```

The table creation and relationships are fully sound. The issue was purely lifecycle orchestration and missing invocation of schema creation prior to seeding.
