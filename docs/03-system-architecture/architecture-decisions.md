# Architecture Decision Records (ADR)

**Document ID:** `DOC-03-ARCH-002`  
**System:** ATMOSYNC  
**Status:** All ADRs Accepted & Approved  

---

## Index of Decisions
- [ADR-001: Tiered Dual-Engine (Physics + AI/ML) Architecture](#adr-001-tiered-dual-engine-physics--aiml-architecture)
- [ADR-002: WRF-Chem Integration & Hybrid Operational Strategy](#adr-002-wrf-chem-integration--hybrid-operational-strategy)
- [ADR-003: Physics-Informed Machine Learning & Ensembling Strategy](#adr-003-physics-informed-machine-learning--ensembling-strategy)
- [ADR-004: Persistence Tier: PostgreSQL + PostGIS + TimescaleDB](#adr-004-persistence-tier-postgresql--postgis--timescaledb)
- [ADR-005: Frontend Application Framework: Next.js (React) + TypeScript](#adr-005-frontend-application-framework-nextjs-react--typescript)
- [ADR-006: Geospatial Visualization: MapLibre GL JS + WebGL Custom Layers](#adr-006-geospatial-visualization-maplibre-gl-js--webgl-custom-layers)
- [ADR-007: Deployment & Compute Strategy: Containerized Microservices](#adr-007-deployment--compute-strategy-containerized-microservices)

---

## ADR-001: Tiered Dual-Engine (Physics + AI/ML) Architecture

### Context
Standard numerical weather-chemistry models (WRF-Chem) resolve physical fluid dynamics and chemical kinetics with high fidelity but require massive HPC clusters (128+ cores) and 2 to 4 hours of execution time for a 72-hour forecast run. Conversely, pure "black-box" machine learning models run in milliseconds but lack physical conservation laws, producing severe errors during unprecedented atmospheric inversions or sudden synoptic shifts.

### Decision
Adopt a **Tiered Dual-Engine Architecture**:
1. Global and regional numerical weather predictions (IMD-GFS / ECMWF) provide physically consistent macro-scale thermodynamic and wind fields.
2. A physical diagnostic layer computes exact vertical atmospheric metrics (Bulk Richardson Number, Planetary Boundary Layer Height, lapse rates).
3. A physics-informed machine learning downscaler and bias-corrector generates station-level and $1\text{ km} \times 1\text{ km}$ predictions constrained by these physical metrics and emission inventories.

### Alternatives Considered
1. *Pure 3D WRF-Chem Operational Run on Server:* Rejected due to unacceptable computational latency (hours) and inability to execute on standard cloud/edge nodes for real-time SIH evaluation.
2. *Pure Statistical / Black-Box ML (e.g. Standard LSTM):* Rejected due to failure to respect physical laws (mass conservation, radiative feedback, boundary layer trapping).

### Reasoning
Provides the best of both worlds: rigorous atmospheric physics and low-latency operational responsiveness ($< 3\text{ minutes}$ update cycle).

### Consequences
- Requires rigorous feature alignment between continuous spatial fields and point station sensors.
- Enables deployment on standard cloud instances while remaining architecturally ready to ingest live supercomputer WRF-Chem outputs in production.

### Status
**ACCEPTED**

---

## ADR-002: WRF-Chem Integration & Hybrid Operational Strategy

### Context
Problem Statement 26082 specifically emphasizes advanced coupled models such as WRF-Chem. However, executing full WRF-Chem runs online during a hackathon or on developer laptops is computationally infeasible.

### Decision
Structure WRF-Chem integration via a **Hybrid Decoupled Bridge**:
1. Construct and validate complete WRF-Chem configuration blueprints, domain nesting files (`namelist.wps`, `namelist.input`), emission prep scripts (anthro_emiss, fire_emiss), and chemistry mechanism specifications (RADM2-MADE/SORGAM or MOZART-MOSAIC).
2. For demonstration and benchmark validation, generate pre-computed WRF-Chem high-resolution runs for critical winter episodes (e.g., November 2023 severe inversion and stubble episode).
3. In the live operational pipeline, ingest open numerical forecast grids (GFS/ECMWF) and pass them through our physical boundary layer module as surrogate numerical forcing.

### Alternatives Considered
1. *Simulating WRF-Chem with Mock Random Numbers:* Strictly rejected as dishonest and scientifically invalid.
2. *Running Full WRF-Chem Live on a Laptop:* Rejected as physically impossible (a 72-hour coupled 3-domain run requires $>64\text{ GB}$ RAM and hours of multi-node CPU time).

### Reasoning
Ensures complete scientific credibility, provides full WRF-Chem operational runbooks for NCMRWF deployment, and guarantees a responsive, reliable SIH live demonstration.

### Consequences
Requires maintaining both offline WRF-Chem benchmark datasets and an agile online physical diagnostic engine.

### Status
**ACCEPTED**

---

## ADR-003: Physics-Informed Machine Learning & Ensembling Strategy

### Context
Downscaling regional forecasts to $1\text{ km}$ and 40+ CAAQMS monitoring stations requires capturing non-linear relationships between weather, emissions, and chemical reactions.

### Decision
Implement an ensemble of **Gradient Boosted Decision Trees (LightGBM / XGBoost)** combined with a **Spatiotemporal Graph Neural Network (ST-GNN)**:
- Tabular GBDTs excel on dense heterogeneous features (lagged pollutant concentrations, temperature, wind components, boundary layer height, inversion indices).
- Physics-informed loss penalties penalize non-physical outputs (e.g., negative concentrations, $PM_{2.5} > PM_{10}$, or ozone surges during midnight hours).

### Alternatives Considered
1. *Standard Multi-Layer Perceptron (MLP):* Inferior performance on tabular time-series features.
2. *Pure Transformer (e.g., Informer/Autoformer):* Prone to severe overfitting on short historical observation records (~3 years of station data) and high inference latency.

### Reasoning
LightGBM delivers microsecond inference, superior handling of missing station features, and direct interpretability via TreeSHAP.

### Consequences
Requires rigorous time-based split validation to prevent temporal data leakage.

### Status
**ACCEPTED**

---

## ADR-004: Persistence Tier: PostgreSQL + PostGIS + TimescaleDB

### Context
The platform stores high-frequency time-series observations (40+ stations $\times$ 10 parameters $\times$ 8760 hours/year), geospatial boundary polygons (NCR borders, fire coordinates, plume polygons), and 72-hour gridded forecast arrays.

### Decision
Deploy **PostgreSQL 16** with **PostGIS 3.4** and **TimescaleDB** extensions:
- TimescaleDB Hypertables handle temporal chunking, automated compression, and fast aggregation queries.
- PostGIS provides spatial indexing (`ST_DWithin`, `ST_Intersects`, R-Tree indexes) for geospatial proximity and plume intersection.

### Alternatives Considered
1. *Pure NoSQL (MongoDB):* Weak spatial spatial-temporal joint querying; poor support for analytical time-series compression.
2. *InfluxDB:* Excellent for pure time-series, but lacks native GIS spatial topology and complex relational joins.

### Reasoning
A unified database engine eliminates distributed transaction overhead and provides best-in-class spatial and time-series performance.

### Consequences
Requires careful hypertable chunk sizing (7 days recommended) and spatial indexing on station locations and fire hotspots.

### Status
**ACCEPTED**

---

## ADR-005: Frontend Application Framework: Next.js (React) + TypeScript

### Context
The dashboard requires server-side rendering for initial load performance, dynamic client-side WebGL canvas rendering for animated wind and heatmaps, and strict type safety across scientific payloads.

### Decision
Build the web application using **Next.js 14 (App Router) + React + TypeScript + Vanilla CSS Modules / Tailwind**:
- TypeScript guarantees strict typing of multi-pollutant forecast schemas.
- Server Components optimize initial page load; Client Components manage interactive map state and timeline scrubber playback.

### Alternatives Considered
1. *Vue.js / Nuxt:* Excellent, but smaller ecosystem for specialized scientific WebGL GIS wrappers.
2. *Plain Vanilla HTML/JS:* Difficult to maintain complex state across multi-station drill-downs, layer pickers, and timeline scrubbers.

### Reasoning
Industry-standard framework offering optimal performance, developer productivity, and robust ecosystem for high-density dashboards.

### Status
**ACCEPTED**

---

## ADR-006: Geospatial Visualization: MapLibre GL JS + WebGL Custom Layers

### Context
Displaying 72-hour forecasts over Delhi NCR requires rendering high-resolution color-contoured pollutant heatmaps, 40+ interactive station markers, satellite fire markers, and thousands of animated wind vector particles simultaneously at 60 FPS.

### Decision
Use **MapLibre GL JS** (open-source fork of Mapbox GL) augmented with a custom **WebGL Canvas Layer** for animated wind streamlines.

### Alternatives Considered
1. *Leaflet.js:* Excellent for basic markers, but struggles with large-scale animated particle fields and vector heatmaps (CPU-bound Canvas/SVG).
2. *OpenLayers:* Highly capable GIS tool, but heavier bundle size and steeper learning curve compared to MapLibre GL.

### Reasoning
MapLibre GL JS utilizes GPU-accelerated WebGL vector tile rendering, providing butter-smooth 60 FPS map panning, zooming, and dynamic data re-coloring during timeline scrubbing.

### Status
**ACCEPTED**

---

## ADR-007: Deployment & Compute Strategy: Containerized Microservices

### Context
The system must be easily deployable on developer workstations for SIH hackathon evaluation, cloud virtual machines for staging, and containerized HPC nodes for NCMRWF operational deployment.

### Decision
Package all components into modular **Docker containers** managed via **Docker Compose** (for local/demo) and **Kubernetes manifests / Helm charts** (for production):
- Service 1: `frontend` (Next.js Node.js container)
- Service 2: `backend-api` (FastAPI Python container)
- Service 3: `forecast-worker` (Physics + ML Python worker container)
- Service 4: `database` (PostgreSQL + TimescaleDB + PostGIS container)
- Service 5: `cache` (Redis container)

### Alternatives Considered
1. *Monolithic Single-Process VM:* Hard to maintain; dependency conflicts between Python scientific libraries (GDAL, NetCDF4) and web services.
2. *Serverless (AWS Lambda):* Cold starts and 15-minute execution limits disrupt continuous numerical ingestion and large ML model loading.

### Reasoning
Ensures 100% reproducible environments across diverse operating systems without "it works on my machine" issues.

### Status
**ACCEPTED**

---

## Document Sign-off
- **Lead Systems Architect:** Approved
- **Next Document:** Data Flow Specification (`docs/03-system-architecture/data-flow.md`)
