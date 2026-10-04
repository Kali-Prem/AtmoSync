# System Architecture Specification

**Document ID:** `DOC-03-ARCH-001`  
**System:** ATMOSYNC  
**Architecture Pattern:** Event-Driven Hybrid Coupled Microservices  

---

## 1. High-Level Architectural Overview

The **ATMOSYNC** architecture bridges the gap between high-fidelity continuous atmospheric numerical modeling and low-latency operational web dissemination. It employs a **Tiered Dual-Engine (Physics + AI/ML)** architecture:

```mermaid
graph TB
    subgraph Layer 1: Ingestion & Telemetry (Data Acquisition)
        D1[CPCB / DPCC CAAQMS Endpoints<br/>~40 Stations]
        D2[IMD-GFS / ECMWF NWP<br/>3D Meteorological Grids]
        D3[NASA FIRMS / VIIRS 375m<br/>Thermal Fire Anomalies]
        D4[Copernicus CAMS<br/>AOD & Boundary Chemistry]
    end

    subgraph Layer 2: ETL & Normalization Workers
        W1[Air Quality Normalizer]
        W2[GRIB2/NetCDF Extractor]
        W3[Fire Clustering & FRP Aggregator]
        W4[AOD Regridder]
    end

    subgraph Layer 3: Persistence & Caching
        DB[(PostgreSQL 16 + PostGIS<br/>TimescaleDB Hypertables)]
        REDIS[(Redis 7.2 In-Memory Cache<br/>Pub/Sub & API Caching)]
        OBJ[S3/MinIO Object Storage<br/>Raw NetCDF & Model Checkpoints]
    end

    subgraph Layer 4: Coupled Modeling & Analytics Core
        PBL_CORE[PBL & Inversion Diagnostic Engine<br/>Bulk Richardson / Lapse Rate]
        PLUME_CORE[Lagrangian Smoke Plume Engine<br/>Puff Advection & Dispersion]
        HYBRID_ML[Physics-Informed Downscaling & ML<br/>LightGBM + Temporal GNN]
        XAI_CORE[Explainability Engine<br/>SHAP Feature Attribution]
        ALERT_ENG[Proactive GRAP Alert Engine]
    end

    subgraph Layer 5: Application Gateway & APIs
        GATEWAY[FastAPI Asynchronous Gateway<br/>REST + WebSockets]
    end

    subgraph Layer 6: Frontend & Dissemination
        UI[Next.js 14 / React Dashboard<br/>MapLibre GL Vector Map]
        PDF[Automated Briefing Generator<br/>MoES / CAQM Daily Bulletins]
    end

    D1 --> W1
    D2 --> W2
    D3 --> W3
    D4 --> W4

    W1 & W2 & W3 & W4 --> DB
    W2 --> OBJ

    DB --> PBL_CORE
    DB & W3 --> PLUME_CORE
    PBL_CORE & PLUME_CORE & DB --> HYBRID_ML
    HYBRID_ML --> XAI_CORE
    HYBRID_ML --> ALERT_ENG

    HYBRID_ML & PBL_CORE & PLUME_CORE & ALERT_ENG --> DB
    DB --> REDIS
    REDIS --> GATEWAY
    GATEWAY --> UI
    GATEWAY --> PDF
```

---

## 2. Core Architectural Subsystems

### 2.1 Ingestion & Normalization Subsystem (Worker Tier)
- **Role:** Autonomous asynchronous workers polling external institutional APIs and data repositories.
- **Resilience:** Implements exponential backoff retries, dead-letter queues, and schema validators (Pydantic).
- **Format Normalization:** Translates binary GRIB2/NetCDF-4 files into aligned numerical multidimensional arrays (xarray) and tabular sensor payloads into TimescaleDB relational records.

### 2.2 Physical Diagnostic Subsystem
- **Role:** Executes exact fluid-dynamical and thermodynamic calculations directly on vertical atmospheric profiles.
- **Key Computations:**
  - Bulk Richardson Number ($Ri_b$) profile calculation.
  - Planetary Boundary Layer Height ($PBLH$) diagnosis.
  - Temperature Inversion strength ($\frac{\partial T}{\partial z}$) in the lowest $300\text{ m}$.
  - Ventilation Index ($VI = PBLH \times \text{Wind Speed}$).

### 2.3 Regional Plume Transport Subsystem
- **Role:** Lagrangian puff forward trajectory simulation.
- **Dynamics:** Uses Fire Radiative Power (FRP) from satellite detections in Punjab/Haryana to compute source emission strength and plume-rise injection height. Advects smoke puffs using 3D wind velocity fields toward Delhi NCR, projecting spatial footprint and arrival times.

### 2.4 Physics-Informed ML Forecasting Subsystem
- **Role:** Downscales regional fields to $1\text{ km} \times 1\text{ km}$ and individual station points, correcting localized biases.
- **Physics Coupling:** The ML model is constrained by physical features (PBLH, $Ri_b$, ventilation index, solar radiation, advected plume mass) and non-negative stoichiometric constraints ($PM_{2.5} \le PM_{10}$).

### 2.5 Presentation & Dissemination Subsystem
- **Role:** High-performance web application built with Next.js and MapLibre GL.
- **Capabilities:** Hardware-accelerated dynamic vector wind streamlines, color-contoured pollutant heatmaps, interactive 72-hour timeline scrubber ($T+0$ to $T+72$), and explainability factor breakdown panels.

---

## 3. Communication Patterns & Protocols

| Interaction | Protocol | Payload Type | Latency Expectation |
| :--- | :--- | :--- | :--- |
| Ingestion Polling | HTTPS / FTP | GRIB2 / NetCDF / JSON | $10\text{ s} - 60\text{ s}$ batch |
| Worker to Database | PostgreSQL Wire (asyncpg) | Relational Tuples | $< 5\text{ ms}$ |
| API to Client | HTTPS (REST) | JSON / GeoJSON | $< 150\text{ ms}$ |
| Real-time Alerts | WebSockets (WSS) | JSON Event Stream | $< 50\text{ ms}$ push |
| Vector Map Tiles | HTTP/2 | Mapbox Vector Tile (MVT) / PBF | $< 120\text{ ms}$ |

---

## 4. Architectural Quality Attributes

1. **Decoupled Evolution:** The scientific modeling engine, data ingestion tier, and web presentation layer communicate solely through well-defined database schemas and REST APIs. Scientific algorithms can be updated without frontend changes.
2. **Zero-Downtime Resilience:** If numerical ingestion or satellite feeds fail, the system serves cached forecasts with explicit uncertainty flags while alerting system operators.
3. **Observability by Design:** Distributed trace headers (`X-Trace-ID`) propagate from ingestion workers through database commits to API responses.

---

## 5. Document Sign-off
- **Lead Software Architect:** Approved
- **Next Document:** Architecture Decision Records (`docs/03-system-architecture/architecture-decisions.md`)
