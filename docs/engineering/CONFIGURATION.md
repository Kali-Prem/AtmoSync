# System Configuration & Environment Reference

**Document ID:** `DOC-ENG-002`  
**Phase:** Phase 3 — Project Foundation & Data Engineering Setup  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Implementation-Ready  

---

## 1. Configuration Architecture

ATMOSYNC adopts the **Twelve-Factor App** methodology for configuration management:
- Strict separation of config from codebase.
- Environment variables override default values in `configs/{environment}/config.yaml`.
- Pydantic v2 `BaseSettings` (`apps/api/src/core/config.py`) strictly parses, validates, and types all configuration parameters at startup, halting execution immediately if required credentials or network URLs are malformed.

---

## 2. Environment Variables Dictionary

```
+---------------------------------------------------------------------------------------------------------+
|                                    ENVIRONMENT VARIABLES DICTIONARY                                     |
+=========================================================================================================+
| VARIABLE NAME              | TYPE    | DEFAULT VALUE                    | DESCRIPTION & PURPOSE         |
+----------------------------+---------+----------------------------------+-------------------------------+
| `ENVIRONMENT`              | string  | `development`                    | `development`, `staging`,     |
|                            |         |                                  | or `production`               |
| `DEBUG`                    | boolean | `True`                           | Enables verbose traceback     |
| `LOG_LEVEL`                | string  | `INFO`                           | `DEBUG`, `INFO`, `WARNING`,   |
|                            |         |                                  | `ERROR`, or `CRITICAL`        |
| `APP_NAME`                 | string  | `ATMOSYNC`                | Service identifier in logs    |
| `API_V1_STR`               | string  | `/api/v1`                        | Route prefix for API v1       |
| `API_HOST`                 | string  | `0.0.0.0`                        | Network bind interface        |
| `API_PORT`                 | integer | `8000`                           | Listening TCP port for API    |
| `WEB_PORT`                 | integer | `3000`                           | Listening TCP port for Web UI |
| `ALLOWED_CORS_ORIGINS`     | string  | `http://localhost:3000,...`      | Comma-separated CORS allowed  |
|                            |         |                                  | origins for web security      |
| `DATABASE_URL`             | string  | `sqlite:///./data/vayudrishti.db`| SQLAlchemy database URI.      |
|                            |         |                                  | Supports PostgreSQL/Timescale |
|                            |         |                                  | and SQLite fallback.          |
| `DATABASE_POOL_SIZE`       | integer | `10`                             | Connection pool size (Postgres|
| `DATABASE_MAX_OVERFLOW`    | integer | `20`                             | Max burst connection overflow |
| `REDIS_URL`                | string  | `redis://localhost:6379/0`       | Cache & Pub/Sub broker URL    |
| `WEATHER_PROVIDER`         | string  | `open-meteo`                     | Active weather provider adapter|
| `AIR_QUALITY_PROVIDER`     | string  | `openaq`                         | Active air quality obs adapter|
| `SATELLITE_FIRE_PROVIDER`  | string  | `nasa-firms`                     | Active fire provider adapter  |
| `CHEMICAL_PRIOR_PROVIDER`  | string  | `cams-global`                    | Synoptic chemical prior       |
| `NASA_FIRMS_MAP_KEY`       | string  | Placeholder                      | Free NASA FIRMS API key       |
| `OPENAQ_API_KEY`           | string  | Placeholder                      | Free OpenAQ v3 API key        |
| `STORAGE_BACKEND`          | string  | `local`                          | `local` or `s3`               |
| `STORAGE_LOCAL_ROOT`       | string  | `./data`                         | Local file system storage path|
| `ML_MODEL_BACKEND`         | string  | `lightgbm-direct`                | Model architecture selector   |
| `FORECAST_HORIZON_HOURS`   | integer | `72`                             | Operational forecast window   |
| `AQI_STANDARD`             | string  | `CPCB_NAQI_2014`                 | Statutory AQI calculation std |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Profiles Hierarchy

1. **Development (`configs/development/config.yaml`):**  
   Optimized for single-developer laptops. SQLite database support enabled so team members can run unit tests and local mock pipelines without requiring an external PostgreSQL instance running.
2. **Staging (`configs/staging/config.yaml`):**  
   Designed for local Docker Compose or preview cloud deployments with PostgreSQL 16 + PostGIS and Redis enabled.
3. **Production (`configs/production/config.yaml`):**  
   Hardened settings, connection pooling, high timeout resiliency, and strict CORS policies.
