# Technology Stack Evaluation & Rationale

**Document ID:** `DOC-03-ARCH-006`  
**System:** ATMOSYNC  
**Scope:** Definitive Technology Stack Justification & Trade-Off Analysis  

---

## 1. Complete Technology Stack Matrix

```
+---------------------------------------------------------------------------------------------------+
| LAYER               | SELECTED TECHNOLOGY       | VERSION    | PRIMARY PURPOSE                    |
+=====================+===========================+============+====================================+
| Frontend Framework  | Next.js (React)           | 14.2+      | Server-rendered interactive web app|
| Frontend Language   | TypeScript                | 5.4+       | Type-safe data & API contracts     |
| Map & GIS Engine    | MapLibre GL JS            | 4.1+       | GPU WebGL vector tiles & streams   |
| Styling & UI        | Vanilla CSS Modules       | CSS3       | High-performance customized theme  |
| Backend API Gateway | FastAPI (Python)          | 0.111+     | Asynchronous REST & WebSockets     |
| Scientific Compute  | NumPy, Pandas, xarray     | Latest     | Multidimensional atmospheric arrays|
| Geospatial Compute  | GeoPandas, Rasterio, Shapely| Latest   | Spatial joins, polygons, rasters   |
| Machine Learning    | LightGBM + PyTorch        | Latest     | Fast tabular trees + PyTorch GNN   |
| Model Explainability| SHAP (TreeSHAP)           | 0.45+      | Feature importance attribution     |
| Relational/Spatial  | PostgreSQL + PostGIS      | 16 + 3.4   | Spatial queries & relational tables|
| Time-Series Engine  | TimescaleDB Extension     | 2.14+      | Hypertables & continuous aggregates|
| In-Memory Cache/Msg | Redis                     | 7.2+       | Sub-millisecond cache & Pub/Sub    |
| Task Orchestration  | Celery + Redis            | 5.4+       | Distributed async task worker queue|
| Containerization    | Docker & Docker Compose   | 26.0+      | Standardized reproducible runtime  |
| Reverse Proxy/TLS   | Nginx                     | 1.25+      | TLS termination, reverse proxy     |
+---------------------+---------------------------+------------+----------------====================+
```

---

## 2. Technology-by-Technology Justification & Trade-Offs

### 2.1 Frontend: Next.js (React) + TypeScript vs. Alternatives
- **Why Selected:** Next.js provides hybrid static and server rendering, eliminating initial page whiteouts while serving fast dashboards. TypeScript enforces strict compile-time types across complex multidimensional forecast structures.
- **Alternatives Considered:**
  - *Vite + Plain React:* Simpler build setup, but lacks built-in server-side caching and API proxy routing.
  - *Streamlit / Dash:* Very fast to prototype in pure Python, but utterly unsuited for high-performance 60 FPS WebGL vector tile map scrubbing, custom particle shaders, and production-grade responsive UI.
- **Trade-off:** Slightly steeper build configuration in exchange for a world-class, responsive, production-ready interface.

### 2.2 Map Engine: MapLibre GL JS vs. Alternatives
- **Why Selected:** MapLibre GL is completely open-source (no proprietary Mapbox token billing limits) and executes hardware-accelerated WebGL vector rendering. It can render thousands of moving wind particles and high-resolution contour polygons simultaneously without dropping below 55 FPS.
- **Alternatives Considered:**
  - *Leaflet.js:* Simpler API, but CPU-bound DOM/SVG rendering stutters and crashes when animating 10,000+ vector wind streamlines over dynamic color heatmaps.
  - *OpenLayers:* Robust, but heavier library footprint and more cumbersome integration with modern React state hooks.

### 2.3 Backend: Python FastAPI vs. Alternatives
- **Why Selected:** Built entirely on `asyncio` and `uvloop`, FastAPI handles high-concurrency non-blocking I/O. Its native integration with Pydantic ensures automatic request/response schema validation and generates auto-documenting OpenAPI 3.1 Swagger docs.
- **Alternatives Considered:**
  - *Django / DRF:* Too heavy and opinionated; synchronous ORM overhead adds unnecessary latency to high-frequency time-series queries.
  - *Node.js / Express:* Excellent for web concurrency, but requires awkward IPC or microservice bridging to execute Python scientific code (xarray, NumPy, LightGBM).

### 2.4 Scientific & Multidimensional Data: xarray + NumPy vs. Alternatives
- **Why Selected:** Meteorological data (GFS, ECMWF, WRF-Chem) is inherently $N$-dimensional ($time \times level \times lat \times lon$). `xarray` brings labeled dimensions, coordinates, and metadata directly to NumPy arrays, enabling intuitive slicing: `ds.sel(lat=28.6, lon=77.2, method='nearest')`.
- **Alternatives Considered:**
  - *Raw NetCDF-C / PyNIO:* Low-level, error-prone, and lacking integration with Pandas DataFrames.

### 2.5 Machine Learning: LightGBM + PyTorch vs. Alternatives
- **Why Selected:**
  - *LightGBM:* Gradient boosted decision trees excel on tabular atmospheric features (lags, solar angle, wind components) with training speeds $10\times$ faster than XGBoost and native support for missing station values.
  - *PyTorch:* Utilized selectively for the Spatiotemporal Graph Neural Network (ST-GNN) where Delhi NCR monitoring stations are represented as nodes connected by spatial distance edges.
- **Alternatives Considered:**
  - *Pure Deep Learning (Transformers / LSTMs alone):* Slower inference, prone to catastrophic forgetting during seasonal transitions, and notoriously hard to interpret for environmental regulators.

### 2.6 Persistence: PostgreSQL 16 + PostGIS + TimescaleDB vs. Alternatives
- **Why Selected:** Consolidates relational metadata (stations, alerts, model configs), geospatial geometries (fire coordinates, plume polygons, boundary buffers), and high-frequency time-series observations into a **single, unified database**.
- **Alternatives Considered:**
  - *Separate MongoDB (Geo) + InfluxDB (Time-Series) + Postgres (Relational):* Creates massive distributed operational complexity, multi-database sync failures, and complex transaction rollbacks.

### 2.7 Task Queue: Celery + Redis vs. Alternatives
- **Why Selected:** Ingesting multi-megabyte GRIB2 meteorological files and running 72-hour forecast batches cannot block web API request threads. Celery provides battle-tested distributed worker task management with automated retry backoffs and task timeouts.

---

## 3. Document Sign-off
- **Lead Systems Architect:** Approved
- **Next Directory:** Scientific Model & Atmospheric Physics (`docs/04-scientific-model/`)
