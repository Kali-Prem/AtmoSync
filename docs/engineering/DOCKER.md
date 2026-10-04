# Docker Infrastructure & Containerization Architecture

**Document ID:** `DOC-ENG-007`  
**Phase:** Phase 3 — Project Foundation & Data Engineering Setup  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved  

---

## 1. Containerized Microservices Architecture

ATMOSYNC deploys four modular containers coordinated via `docker-compose.yml`:

```
+---------------------------------------------------------------------------------------------------------+
|                                    CONTAINER SERVICES DEPLOYMENT                                        |
+=========================================================================================================+
| SERVICE NAME     | BASE IMAGE               | INTERNAL PORT | HOST PORT | PURPOSE                       |
+------------------+--------------------------+---------------+-----------+-------------------------------+
| `database`       | `timescale/timescaledb-  | 5432          | 5432      | PostgreSQL 16 + PostGIS 3.4   |
|                  | ha:pg16`                 |               |           | + TimescaleDB Hypertables     |
+------------------+--------------------------+---------------+-----------+-------------------------------+
| `cache`          | `redis:7-alpine`         | 6379          | 6379      | In-memory caching & Pub/Sub   |
+------------------+--------------------------+---------------+-----------+-------------------------------+
| `api`            | `python:3.10-slim`       | 8000          | 8000      | FastAPI asynchronous backend  |
|                  | (Dockerfile.api)         |               |           | gateway                       |
+------------------+--------------------------+---------------+-----------+-------------------------------+
| `web`            | `node:20-alpine`         | 3000          | 3000      | Next.js 14 WebGL command      |
|                  | (Dockerfile.web)         |               |           | center interface              |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. The Decision NOT to Containerize WRF-Chem

In accordance with Problem Statement 26082 research (`DOC-RES-005` and `DOC-RES-006`):
- **Why WRF-Chem is NOT in Docker Compose:**  
  Full 3D coupled numerical WRF-Chem simulations require high-performance computing clusters with 64 to 256 CPU cores, OpenMPI with low-latency InfiniBand interconnects, and Lustre parallel filesystems. Packaging WRF-Chem into a local desktop Docker container would result in a massive 20+ GB image that cannot run meaningfully on a laptop or standard cloud virtual machine.
- **Scientific Workflow Separation:**  
  WRF-Chem configurations and runbooks live in `scientific/wrf/` for deployment on institutional supercomputers (e.g., NCMRWF's Mihir or IITM's Pratyush). The operational cloud application consumes pre-computed NetCDF benchmark runs and live Copernicus CAMS supercomputer feeds.

---

## 3. Launching the Multi-Container Environment

```bash
# 1. Start all services in detached mode
docker compose up -d

# 2. View streaming logs
docker compose logs -f api

# 3. Seed monitoring stations into containerized database
docker compose exec api python scripts/cli.py db seed

# 4. Stop all services
docker compose down
```
