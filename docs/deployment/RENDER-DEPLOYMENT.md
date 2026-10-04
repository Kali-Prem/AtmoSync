# Render Deployment Guide — ATMOSYNC (SIH-26082)

**Project Name:** ATMOSYNC  
**SIH Problem Statement:** SIH-26082  
**System:** Air Pollution–Weather Coupled Forecasting System for Delhi NCR  
**Target Platform:** [Render](https://render.com) (Cloud Application Platform)  
**Document Version:** 1.0.0 (Production / SIH Demonstration Ready)  

---

## 1. Architecture Overview on Render

ATMOSYNC is architected as a decoupled, multi-tier system. On Render, the platform is deployed using two coordinated web services with optional managed persistence:

```
                      ┌─────────────────────────────────────────┐
                      │             PUBLIC INTERNET             │
                      └────────────────────┬────────────────────┘
                                           │
                    HTTPS Requests         │       HTTPS Requests
                 (Port 443 / SSL)          │      (Port 443 / SSL)
                        ┌──────────────────┴──────────────────┐
                        ▼                                     ▼
        ┌───────────────────────────────┐     ┌───────────────────────────────┐
        │         ATMOSYNC Web          │     │         ATMOSYNC API          │
        │  Next.js 14 Frontend Service  │     │   FastAPI Backend Service     │
        │    (Service: atmosync-web)    │────▶│    (Service: atmosync-api)    │
        │   Runtime: Node.js 20 Alpine  │     │    Runtime: Python 3.10/3.13  │
        │       Root: apps/web          │     │       Root: Repository Root   │
        └───────────────────────────────┘     └───────────────┬───────────────┘
                                                              │
                                       ┌──────────────────────┴──────────────────────┐
                                       ▼                                             ▼
                        ┌───────────────────────────────┐             ┌───────────────────────────────┐
                        │       Render PostgreSQL       │     OR      │   Embedded SQLite Fallback    │
                        │    (Service: atmosync-db)     │             │    (data/vayudrishti.db)      │
                        │  Managed Cloud DB / PostGIS   │             │   Pre-seeded CAAQMS stations  │
                        └───────────────────────────────┘             └───────────────────────────────┘
```

---

## 2. Fast-Track Deployment: Render Blueprint (`render.yaml`)

The repository includes a ready-to-use Render Blueprint specification at the root: [`render.yaml`](file:///home/kali-prem/Downloads/SIH-26082/SIH-26082/render.yaml).

### Steps to Deploy via Blueprint:
1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **Blueprints** in the top navigation bar.
3. Click **New Blueprint Instance**.
4. Connect the Git repository containing **ATMOSYNC (SIH-26082)**.
5. Render will automatically parse `render.yaml` and display the planned resources:
   - **`atmosync-api`** (Python Web Service)
   - **`atmosync-web`** (Node Web Service)
6. Click **Apply**.
7. Render will automatically build, seed, and deploy both services in sequence.

---

## 3. Manual Deployment Instructions

If you prefer deploying services individually through the Render Dashboard, follow these steps:

### Step A: Deploy the Backend API (`atmosync-api`)

1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your Git repository.
3. Configure the following fields:
   - **Name:** `atmosync-api`
   - **Region:** `Oregon (US West)` (or closest region to your users)
   - **Branch:** `main`
   - **Root Directory:** *(leave blank — repository root)*
   - **Runtime:** `Python 3`
   - **Build Command:**
     ```bash
     pip install --upgrade pip && pip install -r apps/api/requirements.txt
     ```
   - **Start Command:**
     ```bash
     python scripts/cli.py db init && python scripts/cli.py db seed && uvicorn apps.api.src.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Plan:** `Free` (or `Starter` for persistent memory)
4. Under **Advanced** → **Health Check Path**, enter:
   ```text
   /health
   ```
5. Under **Environment Variables**, add:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `APP_NAME` | `ATMOSYNC` | Official project identifier |
   | `ENVIRONMENT` | `production` | Enables production mode |
   | `PYTHONPATH` | `.` | Ensures proper root import resolution |
   | `DATABASE_URL` | `sqlite:///./data/vayudrishti.db` | Or your Render PostgreSQL URL |
   | `ALLOWED_CORS_ORIGINS` | `'["https://atmosync-web.onrender.com", "http://localhost:3000"]'` | JSON array or comma-separated origins (`FRONTEND URL REQUIRED — SET AFTER FRONTEND SERVICE IS CREATED`) |
   | `LOG_LEVEL` | `INFO` | Standard structured logging |
   | `FORECAST_HORIZON_HOURS` | `72` | Standard 72-hour forecast horizon |
6. Click **Create Web Service**. Note the assigned URL (e.g., `https://atmosync-api.onrender.com`).

---

### Step B: Deploy the Frontend Dashboard (`atmosync-web`)

1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your Git repository.
3. Configure the following fields:
   - **Name:** `atmosync-web`
   - **Region:** `Oregon (US West)` (same region as backend)
   - **Branch:** `main`
   - **Root Directory:**
     ```text
     apps/web
     ```
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm install && npm run build
     ```
   - **Start Command:**
     ```bash
     npm run start
     ```
   - **Plan:** `Free`
4. Under **Advanced** → **Health Check Path**, enter:
   ```text
   /
   ```
5. Under **Environment Variables**, add:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Optimizes Next.js bundle |
   | `NEXT_PUBLIC_API_URL` | `https://atmosync-api.onrender.com` | Replace with your actual backend URL |
6. Click **Create Web Service**. Note the assigned URL (e.g., `https://atmosync-web.onrender.com`).

---

## 4. Database Configuration Strategies

ATMOSYNC provides dual-mode database support:

### Option 1: Embedded SQLite Fallback (Zero Setup / Free Tier)
- Default setting: `DATABASE_URL=sqlite:///./data/vayudrishti.db`
- The runtime start command `python scripts/cli.py db init && python scripts/cli.py db seed && uvicorn ...` automatically initializes all 8 database tables (including `locations` and `monitoring_stations`) and seeds the 20 verified Delhi NCR CAAQMS stations into the database prior to serving requests.
- Completely functional out-of-the-box for evaluation and live hackathon demonstrations.

### Option 2: Render Managed PostgreSQL (Production)
- In Render Dashboard, click **New +** → **PostgreSQL**.
- Name: `atmosync-db`
- Database: `atmosync_db`
- User: `atmosync`
- Copy the **Internal Database URL** and set it as `DATABASE_URL` in `atmosync-api`.
- *Note:* The backend automatically converts legacy `postgres://` and `postgresql://` prefixes to `postgresql+psycopg://` to leverage the modern `psycopg` (v3) driver installed in `apps/api/requirements.txt`.

---

## 5. Pre-Deployment Local Validation

Before pushing changes to Render, verify all build and health checks locally:

```bash
# 1. Run Backend Pytest Suite (57 tests)
.venv/bin/pytest -v tests/

# 2. Verify API Health Endpoint
curl -s http://localhost:8000/health
# Expected: {"status":"healthy","app_name":"ATMOSYNC",...}

# 3. Verify Frontend TypeScript Compilation
cd apps/web && npx tsc --noEmit

# 4. Verify Frontend Production Build
npm run build
```

---

## 6. Troubleshooting & Render Best Practices

### A. Free Tier Cold Starts
On Render's Free tier, services spin down after 15 minutes of inactivity:
- The first request to `atmosync-api` may take 30–50 seconds to spin up.
- The frontend client includes graceful retry logic and fallback rendering to ensure the command center UI remains responsive even during cold starts.

### B. Port Binding (`$PORT`)
- **Backend:** `uvicorn apps.api.src.main:app --host 0.0.0.0 --port $PORT` directly binds to Render's dynamic port.
- **Frontend:** Next.js `npm run start` (`next start`) natively reads `process.env.PORT` on Render, automatically binding to the assigned port.

### C. Cross-Origin Resource Sharing (CORS)
- If your frontend cannot communicate with the backend, ensure `ALLOWED_CORS_ORIGINS` on `atmosync-api` includes your exact deployed frontend URL (e.g. `'["https://atmosync-web.onrender.com", "http://localhost:3000"]'`). Do not use wildcard `*` in production.

---

## 7. Service Summary

| Service Name | Render Service Type | Build Command | Start Command | Health Check |
| :--- | :--- | :--- | :--- | :--- |
| **`atmosync-api`** | Web Service (Python) | `pip install --upgrade pip && pip install -r apps/api/requirements.txt` | `python scripts/cli.py db init && python scripts/cli.py db seed && uvicorn apps.api.src.main:app --host 0.0.0.0 --port $PORT` | `/health` |
| **`atmosync-web`** | Web Service (Node) | `npm install && npm run build` | `npm run start` | `/` |
| **`atmosync-db`** | PostgreSQL (Optional) | Managed by Render | Managed by Render | Port 5432 |
