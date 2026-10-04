# Operational Real-Time vs. Near-Real-Time Strategy

**Document ID:** `DOC-RES-016`  
**Phase:** Research & Data Foundation  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Implementation-Ready & Scientifically Honest  

---

## 1. Deconstructing "Real-Time" in Atmospheric Forecasting

In software engineering, "real-time" typically denotes sub-second streaming (e.g., stock tickers or chat websockets). In operational atmospheric sciences and numerical weather prediction (NWP), claiming a coupled 72-hour air quality forecast runs in "real-time streaming" is scientifically false.

Atmospheric modeling is fundamentally bound by physical and operational publication latencies:
1. **Global NWP Latency:** The laws of fluid thermodynamics are solved by supercomputers at NOAA (GFS) and ECMWF (IFS). Global model runs (initialized at 00, 06, 12, 18 UTC) require 2 to 3.5 hours of high-performance computation before GRIB2 forecast files are published to the world.
2. **Ground Sensor Telemetry Latency:** Continuous Ambient Air Quality Monitoring Stations (CAAQMS) report 15-minute or 1-hour average concentrations, with data validation and ingestion publishing delays of 15 to 45 minutes.
3. **Satellite Overpass Latency:** Low Earth Orbit (LEO) satellites (VIIRS, MODIS, TROPOMI) pass over Northwest India only at discrete orbital intervals (~12:40, 13:30, 14:20 IST), with ground receiving stations requiring 1 to 2 hours to process raw telemetry into Fire Radiative Power (FRP) products.

---

## 2. Evaluation of Operational Cadence Options

```
+---------------------------------------------------------------------------------------------------------+
|                                    OPERATIONAL CADENCE COMPARISON                                       |
+=========================================================================================================+
| CADENCE OPTION             | UPDATE FREQUENCY  | TECHNICAL FEASIBILITY     | SCIENTIFIC HONESTY         |
+----------------------------+-------------------+---------------------------+----------------------------+
| 1. True Real-Time          | Sub-second /      | Impossible for weather;   | Misleading & False.        |
|    Continuous Streaming    | Minute-by-minute  | sensors do not report it. | Fakes data between steps.  |
+----------------------------+-------------------+---------------------------+----------------------------+
| 2. Hourly Nowcasting &     | Every 60 Minutes  | High. Synchronizes with   | Honest for observations;   |
|    Observation Refresh     | (:15 past hour)   | CPCB hourly updates.      | Extrapolates short leads.  |
+----------------------------+-------------------+---------------------------+----------------------------+
| 3. Scheduled Operational   | Every 6 Hours     | Optimal. Aligns with      | Industry standard followed |
|    Forecast Cycles (NRT)   | (00, 06, 12, 18Z) | global NWP releases.      | by IMD, NCMRWF, and NOAA.  |
+----------------------------+-------------------+---------------------------+----------------------------+
| 4. Pre-computed Episodic   | Instantaneous     | Guaranteed 0 ms response  | Legitimate for benchmark   |
|    Historical Hindcasts    | (On-demand replay)| for jury presentations.   | case study analysis.       |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Recommended Operational Architecture for SIH 2026

To achieve complete scientific transparency while delivering a stunning, responsive demonstration, ATMOSYNC deploys a **Three-Tier Operational Strategy**:

```
+---------------------------------------------------------------------------------------------------------+
|                                   ATMOSYNC THREE-TIER CADENCE MODEL                                    |
+=========================================================================================================+
| TIER                      | DESIGNATION                   | SCHEDULE & BEHAVIOR                         |
+---------------------------+-------------------------------+---------------------------------------------+
| TIER 1: Live Observations | Near-Real-Time (NRT)          | Background worker polls OpenAQ / CPCB every |
|         Ground Ingestion  | Hourly Monitoring             | 60 minutes (:15 past the hour). Dashboard   |
|                           |                               | displays live current AQI and station pins. |
+---------------------------+-------------------------------+---------------------------------------------+
| TIER 2: Forecast Cycle    | Scheduled 6-Hourly            | Triggers 4 times daily upon publication of  |
|         Generation Engine | Operational Forecast Runs     | new NWP cycles. Pre-generates the complete  |
|                           |                               | hourly 72-hour forecast tensor in 10.5 sec. |
+---------------------------+-------------------------------+---------------------------------------------+
| TIER 3: Historical Smog   | Pre-computed Interactive      | Dedicated UI toggle allowing evaluators to  |
|         Simulation Mode   | Hindcast Case Studies         | scrub through verified historical crises    |
|                           |                               | (e.g. Nov 2023 severe stubble episode).     |
+---------------------------------------------------------------------------------------------------------+
```

### Nomenclature & User Interface Rules:
1. The dashboard navigation bar shall explicitly state:  
   `"Operational Status: Live NRT (Cycle 06:00 UTC) | Next Cycle in 3h 42m"`.
2. When displaying current station readings, the UI shall label the timestamp as:  
   `"Observed: Today, 11:00 IST (CPCB Network)"`.
3. When moving the timeline scrubber into the future, the UI shall display:  
   `"Forecast Step: +18h (Valid: Tomorrow, 05:00 IST) — Model: ATMOSYNC Hybrid Dual-Engine"`.

This adherence to standard meteorological nomenclature guarantees that evaluators from MoES, NCMRWF, and CPCB will immediately recognize the system as professional and scientifically sound.
