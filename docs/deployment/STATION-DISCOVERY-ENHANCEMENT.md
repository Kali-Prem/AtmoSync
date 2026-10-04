# ATMOSYNC — Station Discovery & Visibility Enhancement Report
**Smart India Hackathon 2026 — Problem Statement SIH-26082**  
*Coupled Air Pollution & Atmospheric Inversion Forecasting System for Delhi NCR*

---

## 1. Executive Summary

This update delivers an incremental, production-safe enhancement to the ATMOSYNC monitoring station experience across the command center dashboard (`/`) and station registry (`/stations`).

### Core Accomplishments
1. **Preserved Existing Baseline**: The 5 default anchor stations continue to serve as the default ground truth across the dashboard.
2. **2–3 Experimental Stations Added**: Integrated 3 official Continuous Ambient Air Quality Monitoring Stations (CAAQMS) operated by the Delhi Pollution Control Committee (DPCC) as experimental discovery nodes:
   - `DL_MAJOR_DHYAN_CHAND`: Major Dhyan Chand National Stadium, Delhi (Central Delhi)
   - `DL_ALIPUR`: Alipur, Delhi (North Delhi)
   - `DL_VIVEK_VIHAR`: Vivek Vihar, Delhi (East Delhi)
3. **Visibility & Anchor State Separation**: Explicit `is_default_anchor` boolean flag introduced in database models, seed datasets, and API schemas.
4. **Natural "Show More" Exploration**: Dashboard presents exactly 5 anchor stations by default; users can toggle "Show More Stations" (+18 additional monitors) and "Show Fewer Stations" without page reload or extra API roundtrips.
5. **Universal Fast Station Search**: Instant, case-insensitive, whitespace-tolerant station search supporting station code, station name, provider, and region. Hidden experimental stations are discoverable through search immediately without requiring "Show More".
6. **Zero Telemetry Fabrication**: Telemetry is strictly rendered only when authentic ground observations exist. Unmonitored or experimental stations clearly display `"No telemetry available"` and `"—"` rather than synthetic or fabricated values.
7. **Production API URL Preserved**: Frontend continues communicating with `https://atmosync-api.onrender.com`.

---

## 2. Anchor vs. Experimental Stations Matrix

| Station Code | Station Name | Network Provider | Region | Classification | `is_default_anchor` | Telemetry Source |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `DL_ANAND_VIHAR` | Anand Vihar, Delhi | DPCC | Delhi-East | Urban Industrial/Transport Hotspot | **`true`** | Historical Winter Benchmark (Real ERA5 & CAMS) |
| `DL_PUNJABI_BAGH`| Punjabi Bagh, Delhi | DPCC | Delhi-West | Urban Residential Hotspot | **`true`** | Historical Winter Benchmark (Real ERA5 & CAMS) |
| `DL_RK_PURAM` | R.K. Puram, Delhi | DPCC | Delhi-South | Urban Residential Baseline | **`true`** | Historical Winter Benchmark (Real ERA5 & CAMS) |
| `DL_IGI_AIRPORT` | IGI Airport (T3), Delhi | IMD | Delhi-SouthWest| Commercial / Aerodrome Boundary | **`true`** | Historical Winter Benchmark (Real ERA5 & CAMS) |
| `DL_BAWANA` | Bawana, Delhi | DPCC | Delhi-NorthWest| Industrial Hotspot | **`true`** | Historical Winter Benchmark (Real ERA5 & CAMS) |
| `DL_MAJOR_DHYAN_CHAND` | Major Dhyan Chand Stadium | DPCC | Delhi-Central | Experimental Demo Station | **`false`** | No telemetry available (Awaiting live ingestion) |
| `DL_ALIPUR` | Alipur, Delhi | DPCC | Delhi-North | Experimental Demo Station | **`false`** | No telemetry available (Awaiting live ingestion) |
| `DL_VIVEK_VIHAR` | Vivek Vihar, Delhi | DPCC | Delhi-East | Experimental Demo Station | **`false`** | No telemetry available (Awaiting live ingestion) |

*Note: The remaining 15 pre-seeded standard CAAQMS stations in Delhi NCR (Jahangirpuri, Mandir Marg, Dwarka Sec-8, Okhla Ph-2, Wazirpur, Lodhi Road, Siri Fort, Rohini Sec-16, Ashok Vihar, Najafgarh, Noida Sec-62, Ghaziabad Vasundhara, Gurugram Sec-51, Faridabad NIT, Aya Nagar) are configured with `is_default_anchor: false`.*

---

## 3. Station Visibility & Search Architecture

Filtering logic is centralized and unidirectional:

```text
                     Complete Station Registry (23 Stations)
                                      │
                                      ▼
                        [ Central Search Filter ]
                   (Matches station_name, station_code,
                      region, or provider substring)
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
         Search Query Active                     Search Query Empty
                 │                                         │
                 ▼                                         ▼
      Matching Stations Shown                   [ Visibility Filter ]
  (Includes experimental & hidden                         │
        stations instantly)                ┌───────────────┴───────────────┐
                                           ▼                               ▼
                                  Show More = false               Show More = true
                                           │                               │
                                           ▼                               ▼
                                 5 Default Anchors               All 23 Stations in
                               (Anand Vihar, Punjabi Bagh,         Canonical Order
                                RK Puram, IGI Airport, Bawana)
```

### Truth Table of User Interactions

| User State | Search Field | "Show More" State | Stations Displayed | Count |
| :--- | :---: | :---: | :--- | :---: |
| **Initial Dashboard Load** | Empty | Collapsed (`false`) | 5 Default Anchor Stations | Exactly 5 |
| **Show More Clicked** | Empty | Expanded (`true`) | 5 Anchors + 18 Additional Stations | Exactly 23 |
| **Show Fewer Clicked** | Empty | Collapsed (`false`) | 5 Default Anchor Stations | Exactly 5 |
| **Search Active (Visible)** | `"Anand"` | Any | `DL_ANAND_VIHAR` | 1 |
| **Search Active (Hidden)** | `"Alipur"` | Collapsed (`false`) | `DL_ALIPUR` (Appears without Show More) | 1 |
| **Search Active (Prefix)** | `"DL_"` | Any | All matching stations in registry | 20+ |
| **Search Miss** | `"XYZ_NON_EXISTENT"` | Any | Empty State: "No stations found" | 0 |
| **Search Cleared** | Cleared (`""` or `×`) | Preserves previous toggle | Returns to Default 5 (or 23 if Show More on) | 5 (or 23) |

---

## 4. Telemetry Handling & Physical Integrity

Under strict physical integrity rules, the system **never invents or fabricates synthetic pollutant measurements**:
- **Anchors with Observation Records**: Display exact PM2.5, PM10, NO2, Temperature, Wind Speed, PBL Height, and calculated Inversion Trapping Severity Index (ITSI) with statutory NAQI color formatting.
- **Experimental & Registry-Only Stations**:
  - Particulate & Gas concentrations render as `—`.
  - PBL Height and Meteorology render as `—`.
  - Trapping Index (ITSI) renders as a clean neutral badge: `<span class="badge badge-neutral">No telemetry available</span>`.
  - Action column renders as `<span class="text-muted">Demo Node</span>` or `<span class="text-muted">Registry Only</span>`.
  - Station column features a designated badge: `<span class="badge badge-neutral">Experimental</span>`.

---

## 5. Backend API Enhancements

### `GET /api/v1/locations/stations`
- **New Query Parameter**: `is_default_anchor: Optional[bool] = None`
  - `GET /api/v1/locations/stations?is_default_anchor=true`: Returns strictly the 5 default anchor stations.
  - `GET /api/v1/locations/stations?is_default_anchor=false`: Returns the 18 non-anchor stations.
  - `GET /api/v1/locations/stations`: Returns all 23 active monitoring stations.
- **Backwards Compatibility**: Returns array of station objects conforming to `MonitoringStationRead`. All existing frontend consumers continue to function without modification.
- **Database Schema**: Added `is_default_anchor: Boolean` column with automatic SQLite / PostgreSQL table column migration fallback in [`database/seed_data.py`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/database/seed_data.py).

---

## 6. Verification & Automated Test Results

### 1. Backend Test Suite (`pytest -v`)
```text
tests/api/test_api_endpoints.py::test_get_stations PASSED [ 4%]
tests/api/test_api_endpoints.py::test_station_discovery_enhancement_and_anchors PASSED [ 6%]
tests/api/test_db_initialization.py::test_seed_lifecycle_and_idempotence PASSED [ 25%]
tests/api/test_db_initialization.py::test_seed_on_uninitialized_database_recovery PASSED [ 26%]
tests/api/test_db_initialization.py::test_api_locations_routes_with_seeded_db PASSED [ 28%]
============================== 63 passed in 2.05s ==============================
```

### 2. Frontend Type Integrity & Production Build
- `npx tsc --noEmit`: **0 errors, 0 warnings**.
- `npm run build`: **Compiled successfully** across all 12 static/dynamic Next.js routes.

### 3. Acceptance Verification Checklist
- [x] **Test A (Default Dashboard)**: Renders exactly 5 default anchor stations.
- [x] **Test B (Show More)**: Toggles smoothly between 5 anchor stations and all 23 stations. Button flips naturally between "Show More Stations (+18 Additional Monitors)" and "Show Fewer Stations".
- [x] **Test C (Search Visible Station)**: Searching `"Anand"` finds `DL_ANAND_VIHAR` with full verified telemetry.
- [x] **Test D (Search Hidden Station)**: Searching `"Alipur"` reveals `DL_ALIPUR` immediately with "Experimental" badge and "No telemetry available" without clicking "Show More".
- [x] **Test E (Search Empty State)**: Searching `"XYZ_NON_EXISTENT"` renders clean empty state with clear button.
- [x] **Test F (Clear Search)**: Pressing `×` or clearing text restores default view instantly.
- [x] **Test G (Production API)**: Client retains `https://atmosync-api.onrender.com` as production origin without localhost leakage.
- [x] **Stations Registry Page (`/stations`)**: Integrated universal station registry search across all 23 CAAQMS monitors.

---

## 7. Future Extensibility Roadmap

The unified station architecture easily scales to future phases:
1. **Regional Grouping**: Expand registry with Haryana NCR, UP NCR, and Rajasthan NCR clusters.
2. **Station Categorization**: Filter by industrial, traffic hotspot, residential, or background nodes.
3. **Sensor Integration**: Seamlessly connect low-cost sensor networks alongside CAAQMS reference monitors.
4. **User Favorites & Comparison**: Retain client-side saved stations using local storage bindings without schema alterations.
