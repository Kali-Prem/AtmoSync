# Component Architecture Specification

**Document ID:** `DOC-03-ARCH-004`  
**System:** ATMOSYNC  
**Scope:** Internal Modular Decomposition & Service Contracts  

---

## 1. Modular Subsystem Decomposition

The software architecture is divided into five core loosely-coupled subsystems:

```
+--------------------------------------------------------------------------------------------------+
|                                    SUBSYSTEM DECOMPOSITION                                       |
+==================================================================================================+
| 1. atmosync-ingest:                                                                              |
|    - CpcbStationCollector: Scrapes / polls ground CAAQMS APIs.                                   |
|    - NwpWeatherCollector: Downloads GFS / ECMWF Open Data GRIB2 files.                          |
|    - SatelliteFireCollector: Ingests NASA FIRMS active fire hotspots.                            |
|    - DataCleanser: Outlier filtering, gap interpolation, and schema validation.                 |
+--------------------------------------------------------------------------------------------------+
| 2. atmosync-physics:                                                                             |
|    - VerticalProfileAnalyzer: Calculates theta_v, wind shear, and lapse rates.                   |
|    - PblInversionCalculator: Solves Bulk Richardson equations and classifies stability.          |
|    - VentilationIndexModule: Computes horizontal & vertical atmospheric cleansing potential.    |
|    - StubblePlumeSimulator: Implements Lagrangian forward puff advection and dispersion.         |
+--------------------------------------------------------------------------------------------------+
| 3. atmosync-ml:                                                                                  |
|    - FeatureStore: Materializes multi-source training/inference feature matrices.                |
|    - ModelRegistry: Manages versioned LightGBM and Spatiotemporal GNN weights.                   |
|    - DownscalingEngine: Executes 72-hour multi-pollutant inference for 40+ stations & 1km grid. |
|    - PostProcessingGuardrails: Enforces mass non-negativity and PM2.5 <= PM10 constraints.      |
|    - ExplainabilityAttributor: Generates TreeSHAP feature importance vectors per forecast step. |
+--------------------------------------------------------------------------------------------------+
| 4. atmosync-api:                                                                                 |
|    - StationController: Endpoints for current obs and station-level 72h curves.                  |
|    - ForecastController: Gridded NetCDF/GeoJSON slices across lead times T+1 to T+72.            |
|    - DiagnosticController: Inversion status, PBL height, and ventilation index endpoints.       |
|    - PlumeController: Active fire footprints, smoke trajectory polygons, and arrival ETAs.      |
|    - AlertController: GRAP stage compliance warnings and WebSocket event dispatchers.            |
+--------------------------------------------------------------------------------------------------+
| 5. atmosync-dashboard:                                                                           |
|    - MapEngine: MapLibre GL wrapper with custom WebGL particle streamline shader.               |
|    - TimelineScrubber: Global 72-hour playback controller (Now -> +72h).                         |
|    - StationModal: Multi-pollutant drill-down chart component with confidence intervals.        |
|    - ExplainabilityDrawer: Interactive SHAP factor attribution breakdown charts.                 |
|    - AlertBanner: Real-time GRAP warning notifications.                                          |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Component Interaction & Interfaces

```mermaid
classDiagram
    class CpcbStationCollector {
        +fetch_latest_observations() List~RawObservation~
        +validate_schema(data) ValidatedObservation
    }

    class NwpWeatherCollector {
        +download_grib2_cycle(cycle: str) Path
        +extract_delhi_ncr_subset(path: Path) xarray.Dataset
    }

    class PblInversionCalculator {
        +compute_virtual_potential_temp(T, P, q) ndarray
        +calculate_bulk_richardson(theta_v, u, v, z) ndarray
        +diagnose_pblh(ri_profile) float
        +diagnose_inversion_class(lapse_rate_300m) str
    }

    class StubblePlumeSimulator {
        +cluster_active_fires(fire_points) List~FireCluster~
        +estimate_injection_height(frp) float
        +advect_puffs_72h(clusters, wind_field) List~PlumePolygon~
        +calculate_delhi_mass_loading(plume) float
    }

    class DownscalingEngine {
        +build_feature_tensor(station_id, horizon_h) FeatureVector
        +predict_multi_pollutant(features) PredictionResult
        +enforce_physical_guardrails(prediction) PredictionResult
    }

    class ExplainabilityAttributor {
        +compute_shap_contributions(model, features) Dict~str, float~
    }

    class FastAPIApp {
        +get_current_station_aqi(station_id) JSON
        +get_72h_station_forecast(station_id) JSON
        +get_gridded_layer(pollutant, horizon) GeoJSON
        +get_active_alerts() List~Alert~
    }

    CpcbStationCollector --> DownscalingEngine : Ingested Observations
    NwpWeatherCollector --> PblInversionCalculator : 3D Wind & Temp
    PblInversionCalculator --> DownscalingEngine : PBLH & Inversion Index
    NwpWeatherCollector --> StubblePlumeSimulator : Wind Vector Field
    StubblePlumeSimulator --> DownscalingEngine : Plume Mass Term
    DownscalingEngine --> ExplainabilityAttributor : Model & Inputs
    DownscalingEngine --> FastAPIApp : Forecast Database
```

---

## 3. Data Contracts & Payload Schemas

### 3.1 Station Forecast Contract (`StationForecastResponse`)
```json
{
  "station_id": "DEL_ANAND_VIHAR",
  "station_name": "Anand Vihar, Delhi - DPCC",
  "coordinates": {"lat": 28.6508, "lon": 77.3152},
  "generated_at": "2026-11-04T06:00:00Z",
  "forecast_horizon_hours": 72,
  "data": [
    {
      "horizon_hour": 1,
      "forecast_timestamp": "2026-11-04T07:00:00Z",
      "pm25": 284.5,
      "pm10": 412.0,
      "o3": 18.2,
      "nox": 142.6,
      "aqi": 421,
      "aqi_category": "Severe",
      "pblh_meters": 115.0,
      "inversion_status": "Strong",
      "wind_speed_mps": 1.1,
      "wind_direction_deg": 315.0,
      "attribution": {
        "inversion_trapping": 42.0,
        "stubble_plume": 32.5,
        "wind_stagnation": 15.5,
        "local_emissions": 10.0
      }
    }
  ]
}
```

---

## 4. Document Sign-off
- **Lead Software Architect:** Approved
- **Next Document:** Deployment Architecture (`docs/03-system-architecture/deployment-architecture.md`)
