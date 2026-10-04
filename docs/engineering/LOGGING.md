# Logging & Observability Standard

**Document ID:** `DOC-ENG-006`  
**Phase:** Phase 3 — Project Foundation & Data Engineering Setup  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved  

---

## 1. Structured Logging Principles

In operational forecasting and high-frequency data ingestion, plain text unstructured print statements make automated telemetry, debugging, and alerting impossible.

ATMOSYNC adopts **Structured JSON Logging** in production:
- Every log entry emits valid, parsable JSON.
- Every entry includes standard envelope fields: `timestamp`, `service`, `environment`, `level`, `logger`, `message`.
- Automatic redaction of sensitive credentials (`NASA_FIRMS_MAP_KEY`, passwords, bearer tokens).

---

## 2. Standard Log Record Schema

```json
{
  "timestamp": "2026-10-03T06:15:02.145Z",
  "service": "ATMOSYNC Forecasting API",
  "environment": "production",
  "level": "INFO",
  "logger": "vayudrishti.ingest",
  "message": "Successfully ingested 40 station observations from OpenAQ mirror",
  "records_processed": 40,
  "execution_duration_ms": 1142
}
```

---

## 3. Log Levels & Guidelines

- **`DEBUG`:** Fine-grained information for local troubleshooting (HTTP headers, raw payload dumps). Disabled in production.
- **`INFO`:** Standard milestone notifications (Job started/completed, batch committed to database, server startup).
- **`WARNING`:** Recoverable anomalies (Sensor reported stuck value, non-critical API timeout triggering fallback).
- **`ERROR`:** Operation failures requiring attention (External provider completely down, database query failed).
- **`CRITICAL`:** Fatal application state (Database unreachable, corrupt model artifacts).
