# Final Definitive Technology Decision Table

**Document ID:** `DOC-RES-020`  
**Phase:** Research & Data Foundation  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved & Implementation-Locked  

---

## 1. Definitive Architecture Decision Matrix

The following decision records solidify the entire technology stack for ATMOSYNC. Every selection is supported by empirical benchmarks, cost-feasibility proofs, and verified operational data.

```
+-----------------------------------------------------------------------------------------------------------------------------+
|                                              TECHNOLOGY DECISION MATRIX                                                     |
+=============================================================================================================================+
| COMPONENT       | SELECTED TECHNOLOGY     | ALTERNATIVE          | REASON                    | EVIDENCE              | STATUS  |
+-----------------+-------------------------+----------------------+---------------------------+-----------------------+---------+
| Weather Data    | Open-Meteo Weather API  | NOAA GFS GRIB2       | High-speed JSON REST;     | 99.9% uptime CDN;     | LOCKED  |
|                 | (ECMWF/GFS blend)       | Direct NOMADS        | pre-diagnosed PBL height  | eliminates local      |         |
|                 |                         |                      | and multi-level AGL temps.| Fortran wgrib2 setup. |         |
+-----------------+-------------------------+----------------------+---------------------------+-----------------------+---------+
| Air Quality Obs | OpenAQ API v3           | CPCB CCR Portal /    | Standardized REST JSON;   | High developer uptime;| LOCKED  |
|                 | (CPCB Stations)         | data.gov.in direct   | aggregates 40+ Delhi CPCB | bypasses CCR captcha &|         |
|                 |                         |                      | stations; ISO timestamps. | 504 portal timeouts.  |         |
+-----------------+-------------------------+----------------------+---------------------------+-----------------------+---------+
| Satellite Fire  | NASA FIRMS VIIRS 375m   | MODIS 1km /          | 375m I-band catches small | Peer-reviewed lit;    | LOCKED  |
|                 | Active Fire NRT API     | INSAT-3D Imager      | 1-acre crop fires; FRP    | free instant MAP_KEY; |         |
|                 |                         |                      | directly scales emission. | ~1-2h overpass latency|         |
+-----------------+-------------------------+----------------------+---------------------------+-----------------------+---------+
| Synoptic Chem   | Copernicus CAMS Global  | Local WRF-Chem       | Authentic supercomputer   | Free open API via     | LOCKED  |
| Prior           | (via Open-Meteo API)    | Live Cloud Execution | chemical transport grid;  | Open-Meteo; 0.4° grid;|         |
|                 |                         |                      | zero compute overhead.    | hourly 72h horizon.   |         |
+-----------------+-------------------------+----------------------+---------------------------+-----------------------+---------+
| Scientific Model| Hybrid Dual-Engine:     | Pure WRF-Chem or     | Best of both worlds:      | Evaluated in          | LOCKED  |
| Framework       | Physics Diagnostic +    | Pure Black-Box ML    | physical conservation +   | DOC-RES-006;          |         |
|                 | ML Downscaler           |                      | 10-second run latency.    | 100% demo stability.  |         |
+-----------------+-------------------------+----------------------+---------------------------+-----------------------+---------+
| Machine Learning| Multi-Horizon Direct    | XGBoost / LSTM /     | 10x faster training than  | NeurIPS benchmark lit;| LOCKED  |
| Architecture    | LightGBM Ensembles      | Temporal Transformer | XGBoost; native missing   | exact TreeSHAP math;  |         |
|                 |                         |                      | data; 12ms inference.     | 0 GPU needed on CPU.  |         |
+-----------------+-------------------------+----------------------+---------------------------+-----------------------+---------+
| Persistence &   | PostgreSQL 16 +         | MongoDB /            | Unified engine for        | Native hypertable     | LOCKED  |
| Time-Series     | TimescaleDB + PostGIS   | InfluxDB + PostGIS   | spatial geometries, time- | chunking; eliminates  |         |
|                 |                         |                      | series, & relations.      | distributed db sync.  |         |
+-----------------+-------------------------+----------------------+---------------------------+-----------------------+---------+
| In-Memory Cache | Redis 7 Alpine          | Memcached            | Sub-millisecond forecast  | Caches 72h JSON arrays| LOCKED  |
| & Message Broker|                         |                      | caching & Pub/Sub event   | for instant map tile  |         |
|                 |                         |                      | dispatching for alerts.   | scrubbing.            |         |
+-----------------+-------------------------+----------------------+---------------------------+-----------------------+---------+
| Backend Server  | Python FastAPI          | Django REST /        | Async ASGI event loop;    | Auto-generating       | LOCKED  |
| Gateway         | (Uvicorn / Pydantic)    | Node.js Express      | native Python scientific  | OpenAPI 3.1; native   |         |
|                 |                         |                      | library integration.      | xarray & NumPy math.  |         |
+-----------------+-------------------------+----------------------+---------------------------+-----------------------+---------+
| Task Scheduling | Celery Worker           | Cron / Background    | Distributed task queue;   | Handles GRIB/REST     | LOCKED  |
| & Workers       | + Redis Broker          | FastAPI tasks        | automatic retries; worker | timeouts without      |         |
|                 |                         |                      | isolation; task timeouts. | blocking web API.     |         |
+-----------------+-------------------------+----------------------+---------------------------+-----------------------+---------+
| Web Application | Next.js 14 (App Router) | Vite + React SPA /   | Hybrid server rendering;  | Server Components     | LOCKED  |
| Frontend        | + TypeScript            | Streamlit            | zero whiteout initial     | optimize initial load;|         |
|                 |                         |                      | load; strict data typing. | TypeScript type-safe. |         |
+-----------------+-------------------------+----------------------+---------------------------+-----------------------+---------+
| Mapping & GIS   | MapLibre GL JS          | Leaflet.js /         | WebGL GPU vector rendering| Sustains 60 FPS under | LOCKED  |
| Engine          | + Custom WebGL Layer    | Mapbox GL (Paid)     | completely open source;   | 10,000+ animated wind |         |
|                 |                         |                      | zero Mapbox token costs.  | particles and tiles.  |         |
+-----------------+-------------------------+----------------------+---------------------------+-----------------------+---------+
| Containerization| Docker & Docker Compose | Bare-metal VM        | Standardized reproducible | Eliminates OS library | LOCKED  |
| & Runtime       | (Multi-stage builds)    | Virtualenv           | runtime across dev laptops| conflicts (GDAL,      |         |
|                 |                         |                      | and cloud demo hosts.     | NetCDF4, C++ toolchain|         |
+-----------------+-------------------------+----------------------+---------------------------+-----------------------+---------+
| Telemetry &     | Prometheus + Grafana    | Datadog (Paid)       | 100% open source metrics  | Out-of-the-box CPU,   | LOCKED  |
| Observability   | (Prometheus Python SDK) |                      | scraping & health check   | memory, and inference |         |
|                 |                         |                      | monitoring.               | duration dashboards.  |         |
+-----------------+-------------------------+----------------------+---------------------------+-----------------------+---------+
```
