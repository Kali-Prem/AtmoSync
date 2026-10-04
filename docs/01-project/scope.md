# Project Scope & Boundaries: Coupled Air Pollution Forecasting Platform

**Document ID:** `DOC-01-PROJ-003`  
**Problem Statement ID:** 26082  
**Focus Region:** Delhi National Capital Region (NCR)  

---

## 1. Geographic & Spatial Scope

### 1.1 Core Domain (Domain 03 - High Resolution)
- **Bounding Box:** $28.20^\circ\text{N}$ to $28.95^\circ\text{N}$, $76.80^\circ\text{E}$ to $77.55^\circ\text{E}$
- **Coverage:** National Capital Territory of Delhi (Central, North, South, East, West, New Delhi, Dwarka, Rohini, Anand Vihar) and contiguous urban centers: Noida, Greater Noida, Ghaziabad, Faridabad, and Gurugram.
- **Resolution:** Station-level predictions for all 40+ active CAAQMS monitoring stations + $1\text{ km} \times 1\text{ km}$ interpolated gridded mesh.

### 1.2 Regional Domain (Domain 01 & 02 - Synoptic & Plume Corridor)
- **Bounding Box:** $27.0^\circ\text{N}$ to $32.5^\circ\text{N}$, $74.0^\circ\text{E}$ to $79.5^\circ\text{E}$
- **Coverage:** Upwind agricultural fire belts in Punjab (Amritsar, Tarn Taran, Sangrur, Ludhiana, Patiala) and Haryana (Karnal, Kurukshetra, Kaithal, Jind), extending south-eastwards across Uttar Pradesh and Rajasthan.
- **Resolution:** $9\text{ km} \times 9\text{ km}$ down to $3\text{ km} \times 3\text{ km}$ for regional advection and dispersion tracking.

```
+---------------------------------------------------------------------------------------+
| GEOGRAPHIC SCOPE NESTING                                                              |
|                                                                                       |
|   Domain 1 (Regional Synoptic): NW India (Punjab, Haryana, Rajasthan, W. UP) [9 km]   |
|   +-------------------------------------------------------------------------------+   |
|   | Domain 2 (NCR Corridor): Sonipat, Panipat, Rohtak, Palwal, Meerut [3 km]      |   |
|   |   +-----------------------------------------------------------------------+   |   |
|   |   | Domain 3 (Urban Core): Delhi NCT + Gurugram + Noida + Ghaziabad [1 km]|   |   |
|   |   |   - 40+ CAAQMS Station Points                                         |   |   |
|   |   |   - High-density population zones                                     |   |   |
|   |   +-----------------------------------------------------------------------+   |   |
|   +-------------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------------+
```

---

## 2. In-Scope Features (System Capabilities)

### 2.1 Atmospheric & Meteorological Processing
- Hourly prediction of:
  - Surface Temperature ($T_{2m}$) and Dew Point
  - Wind Speed and Direction at 10 meters ($U_{10}, V_{10}$)
  - Planetary Boundary Layer Height ($PBLH$)
  - Inversion Strength Index (calculated via bulk Richardson number and vertical lapse rate)
  - Relative Humidity ($RH$) and Surface Solar Radiation

### 2.2 Chemical & Air Quality Forecasting
- 72-hour continuous hourly forecasts for:
  - $PM_{2.5}$ (Fine inhalable particulate matter, $\le 2.5\,\mu\text{m}$)
  - $PM_{10}$ (Coarse particulate matter, $\le 10\,\mu\text{m}$)
  - Ground-Level Ozone ($O_3$) (1-hour and 8-hour rolling averages)
  - Nitrogen Oxides ($NO_x = NO + NO_2$)
- Calculation of composite Indian National Air Quality Index (NAQI) based on CPCB sub-index formulas.

### 2.3 Regional Stubble-Burning Plume Module
- Ingestion of near-real-time satellite thermal anomalies (FRP and coordinates from NASA VIIRS and MODIS).
- Trajectory and dispersion modeling tracking plume transport speed, direction, and estimated mass loading arrival in Delhi.
- Quantification of the agricultural smoke fractional contribution to Delhi's total $PM_{2.5}$.

### 2.4 Interactive Geospatial Dashboard
- Web-based GIS dashboard displaying dynamic vector wind streamlines, color-coded AQI contours, station pinpoints with drill-down historical/forecast charts, and temporal timeline playback ($T+0$ to $T+72$).
- Feature attribution panel explaining dominant meteorological/chemical drivers of forecast changes.

---

## 3. Out-of-Scope Features (Boundary Limitations)

The following items are explicitly **out of scope** for this system:

```
+---------------------------------------------------------------------------------------+
| EXPLICITLY OUT OF SCOPE                                                               |
+---------------------------------------------------------------------------------------+
| 1. Indoor Air Quality Monitoring:                                                     |
|    System strictly models ambient, outdoor tropospheric air quality.                  |
+---------------------------------------------------------------------------------------+
| 2. Microscale Street Canyon Turbulence Modeling:                                      |
|    Resolving building-by-building computational fluid dynamics (CFD / LES) requires   |
|    sub-meter grids and is out of scope for a regional 72-hour system.                 |
+---------------------------------------------------------------------------------------+
| 3. Long-Term Climate Projection:                                                      |
|    Decadal or multi-year climate change simulations; the scope is strictly short-term |
|    operational forecasting (0 to 72 hours).                                           |
+---------------------------------------------------------------------------------------+
| 4. Direct Enforcement or Automation of Punitive Sanctions:                           |
|    The platform provides advisory intelligence and decision support for regulators;   |
|    it does not automate physical enforcement or vehicular challans.                   |
+---------------------------------------------------------------------------------------+
| 5. Hardware Sensor Manufacturing:                                                     |
|    We do not manufacture or deploy physical IoT sensors. The system interfaces with   |
|    existing certified CPCB/DPCC CAAQMS networks and standard data APIs.              |
+---------------------------------------------------------------------------------------+
```

---

## 4. SIH Hackathon Prototype Scope vs. Full Production HPC Scope

To ensure absolute credibility and prevent overpromising during evaluation, the architecture explicitly distinguishes what can run in a hackathon demo environment from a national supercomputing deployment:

| Dimension | SIH Hackathon Prototype Scope | Full Production Scope (MoES / NCMRWF Target) |
| :--- | :--- | :--- |
| **Numerical Physics Engine** | Pre-computed WRF-Chem regional simulation runs for benchmark historical episodes + real-time GFS/ECMWF global numerical meteorological boundary ingestion. | Operational real-time 3D WRF-Chem (or NCUM-Chem) executing 4x daily on MoES supercomputing clusters (PARAM Siddhi / Pratyush / Mihir). |
| **Spatial Downscaling & Correction** | Physics-informed ML ensemble (LightGBM/XGBoost + Temporal Graph Neural Network) performing instant spatial downscaling (1 km) and bias correction. | High-resolution 3D variational data assimilation (3D-VAR/EnKF) directly into the numerical physics core, followed by operational ML post-processing. |
| **Plume Simulation** | Forward Lagrangian puff dispersion model driven by satellite active fire FRP and NWP wind fields running in real-time in Python/C++. | Online fully coupled biomass burning plume-rise model (Freedman/Grell) integrated within 3D WRF-Chem chemistry timesteps. |
| **Compute Infrastructure** | Standard cloud instance (e.g., 8-16 vCPU, 32GB RAM, optional single NVIDIA T4 GPU) or developer workstation. | Distributed HPC cluster (128+ MPI nodes, high-speed InfiniBand interconnect, petabyte storage arrays). |
| **Execution Latency** | $< 3\text{ minutes}$ end-to-end inference per 72-hour forecast run. | $1.5 - 3.0\text{ hours}$ numerical integration wall-clock time per 72-hour cycle. |

---

## 5. Document Sign-off
- **Lead Systems Architect:** Approved
- **Next Document:** Assumptions & Constraints (`docs/01-project/assumptions.md`)
