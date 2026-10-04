# Engineering Report: Project Renaming to ATMOSYNC (SIH-26082)

**Report Date:** October 2026  
**System:** ATMOSYNC — Air Pollution–Weather Coupled Forecasting System for Delhi NCR  
**SIH Problem Statement:** SIH-26082  
**Host Organization:** Ministry of Earth Sciences (MoES) / NCMRWF  

---

## 1. Previous Project Name
- **Primary Descriptive Title:** Air Pollution–Weather Coupled Forecasting System
- **Legacy Working Moniker:** VayuDrishti NCR

---

## 2. New Official Project Name
- **Official Primary Product / Project Name:** **ATMOSYNC**
- **Official Subtitle / Descriptive Tagline:** **Air Pollution–Weather Coupled Forecasting System for Delhi NCR**
- **Problem Statement Identifier (Preserved):** **SIH-26082**

---

## 3. Files Modified
Across the codebase, all user-facing, branding, metadata, and docstring locations were systematically updated while preserving all underlying numerical, database, and scientific identifiers.

### A. Frontend Application (`apps/web/`)
1. `apps/web/src/app/layout.tsx` — Page metadata title, Open Graph metadata, header brand title (`ATMOSYNC`), brand logo badge (`A`), navigation subtitle, and footer copyright statement.
2. `apps/web/src/app/page.tsx` — Command dashboard header (`ATMOSYNC Air Pollution Command Center`), descriptive subtitle, and platform overview.
3. `apps/web/src/app/status/page.tsx` — System health fallback application name (`ATMOSYNC`).
4. `apps/web/src/lib/api.ts` — API client module docstrings and error diagnostic console log.

### B. Backend Application & Services (`apps/api/`, `services/`, `scripts/`)
5. `apps/api/src/core/config.py` — Default application settings (`APP_NAME = "ATMOSYNC"`).
6. `apps/api/src/main.py` — Root FastAPI application metadata (`title="ATMOSYNC API"`), OpenAPI v1 sub-application metadata (`title="ATMOSYNC API v1"`), and official description.
7. `apps/api/src/schemas/common.py` — Pydantic schema module docstring.
8. `apps/api/src/core/logging.py` — Structured logging configuration docstring.
9. `database/connection.py` — Database engine and session factory docstring.
10. `services/scheduler/src/jobs.py` — Scheduled ingestion pipeline job runner docstrings.
11. `services/forecasting/src/engine.py` — Forecasting engine service docstrings.
12. `services/ingestion/src/pipeline.py` — Unified ingestion pipeline docstrings.
13. `services/ingestion/src/validation/validator.py` — Ingestion data validator docstrings.
14. `services/ingestion/src/providers/base.py` — Ingestion provider interface docstrings.
15. `services/ingestion/src/normalization/normalizer.py` — Data normalizer docstrings.
16. `services/ingestion/src/providers/weather_open_meteo.py` — HTTP client User-Agent (`ATMOSYNC-Ingest/1.0`).
17. `services/ingestion/src/providers/aq_openaq.py` — HTTP client User-Agent (`ATMOSYNC-Ingest/1.0`).
18. `services/ingestion/src/providers/chemical_cams.py` — HTTP client User-Agent (`ATMOSYNC-Ingest/1.0`).
19. `services/ingestion/src/providers/fire_nasa_firms.py` — HTTP client User-Agent (`ATMOSYNC-Ingest/1.0`).
20. `scripts/acquire_historical_data.py` — Research acquisition script docstring and User-Agent (`ATMOSYNC-Research/1.0 (MoES/NCMRWF SIH 26082)`).
21. `scripts/cli.py` — Management CLI module docstring and Argparse CLI description (`ATMOSYNC Management CLI (SIH-26082)`).

### C. Scientific & ML Layer (`ml/`, `scientific/`)
22. `ml/models/interface.py` — ML model interface specification docstring (`ATMOSYNC (SIH-26082)`).
23. `ml/datasets/builder.py` — Dataset builder module docstring (`ATMOSYNC (SIH-26082 Phase 4)`).
24. `scientific/wrf/engine.py` — Scientific model interface and WRF-Chem placeholder docstring (`ATMOSYNC (SIH-26082)`).

### D. Configuration, Deployment & Tooling (`docker/`, `.env*`, `configs/`, etc.)
25. `.env` — Environment configuration `APP_NAME="ATMOSYNC"` and header comments.
26. `.env.example` — Environment template `APP_NAME="ATMOSYNC"` and header comments.
27. `configs/development/config.yaml` — Development environment header comments.
28. `configs/staging/config.yaml` — Staging environment header comments.
29. `configs/production/config.yaml` — Production environment header comments.
30. `Makefile` — Build automation banner and help text (`ATMOSYNC — Air Pollution–Weather Coupled Forecasting System`).
31. `run.ps1` — PowerShell runner banner and help text (`ATMOSYNC — Air Pollution–Weather Coupled Forecasting System`).
32. `docker/Dockerfile.api` — FastAPI Dockerfile header comment (`ATMOSYNC FastAPI Backend (SIH-26082)`).
33. `docker/Dockerfile.web` — Next.js 14 Dockerfile header comment (`ATMOSYNC Next.js 14 Frontend (SIH-26082)`).
34. `.github/workflows/ci.yml` — GitHub Actions CI workflow name (`ATMOSYNC CI`).

### E. Documentation & Project Governance (`README.md`, `docs/`)
35. `README.md` — Primary title `# ATMOSYNC`, subtitle, system description, feature/capability status breakdown, and architecture diagram.
36. `docs/PROJECT-STATUS.md` — Project name, problem statement, and executive status tracking.
37. Over 67 architectural, scientific, requirements, data, and engineering specifications across `docs/` updated from legacy monikers to `ATMOSYNC`.

---

## 4. Branding Locations Updated
- **Browser Title & Meta:** `<title>ATMOSYNC — Air Pollution–Weather Coupled Forecasting System for Delhi NCR</title>`
- **Application Navigation Bar:** Logo mark `A` with brand title `ATMOSYNC` and subtitle `Air Pollution–Weather Coupled Forecasting • SIH-26082`.
- **Application Dashboard:** Primary `h1` set to `ATMOSYNC Air Pollution Command Center`.
- **Footer:** `ATMOSYNC • Smart India Hackathon 2026 • Problem Statement SIH-26082 • Air Pollution–Weather Coupled Forecasting System for Delhi NCR`.
- **API Swagger / Redoc Title:** `ATMOSYNC API` / `ATMOSYNC API v1`.

---

## 5. README Updated
The main [`README.md`](file:///home/kali-prem/Downloads/SIH-26082/SIH-26082/README.md) has been updated with:
- Top-level title `# ATMOSYNC`
- Subtitle: `### Air Pollution–Weather Coupled Forecasting System for Delhi NCR`
- System Overview describing coupling of atmospheric conditions, pollution observations, regional fire activity, plume transport, and physics-informed ML.
- Explicit categorization distinguishing:
  - **Implemented Features** (Data ingestion, QC validation, near-surface inversion $\Gamma_{low}$, ventilation index, ITSI trapping index, Lagrangian puff plume screening, direct multi-horizon LightGBM baselines, FastAPI REST API, Next.js 14 command dashboard with default Light theme).
  - **Planned Features** (Staggered ensemble training, dynamic feature gating, CAQM GRAP stage compliance webhooks, WebGL vector streamline shader overlay).
  - **Research Components** (20+ verified whitepapers, historical winter benchmark evaluations across 152 days / 18,240 station-hours).
  - **WRF-Chem Status** (HPC coupling contracts, WPS domains D01–D03, and standardized netCDF boundary exchange interfaces).

---

## 6. Frontend Branding Updated
- Layout metadata updated with `ATMOSYNC` title and Open Graph branding.
- Navbar, command dashboard header, status page fallbacks, and footer branding updated.
- No changes made to UI layouts, colors, CSS tokens, components, or user interaction models.

---

## 7. Backend Metadata Updated
- FastAPI root title: `"ATMOSYNC API"`
- FastAPI v1 sub-app title: `"ATMOSYNC API v1"`
- FastAPI description: `"ATMOSYNC: Air Pollution–Weather Coupled Forecasting System for Delhi NCR (SIH 2026 PS 26082)."`
- Pydantic configuration: `APP_NAME = "ATMOSYNC"` in `apps/api/src/core/config.py` and `.env`.
- Health endpoint (`GET /health`) verified returning `"app_name": "ATMOSYNC"`.

---

## 8. Deployment Metadata Updated
- Dockerfiles annotated with `ATMOSYNC` service titles.
- CI workflow renamed to `ATMOSYNC CI`.
- Deployment configuration files (Docker, environment configurations) updated without modifying environment variable keys or breaking dependencies.

---

## 9. Documentation Updated
All 67 documentation files across:
- `docs/PROJECT-STATUS.md`
- `docs/01-project/`
- `docs/02-requirements/`
- `docs/03-system-architecture/`
- `docs/research/`
- `docs/scientific/`
- `docs/data/`
- `docs/ml/`
- `docs/engineering/`

now consistently present `ATMOSYNC` as the primary project name alongside the problem statement identifier `SIH-26082`.

---

## 10. Remaining Old-Name References & Audit Classification
All remaining occurrences across the repository were audited and classified according to the critical preservation rules:

| Occurrence Pattern / Location | Context | Classification | Rationale |
| :--- | :--- | :--- | :--- |
| `data/vayudrishti.db` / `sqlite:///./data/vayudrishti.db` | SQLite database file & connection string | **SAFE / INTENTIONAL** | Internal database filename. Changing this path would disconnect initialized dev data, pre-seeded stations, and migrations. |
| `vayudrishti_db` / `vayudrishti` | Docker compose database name, username, and password | **SAFE / INTENTIONAL** | Internal Docker container & credential configurations. Renaming breaks existing local volumes and container bindings. |
| `VayuDrishti-DelhiNCR-Winter2023-2024` | Dataset name in `data/metadata/historical_manifest.json` and `baseline_evaluation_metrics.json` | **SAFE / INTENTIONAL** | Checksummed dataset identifier. Modifying the key would invalidate SHA256 manifest integrity checks and historical provenance records. |
| `vayudrishti.*` (e.g. `vayudrishti.cli`, `vayudrishti.ingestion`) | Python logging namespace identifiers | **SAFE / INTENTIONAL** | Internal logger hierarchy names; invisible to end users and preserves structured log filtering. |
| `vayudrishti-web` | `name` field in `apps/web/package.json` | **SAFE / INTENTIONAL** | Internal npm package identifier. Preserved to prevent breaking package resolutions. |
| `Air Pollution–Weather Coupled Forecasting System` | Subtitle / Scientific Description in `README.md`, `main.py`, `layout.tsx`, `page.tsx`, `docs/` | **SAFE / INTENTIONAL** | Explicitly mandated by Section 2 of renaming guidelines to preserve scientific clarity. |

**Summary:** 0 occurrences require updating; all remaining occurrences are strictly technical or intentional scientific descriptions.

---

## 11. Build & Test Results
1. **Backend Test Suite:**
   - Command: `.venv/bin/pytest -v tests/`
   - Result: **53 passed, 0 failed in 2.03s** (100% pass rate).
2. **Backend Health Check:**
   - Command: `curl http://localhost:8000/health`
   - Result: HTTP 200 OK — `{"status":"healthy","app_name":"ATMOSYNC","version":"1.0.0-phase3","environment":"development","database":{"status":"connected","engine":"SQLite"},...}`.
3. **OpenAPI Title:**
   - Command: `curl http://localhost:8000/openapi.json`
   - Result: `"title": "ATMOSYNC API"`.
4. **Frontend TypeScript Compilation:**
   - Command: `npx tsc --noEmit`
   - Result: **0 errors** (Clean exit code 0).
5. **Frontend Runtime Verification:**
   - Command: `curl http://localhost:3000`
   - Result: HTTP 200 OK — `<title>ATMOSYNC — Air Pollution–Weather Coupled Forecasting System for Delhi NCR</title>`.

---

## 12. Issues Encountered & Resolution
- **Issue:** The running backend server was originally started prior to config file updates, temporarily reporting the old application name.
  - **Resolution:** Cleanly killed the old daemon task, restarted Uvicorn with `apps.api.src.main:app`, and confirmed `/health` immediately reports `"app_name": "ATMOSYNC"`.
- **Issue:** Running `npm run build` while `next dev` was concurrently running created a temporary lock/conflict on `.next`.
  - **Resolution:** Re-verified with `npx tsc --noEmit` (clean code 0), purged `.next`, and restarted `next dev`, confirming immediate 200 responses with the new branding.

---

## 13. Git / Repository Naming Status
- **GitHub repository rename:** `NOT PERFORMED`
- The repository identifier `SIH-26082` remains preserved throughout.
