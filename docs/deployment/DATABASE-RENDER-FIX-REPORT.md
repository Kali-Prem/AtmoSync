# Database Render Fix Report — ATMOSYNC (SIH-26082)

**System:** ATMOSYNC — Air Pollution–Weather Coupled Forecasting System for Delhi NCR  
**SIH Problem Statement:** SIH-26082  
**Date:** 2026-10-04  

---

### Original Error:
```text
sqlalchemy.exc.OperationalError:
(sqlite3.OperationalError) no such table: locations

The failing query accesses:
FROM locations
WHERE locations.id = ?
```

### Root Cause:
1. The default SQLite database file `data/vayudrishti.db` is gitignored (`*.db`), so a clean checkout on Render does not contain any database file.
2. In `render.yaml`, `buildCommand` attempted to execute `python scripts/cli.py db seed` without first running `python scripts/cli.py db init`.
3. In `scripts/cli.py`, `cmd_db_seed()` invoked `seed_monitoring_stations(db)` without ensuring `init_database()` was called.
4. In `database/seed_data.py`, `seed_monitoring_stations()` queried `db.query(Location).filter(Location.id == loc_id).first()` on a newly created empty SQLite file, immediately failing because the `locations` table did not exist.
5. In addition, database initialization and reference data seeding were positioned in the build container phase rather than the runtime start command, preventing recovery on container boot.

### Database:
Embedded SQLite (`sqlite:///./data/vayudrishti.db`) for zero-setup free-tier deployments, with full support for PostgreSQL 16 + TimescaleDB (`postgresql+psycopg://`) for production high-throughput configurations.

### Migration System:
SQLAlchemy DeclarativeBase DDL (`Base.metadata.create_all(bind=engine)`) managed by `database/connection.py:init_database()`, exposed via CLI commands `python scripts/cli.py db init` and `python scripts/cli.py db migrate`.

### locations Table:
Defined in `database/models.py:Location` (`__tablename__ = "locations"`), containing columns `id`, `name`, `region`, `latitude`, `longitude`, `extra_metadata`, and `created_at`, mapped via relationship to `MonitoringStation`. Populated during seeding with 10 Delhi NCR regional location entities.

### Fix Applied:
1. **Configured Deterministic Runtime Sequence in `render.yaml`:**
   - Changed `buildCommand` to pure dependency installation: `pip install --upgrade pip && pip install -r apps/api/requirements.txt`.
   - Changed `startCommand` to execute migrations and reference seeding before launching the web server:
     `python scripts/cli.py db init && python scripts/cli.py db seed && uvicorn apps.api.src.main:app --host 0.0.0.0 --port $PORT`.
2. **Defensive Schema Guarantee in CLI:**
   - Modified `cmd_db_seed()` in `scripts/cli.py` to automatically execute `init_database()` before initiating any session or query.
   - Added `migrate` subcommand parser and handler to `scripts/cli.py`.
3. **Defensive Schema Guarantee in Seeding Logic:**
   - Added `init_database(bind_engine=db.get_bind())` directly to `database/seed_data.py:seed_monitoring_stations()`, ensuring that any invocation (standalone, CLI, or test) on any engine binding creates tables before querying `Location`.
4. **Enhanced Connection Configuration:**
   - Added automatic parent directory creation in `database/connection.py` for SQLite file paths to eliminate `unable to open database file` errors.
   - Added automatic normalization for `postgres://` and `postgresql://` URIs to `postgresql+psycopg://` for compatibility with the modern `psycopg` (v3) driver.
   - Enhanced `init_database(bind_engine=None)` to accept optional target engine bindings.
5. **Added Regression Test Suite:**
   - Added `tests/api/test_db_initialization.py` covering table creation, `sqlite_master` verification of `locations`, seeding lifecycle, seed idempotence, uninitialized recovery, and API endpoints.

### Files Modified:
- [`render.yaml`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/render.yaml)
- [`database/connection.py`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/database/connection.py)
- [`database/seed_data.py`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/database/seed_data.py)
- [`scripts/cli.py`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/scripts/cli.py)
- [`docs/deployment/RENDER-DEPLOYMENT.md`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/docs/deployment/RENDER-DEPLOYMENT.md)

### Files Created:
- [`tests/api/test_db_initialization.py`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/tests/api/test_db_initialization.py)
- [`docs/deployment/DATABASE-RENDER-ERROR-AUDIT.md`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/docs/deployment/DATABASE-RENDER-ERROR-AUDIT.md)
- [`docs/deployment/DATABASE-DEPLOYMENT.md`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/docs/deployment/DATABASE-DEPLOYMENT.md)
- [`docs/deployment/RENDER-READINESS.md`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/docs/deployment/RENDER-READINESS.md)
- [`docs/deployment/DATABASE-RENDER-FIX-REPORT.md`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/docs/deployment/DATABASE-RENDER-FIX-REPORT.md)

### Migration Command:
```bash
python scripts/cli.py db init
```
*(Or `python scripts/cli.py db migrate`)*

### Production Start Command:
```bash
python scripts/cli.py db init && python scripts/cli.py db seed && uvicorn apps.api.src.main:app --host 0.0.0.0 --port $PORT
```

### Local Tests:
- **Clean Database Schema Creation:** Verified `locations` table created in `sqlite_master` via `SELECT name FROM sqlite_master WHERE type='table' AND name='locations';` (Result: `locations`).
- **Seed Verification:** Verified insertion of 10 regional locations and 20 CAAQMS monitoring stations.
- **Idempotence Verification:** Re-running seed confirmed 0 new insertions with existing data preserved.
- **Uninitialized Database Seed Recovery:** Verified `seed_monitoring_stations` executed directly on a blank database without prior `init_database` succeeds without `OperationalError`.
- **Live Production Simulation:** Ran background Uvicorn server against clean database using the exact production start command. Verified:
  - `GET /health` returned `200 OK` (`status: healthy`, `database.status: connected`).
  - `GET /api/v1/locations` returned `200 OK` (10 locations).
  - `GET /api/v1/locations/stations` returned `200 OK` (20 active monitoring stations).
- **Backend Test Suite:** All 57 tests passed in pytest (`tests/api/` and `tests/unit/`).
- **Frontend Verification:** Next.js 14 production build compiled with 0 errors (`npx tsc --noEmit && npm run build`).

### Render Tests:
Deployment configuration prepared in `render.yaml` with non-blocking build and self-healing runtime migration/seed start command. Ready for user push and manual Blueprint apply on Render dashboard. (No automated remote deployment executed per instructions).

### Remaining Blockers:
None.

---

DATABASE FIX VERIFIED LOCALLY
