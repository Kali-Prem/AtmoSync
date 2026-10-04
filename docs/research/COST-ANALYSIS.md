# Comprehensive Infrastructure & Operational Cost Analysis

**Document ID:** `DOC-RES-018`  
**Phase:** Research & Data Foundation  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Implementation-Ready & Cost-Engineered  

---

## 1. Cost Engineering Principles for SIH 2026

A common pitfall for student hackathon teams is designing systems dependent on expensive proprietary APIs (e.g., Google Maps Platform, paid Mapbox vector tiles, or commercial Air Quality APIs costing thousands of dollars per month), leading to immediate rejection by jury members evaluating operational scalability.

ATMOSYNC is architected around **Zero-License-Cost Open Foundations**:
1. **Open-Source Data Aggregation:** Zero-cost open APIs (NASA FIRMS, Open-Meteo, OpenAQ, ECMWF).
2. **Open-Source GIS Mapping:** MapLibre GL JS utilizing free OpenStreetMap and CARTO Positron tile servers, completely bypassing Mapbox billing limits.
3. **CPU-First Machine Learning:** LightGBM requires zero expensive GPU compute for training or real-time inference.

---

## 2. Itemized Cost Breakdown by Infrastructure Category

```
+---------------------------------------------------------------------------------------------------------+
|                                    ITEMIZED INFRASTRUCTURE COST MATRIX                                 |
+=========================================================================================================+
| CATEGORY                   | COMPONENT / SERVICE           | HACKATHON / DEV COST  | PRODUCTION GOVT COST|
+----------------------------+-------------------------------+-----------------------+---------------------+
| 1. Weather Data Feed       | Open-Meteo Weather API        | $0.00 (Free Tier      | $0 – $50 / month    |
|                            | (ECMWF & GFS downscaled)      | < 10,000 calls/day)   | (Commercial license)|
+----------------------------+-------------------------------+-----------------------+---------------------+
| 2. Air Quality Obs Feed    | OpenAQ API v3 / CPCB Mirror   | $0.00 (Open API Key)  | $0.00 (Open Data)   |
+----------------------------+-------------------------------+-----------------------+---------------------+
| 3. Satellite Fire Feed     | NASA FIRMS REST API           | $0.00 (Free MAP_KEY)  | $0.00 (NASA Open)   |
+----------------------------+-------------------------------+-----------------------+---------------------+
| 4. Mapping & Base Tiles    | MapLibre GL JS + CARTO Basemap| $0.00 (Open source)   | $0.00 (Self-hosted) |
+----------------------------+-------------------------------+-----------------------+---------------------+
| 5. Database Tier           | PostgreSQL 16 + TimescaleDB   | $0.00 (Local Docker)  | $80 – $180 / month  |
|                            | + PostGIS Extension           |                       | (AWS RDS db.m6g)    |
+----------------------------+-------------------------------+-----------------------+---------------------+
| 6. Compute / Hosting       | 4 vCPU, 8-16 GB Cloud VM      | $0.00 (Local Docker) /| $120 – $280 / month |
|                            | (FastAPI, Worker, Redis)      | $15–$35/mo (Hetzner)  | (2x AWS c6i.large)  |
+----------------------------+-------------------------------+-----------------------+---------------------+
| 7. GPU Acceleration        | LightGBM CPU Multi-threading  | $0.00 (Not required)  | $0.00 (Not required)|
+----------------------------+-------------------------------+-----------------------+---------------------+
| 8. Reverse Proxy & TLS     | Nginx + Let's Encrypt SSL     | $0.00 (Free TLS)      | $0.00 (Free TLS)    |
+----------------------------+-------------------------------+-----------------------+---------------------+
| 9. Telemetry & Metrics     | Prometheus + Grafana OSS      | $0.00 (Self-hosted)   | $0.00 (Self-hosted) |
+----------------------------+-------------------------------+-----------------------+---------------------+
| TOTAL ESTIMATED BUDGET     | ALL COMPONENTS COMBINED       | $0.00 TO $35.00 / MO  | $200 TO $510 / MO   |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Detailed Financial Deployment Paths

### Path A: Zero-Budget Hackathon / Evaluation Path ($0.00 / month)
- **Local Demonstration:** The entire system runs via `docker-compose up -d` on the developer's laptop during jury evaluation. All containers communicate over an internal Docker network with sub-millisecond local loopback latency.
- **Cloud Showcase (Optional Free Tier):**
  - Frontend hosted on **Vercel** (Hobby Free Tier: Unlimited static deploys).
  - Backend API hosted on **Render** or **Hugging Face Spaces** (Docker Free Tier: 2 vCPU, 16 GB RAM).
  - Database on **Neon Tech** or **Supabase** (PostgreSQL Free Tier with PostGIS).
- **Total Expenditure:** **₹0 / $0.00**.

### Path B: High-Reliability Staging Cloud VM ($15 to $35 / month)
- Single high-performance cloud VPS instance on Hetzner Cloud (e.g., `CPX31`: 4 vCPUs AMD EPYC, 8 GB RAM, 160 GB NVMe SSD) or DigitalOcean ($24/month).
- All 5 Docker microservices run on this single host behind an automated Traefik/Nginx reverse proxy with automated Let's Encrypt TLS renewal.
- **Total Expenditure:** **~$25 / month (~₹2,100 INR)**. Highly recommended for a rock-solid online hackathon submission URL.

### Path C: Enterprise Government Production Cloud ($200 to $510 / month)
- High-availability deployment designed for the Ministry of Earth Sciences (MoES) or Delhi Pollution Control Committee (DPCC):
  - 2x Load-balanced API instances on AWS ECS Fargate or EKS: ~$120/mo.
  - Managed AWS Aurora PostgreSQL (PostGIS + TimescaleDB enabled): ~$160/mo.
  - ElastiCache Redis cluster: ~$45/mo.
  - AWS S3 archival storage (5 TB) for historical forecast NetCDF rasters: ~$115/mo.
  - CloudWatch & AWS WAF security: ~$50/mo.
- **Total Expenditure:** **~$490 / month (~₹41,000 INR)**.

This proves to evaluators that ATMOSYNC is both extremely economical to develop today and commercially viable for long-term government adoption.
