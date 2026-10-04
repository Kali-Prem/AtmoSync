# Data Normalization & Canonical Schema Specification

**Document ID:** `DOC-ENG-004`  
**Phase:** Phase 3 — Project Foundation & Data Engineering Setup  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Implementation-Ready  

---

## 1. Normalization Purpose & Mapping Workflow

External environmental providers publish datasets across divergent coordinate systems, incompatible units, non-standard timestamp representations, and conflicting variable naming conventions.

The **Normalization Layer** ingests raw provider-specific objects and maps them into an immutable **Canonical Internal Schema**:

```
External Dataset (OpenAQ, Open-Meteo, NASA FIRMS, CPCB)
                       ↓
         Provider-Specific Parser
                       ↓
          Canonical Transformation
                       ↓
  [ Canonical Internal Data Contract ]
    - Timestamps: UTC ISO-8601 (e.g., 2026-10-03T06:00:00Z)
    - Coordinates: WGS84 Decimal Degrees (EPSG:4326)
    - Standard Metric Units (ug/m3, mg/m3, °C, m/s, hPa, meters)
    - Standard Pollutant Codes (PM2.5, PM10, NO2, O3, CO, SO2, NH3)
```

---

## 2. Unit Normalization Matrix

```
+---------------------------------------------------------------------------------------------------------+
|                                    CANONICAL UNIT NORMALIZATION MATRIX                                  |
+=========================================================================================================+
| VARIABLE                   | EXTERNAL INPUT UNIT           | CANONICAL UNIT     | CONVERSION FORMULA    |
+----------------------------+-------------------------------+--------------------+-----------------------+
| PM2.5 & PM10               | ug/m3 or mg/m3                | ug/m3              | if mg/m3: val * 1000  |
| Carbon Monoxide (CO)       | ppm or ug/m3 or mg/m3         | mg/m3              | if ppm: val * 1.145   |
|                            |                               |                    | (at 25°C, 1 atm)      |
| Nitrogen Dioxide (NO2)     | ppb or ug/m3                  | ug/m3              | if ppb: val * 1.88    |
| Ozone (O3)                 | ppb or ug/m3                  | ug/m3              | if ppb: val * 1.96    |
| Sulphur Dioxide (SO2)      | ppb or ug/m3                  | ug/m3              | if ppb: val * 2.62    |
| Ambient Temperature        | Kelvin (K) or Fahrenheit (°F) | Celsius (°C)       | if K: val - 273.15    |
|                            |                               |                    | if °F: (val-32) * 5/9 |
| Wind Speed                 | km/h or knots                 | m/s                | if km/h: val / 3.6    |
|                            |                               |                    | if knots: val * 0.5144|
| Atmospheric Pressure       | Pascals (Pa) or mm Hg         | hPa / mbar         | if Pa: val / 100.0    |
| Boundary Layer Height      | Meters ASL or feet            | Meters AGL (m)     | z_agl = z_asl - elev  |
| Fire Radiative Power (FRP) | Watts or Kilowatts            | Megawatts (MW)     | if kW: val / 1000.0   |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Timestamp Normalization Standards

1. **Internal Storage & Wire APIs:** All timestamps are strictly converted to **UTC timezone** with timezone-aware ISO-8601 formatting:
   `YYYY-MM-DDTHH:MM:SSZ` (e.g. `2026-11-04T02:30:00Z`).
2. **Indian Standard Time (IST) Offset:** When displaying times to Indian environmental regulators on the dashboard, timestamps are projected to `Asia/Kolkata` (UTC + 05:30) with explicit timezone annotation:
   `08:00 IST (02:30 UTC)`.
3. **Sub-Hour Rounding:** 15-minute sensor readings are aggregated to the top of the hour using arithmetic averaging when building hourly model training tensors.
