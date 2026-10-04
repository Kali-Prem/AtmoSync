# Render Environment Variable Matrix — ATMOSYNC (SIH-26082)

**System:** ATMOSYNC — Air Pollution–Weather Coupled Forecasting System for Delhi NCR  
**SIH Problem Statement:** SIH-26082  
**Document Purpose:** Definitive Environment Variable Specification for Render Cloud Deployments  

---

## 1. Backend Service Environment Variables (`atmosync-api`)

| Variable | Type | Required | Default / Expected Format | Example | Purpose |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `ALLOWED_CORS_ORIGINS` | `Union[List[str], str]` → `List[str]` | **YES** | JSON array string or comma-separated string | `'["https://atmosync-web.onrender.com", "http://localhost:3000"]'` | Allowed production frontend origins for browser cross-origin requests. Enforced by FastAPI `CORSMiddleware`. |
| `APP_NAME` | `str` | **YES** | Alphanumeric string | `ATMOSYNC` | Official application branding identifier. |
| `ENVIRONMENT` | `str` | **YES** | `production` / `development` | `production` | Deployment runtime mode. |
| `PYTHONPATH` | `str` | **YES** | Directory path | `.` | Ensures Python module resolution from repository root. |
| `DATABASE_URL` | `str` | **YES** | SQLAlchemy database URI | `sqlite:///./data/vayudrishti.db` (or Render PostgreSQL internal URL) | Persistence connection string for SQLite or managed PostgreSQL. |
| `LOG_LEVEL` | `str` | NO | `DEBUG` / `INFO` / `WARNING` / `ERROR` | `INFO` | Application structured logging verbosity. |
| `FORECAST_HORIZON_HOURS` | `int` | NO | Integer string | `72` | Standard forecasting window length (72 hours). |
| `PORT` | `int` | **YES** | Dynamic port set by Render | *Set automatically by Render* | Bound port for `uvicorn` HTTP server. |

---

## 2. Detailed Specification: `ALLOWED_CORS_ORIGINS`

```text
Variable:
ALLOWED_CORS_ORIGINS

Type:
Union[List[str], str] (parsed and validated into Python List[str])

Required:
YES

Format:
JSON array of URLs or comma-separated string of origin URLs

Example:
'["https://atmosync-web.onrender.com", "http://localhost:3000"]'

Purpose:
Allowed production frontend origins
```

### Production Setup Instructions:
1. When deploying via [`render.yaml`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/render.yaml), the blueprint pre-configures:
   ```yaml
   - key: ALLOWED_CORS_ORIGINS
     value: '["https://atmosync-web.onrender.com", "http://localhost:3000"]'
   ```
2. If your frontend service is assigned a different Render URL or a custom domain:
   ```text
   FRONTEND URL REQUIRED — SET AFTER FRONTEND SERVICE IS CREATED
   ```
   Navigate to Render Dashboard → `atmosync-api` → **Environment** → update `ALLOWED_CORS_ORIGINS` to include your exact deployed frontend URL (e.g., `'["https://your-custom-frontend.onrender.com", "http://localhost:3000"]'`).

### Supported Input Formats:
- **JSON Array String:** `'["https://atmosync-web.onrender.com", "http://localhost:3000"]'`
- **Comma-Separated String:** `"https://atmosync-web.onrender.com,http://localhost:3000"`
- **Single Origin String:** `"https://atmosync-web.onrender.com"`
- **Default (Unset):** Falls back to local development origins `["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000"]`.

---

## 3. Frontend Service Environment Variables (`atmosync-web`)

| Variable | Type | Required | Default / Expected Format | Example | Purpose |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `NODE_ENV` | `str` | **YES** | `production` | `production` | Optimizes Next.js 14 production bundle. |
| `NEXT_PUBLIC_API_URL` | `str` | **YES** | Public or private backend host URL | Derived from `atmosync-api` host | Base URL used by browser client to fetch forecasts and telemetry. |
| `PORT` | `int` | **YES** | Dynamic port set by Render | *Set automatically by Render* | Bound port for Next.js HTTP server. |
