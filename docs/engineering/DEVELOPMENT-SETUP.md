# Development Environment Setup Guide

**Document ID:** `DOC-ENG-008`  
**Phase:** Phase 3 — Project Foundation & Data Engineering Setup  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved  

---

## 1. Prerequisites

Before installing, ensure the host system has the following installed:
- **Operating System:** Windows 10/11, macOS, or Linux (Ubuntu 22.04 LTS recommended).
- **Python:** Version 3.10.x (Python 3.9+ supported).
- **Node.js:** Version 20.x or 24.x LTS.
- **npm:** Version 10.x or 11.x.
- **Git:** Version 2.40+.
- **Docker & Docker Compose (Optional for local, required for containerized staging).**

---

## 2. Step-by-Step Setup Instructions

### Step 1: Clone the Repository
```bash
git clone <repository_url>
cd SIH-26082
```

### Step 2: Configure Environment Variables
```bash
# Copy template to .env
cp .env.example .env
```
*(In development, default SQLite database and local settings work out of the box without requiring manual edits).*

### Step 3: Set up Python Virtual Environment
```bash
# Windows (PowerShell)
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate

# Upgrade pip and install dependencies
pip install -r apps/api/requirements.txt
```

### Step 4: Install Frontend Dependencies
```bash
cd apps/web
npm install
cd ../..
```

### Step 5: Initialize Database & Seed Stations
```bash
# Initializes tables and seeds 20 verified Delhi NCR CAAQMS stations
python scripts/cli.py db init
python scripts/cli.py db seed
```

### Step 6: Start the Backend API
```bash
# Starts FastAPI server at http://localhost:8000
python -m uvicorn apps.api.src.main:app --host 0.0.0.0 --port 8000 --reload
```
- Interactive Swagger OpenAPI Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### Step 7: Start the Web Dashboard
```bash
# In a separate terminal
cd apps/web
npm run dev
```
- Web Application: `http://localhost:3000`

---

## 3. Running Tests & Quality Verification

### Run Python Test Suite (pytest)
```bash
pytest -v tests/
```
*(Executes unit tests for validators, unit normalizers, physical inversion diagnostics, CPCB NAQI calculation, and API integration tests).*

### Run Frontend Typecheck & Build Verification
```bash
cd apps/web
npm run build
```

---

## 4. Useful CLI Commands

```bash
# Ingest live weather for Delhi coordinates
python scripts/cli.py ingest weather --lat 28.6139 --lon 77.2090

# Test data quality validation
python scripts/cli.py data validate

# Seed database stations
python scripts/cli.py db seed
```
