# Regional Fire Domain Specification (Data Architecture)

**Document ID:** `DOC-DATA-010`  
**Phase:** Phase 5 — Atmospheric Variables + Inversion + Regional Fire/Plume Pipeline  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved Specification  

---

## 1. Regional Coordinates & Geographic Boundaries

The regional fire observation domain covers Northwest India and the Indo-Gangetic Plain:

- **Latitude Extent:** $26.5^\circ\text{N}$ to $33.0^\circ\text{N}$
- **Longitude Extent:** $73.5^\circ\text{E}$ to $79.5^\circ\text{E}$
- **Coordinate Reference System:** WGS-84 (EPSG:4326)

All satellite detections outside this bounding box are discarded during ingestion with quality flag `OUT_OF_BOUNDS`.

---

## 2. Delhi NCR Receptor Target Domain

The forecast target domain is defined as:
- **South-West Corner:** $28.20^\circ\text{N}, 76.80^\circ\text{E}$
- **North-East Corner:** $28.95^\circ\text{N}, 77.55^\circ\text{E}$
- **Target Center:** $28.6139^\circ\text{N}, 77.2090^\circ\text{E}$

Plume trajectories intersecting this domain are flagged with `intersects_target_domain = True` and contribute directly to the target station risk score $S_{\text{plume}}$.
