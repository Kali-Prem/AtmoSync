# Data Quality & Validation Framework

**Document ID:** `DOC-ENG-003`  
**Phase:** Phase 3 — Project Foundation & Data Engineering Setup  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Implementation-Ready  

---

## 1. Quality Engineering Principles

Raw telemetry from environmental ground stations and satellite thermal feeds cannot be ingested directly into forecasting models. High-stakes regulatory systems require that every record pass through an audit-proof, deterministic **Data Quality & Validation Pipeline**:

```
Raw Provider Payload (JSON / CSV / GRIB)
                   ↓
1. Parser & Syntactic Validation (JSON / CSV structure)
                   ↓
2. Pydantic Schema Validation (Types, required keys, nullability)
                   ↓
3. Temporal & Geographic Integrity (Timestamps in UTC, coordinates in domain)
                   ↓
4. Physical Plausibility Rules (Bounded concentration, temperature, pressure)
                   ↓
5. Sensor Malfunction Checks (Stuck sensor >= 4h, PM2.5 > PM10 check)
                   ↓
6. Quality Flagging (QC Flag: 0 = Valid, 1 = Imputed, 2 = Suspicious, 3 = Rejected)
                   ↓
Canonical Normalization & Database Insertion
```

---

## 2. Standardized Validation Rule Suite

```
+---------------------------------------------------------------------------------------------------------+
|                                    VALIDATION RULES SPECIFICATION                                       |
+=========================================================================================================+
| RULE ID          | VALIDATION TARGET             | BOUNDS / CRITERIA               | FAILURE ACTION     |
+------------------+-------------------------------+---------------------------------+--------------------+
| `QC-TIME-01`     | Observation Timestamp         | ISO-8601 UTC parseable;         | Reject record      |
|                  |                               | T_now - 30d <= T <= T_now + 1h  |                    |
+------------------+-------------------------------+---------------------------------+--------------------+
| `QC-GEO-01`      | Monitoring Station Lat/Lon    | Delhi NCR: 27.0°N–32.5°N,       | Reject record      |
|                  |                               | 74.0°E–79.5°E                   |                    |
+------------------+-------------------------------+---------------------------------+--------------------+
| `QC-PHYS-PM25`   | Fine Particulate PM2.5        | 0.0 <= PM2.5 <= 1500.0 ug/m3    | Nullify & flag QC=3|
+------------------+-------------------------------+---------------------------------+--------------------+
| `QC-PHYS-PM10`   | Coarse Particulate PM10       | 0.0 <= PM10 <= 2500.0 ug/m3     | Nullify & flag QC=3|
+------------------+-------------------------------+---------------------------------+--------------------+
| `QC-PHYS-HIER`   | Particulate Mass Hierarchy    | PM2.5 <= PM10 * 1.05            | Flag QC=2          |
|                  |                               | (Allows 5% instrument noise)    | (Incoherent ratio) |
+------------------+-------------------------------+---------------------------------+--------------------+
| `QC-PHYS-TEMP`   | Ambient Temperature 2m        | -5.0°C <= Temp <= 55.0°C        | Nullify & flag QC=3|
+------------------+-------------------------------+---------------------------------+--------------------+
| `QC-PHYS-RH`     | Relative Humidity 2m          | 0.0% <= RH <= 100.0%            | Clip to [0, 100]   |
+------------------+-------------------------------+---------------------------------+--------------------+
| `QC-PHYS-WIND`   | 10m Horizontal Wind Speed     | 0.0 <= WS <= 50.0 m/s           | Nullify & flag QC=3|
+------------------+-------------------------------+---------------------------------+--------------------+
| `QC-PHYS-PBLH`   | Boundary Layer Height         | 25.0 m <= PBLH <= 4000.0 m      | Clip to physical   |
+------------------+-------------------------------+---------------------------------+--------------------+
| `QC-SENSOR-STUCK`| Consecutive Sensor Invariance | Same non-zero float value for   | Flag QC=3 (Stuck); |
|                  |                               | >= 4 consecutive hourly steps   | trigger imputation |
+------------------+-------------------------------+---------------------------------+--------------------+
| `QC-FIRE-FRP`    | Fire Radiative Power (VIIRS)  | 0.0 < FRP <= 5000.0 MW          | Reject outlier fire|
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Standard Validation Output Contract

The validation module produces a standardized `ValidationResult` object:

```python
class ValidationResult(BaseModel):
    is_valid: bool
    total_records: int
    valid_records: int
    rejected_records: int
    errors: List[Dict[str, Any]]
    warnings: List[Dict[str, Any]]
    sanitized_records: List[Dict[str, Any]]
```

This guarantees complete traceability and audit logging prior to committing records to storage.
