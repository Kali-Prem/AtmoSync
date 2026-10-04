# Agricultural Stubble-Burning Data & Smoke Emission Estimation

**Document ID:** `DOC-RES-011`  
**Phase:** Research & Data Foundation  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Implementation-Ready & Scientifically Validated  

---

## 1. Agricultural Burning Dynamics in Northwest India

Between mid-October and late November, farmers in Punjab and Haryana burn post-harvest rice paddy stubble (*Kharif* season residue) to rapidly clear fields for wheat (*Rabi* season) sowing. The narrow window of 10 to 15 days, combined with heavy combine harvester usage (which leaves tall standing straw), leads to thousands of open-air fires ignited simultaneously across the region.

```
       [PUNJAB & HARYANA FARMLANDS]
       Afternoon Farm Fires (12:00–16:00 IST)
       Thermal Anomalies Detected via VIIRS 375m (FRP in Megawatts)
                      |
                      | Smoke Plume Injected (500m – 1,200m AGL)
                      v
       [REGIONAL TRANSPORT CORRIDOR: 250 km – 350 km]
       Northwesterly Synoptic Winds (3 – 6 m/s / 11 – 22 km/h)
       Transport Duration: 18 to 36 Hours
                      |
                      v
       [DELHI NCR METROPOLITAN BASIN]
       Nocturnal Boundary Layer Collapse (<100m) + Radiation Inversion
       Massive Episodic PM2.5 Surge (+50 to +180 ug/m3 contribution)
```

---

## 2. Evaluation of Satellite Fire Observation Sources

```
+---------------------------------------------------------------------------------------------------------+
|                                    ACTIVE FIRE SENSOR EVALUATION                                        |
+=========================================================================================================+
| SATELLITE / SENSOR         | SPATIAL RESOLUTION   | OVERPASS TIMES (IST)   | DETECTABILITY & SUITABILITY|
+----------------------------+----------------------+------------------------+----------------------------+
| 1. VIIRS (Suomi-NPP) 🟢    | 375 m nadir (I-Band) | ~13:30 IST (Afternoon) | Exceptional. High spatial  |
|    NASA FIRMS NRT          | 375 m x 375 m        | ~01:30 IST (Night)     | resolution captures small  |
|                            |                      |                        | 1-acre farm fires.         |
+----------------------------+----------------------+------------------------+----------------------------+
| 2. VIIRS (NOAA-20 / JPSS-1)🟢375 m nadir (I-Band) | ~14:20 IST (Afternoon) | Exceptional. Flies 50 min  |
|    NASA FIRMS NRT          |                      | ~02:20 IST (Night)     | behind Suomi-NPP, catching |
|                            |                      |                        | subsequent ignitions.      |
+----------------------------+----------------------+------------------------+----------------------------+
| 3. VIIRS (NOAA-21 / JPSS-2)🟢375 m nadir (I-Band) | ~12:40 IST (Afternoon) | Exceptional. Earliest after|
|    NASA FIRMS NRT          |                      | ~00:40 IST (Night)     | noon overpass.             |
+----------------------------+----------------------+------------------------+----------------------------+
| 4. MODIS (Terra & Aqua) 🟡 | 1 km nadir           | Terra: ~10:30 & 22:30  | Coarser resolution misses  |
|    NASA FIRMS NRT          |                      | Aqua:  ~13:30 & 01:30  | up to 50% of small burns.  |
|                            |                      |                        | Secondary benchmark.       |
+----------------------------+----------------------+------------------------+----------------------------+
| 5. CAMS GFAS v1.2 🟡       | 0.1° grid (~11 km)   | Daily gridded product  | Good for baseline modeling;|
|    ECMWF Fire Emissions    |                      | (1-day latency)        | 24h latency limits live NRT.|
+----------------------------+----------------------+------------------------+----------------------------+
| 6. INSAT-3D / 3DR Imager 🔴| ~4 km nadir          | Half-hourly geostationary| Too coarse over Punjab;  |
|    ISRO MOSDAC             |                      |                        | lacks open REST API.       |
+---------------------------------------------------------------------------------------------------------+
```

### Critical Empirical Insight on Overpass Synchronization:
In Punjab and Haryana, farmers overwhelmingly ignite stubble in the early afternoon (12:00 to 16:00 IST) after morning dew evaporates and temperatures peak. 
The orbital constellation of **NOAA-21 (~12:40 IST), Suomi-NPP (~13:30 IST), and NOAA-20 (~14:20 IST)** forms an ideal 3-satellite observation sequence that captures the exact diurnal ignition peak with 375m thermal sensitivity.

---

## 3. NASA FIRMS API Access & Data Ingestion

### Verified REST API Specification
- **Base Endpoint:**  
  `https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/[SOURCE]/[EXTENT]/[DAYS]`
- **Parameters:**
  - `[MAP_KEY]`: Free developer API key from NASA EOSDIS.
  - `[SOURCE]`: `VIIRS_SNPP_NRT`, `VIIRS_NOAA20_NRT`, or `VIIRS_NOAA21_NRT`.
  - `[EXTENT]`: Bounding box string `minLon,minLat,maxLon,maxLat` $\rightarrow$ `74.0,28.5,78.0,32.5` (covering Punjab, Haryana, and Delhi NCR).
  - `[DAYS]`: Number of days to retrieve ($1$ to $10$).
- **Response Format:** Tabular CSV or GeoJSON.
- **Latency:** Processed and served within 1 to 2 hours of satellite overpass.

### Core Extracted Attributes:
```csv
latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight
30.892,75.412,342.5,0.38,0.36,2023-11-04,0812,N,nominal,2.0NRT,291.2,18.4,D
```
- `frp`: **Fire Radiative Power (MW)** — the fundamental physical quantity driving smoke mass emission.

---

## 4. Physics-Based Emission Rate Formulation

Rather than counting discrete fire points (which treats a 1-acre clearing identical to a 50-acre industrial fire), ATMOSYNC employs the **Wooster / Kaufman Fire Radiative Energy (FRE) Formulation**:

The instantaneous particulate matter emission rate $E_{PM2.5}$ ($\text{kg/s}$) is directly proportional to Fire Radiative Power:

$$E_{PM2.5}(i) = C_e \cdot FRP(i)$$

where:
- $FRP(i)$: Fire Radiative Power of fire pixel $i$ in Megawatts ($\text{MW} = \text{MJ/s}$).
- $C_e$: Smoke emission coefficient for agricultural crop residue burning.
- Based on empirical field campaigns in the Indo-Gangetic Plain (Wooster et al., 2005; Liu et al., 2020; CAMS GFAS agricultural combustion factors):
  $$C_e \approx 0.024 \pm 0.006 \text{ kg } PM_{2.5} / \text{MJ}$$

### Cluster Aggregation via Spatial DBSCAN:
Individual 375m pixels are grouped into coherent fire complexes using DBSCAN (Density-Based Spatial Clustering of Applications with Noise) with spatial radius $\epsilon = 10\text{ km}$ and minimum samples $n_{\text{min}} = 2$:

$$FRP_{\text{cluster}} = \sum_{i \in \text{Cluster}} FRP(i)$$
$$E_{\text{cluster}} = C_e \cdot FRP_{\text{cluster}}$$

A typical major burning cluster in Sangrur or Ludhiana exhibits an integrated $FRP \approx 150 - 450\text{ MW}$, yielding an instantaneous $PM_{2.5}$ emission rate of $3.6 - 10.8\text{ kg } PM_{2.5} / \text{s}$.

---

## 5. Smoke Plume Injection Height

Agricultural stubble fires generate buoyant convective thermal updrafts that carry smoke aloft above the shallow surface layer. We parameterize the effective smoke injection height ($H_{\text{inj}}$) using the empirical scaling relationship:

$$H_{\text{inj}} = H_0 \cdot \left( \frac{FRP_{\text{cluster}}}{FRP_0} \right)^\beta$$

where $H_0 \approx 500\text{ m AGL}$, $FRP_0 = 100\text{ MW}$, and $\beta \approx 0.35$.
- Typical injection heights over Punjab range between **$400\text{ m}$ and $1,100\text{ m}$ AGL**, placing the bulk of the smoke within the daytime mixed layer or the residual layer aloft.
- At night, as the boundary layer collapses below $150\text{ m}$, this smoke remains decoupling aloft in the residual layer and travels downwind with minimal surface friction, arriving over Delhi where subsequent daytime thermal mixing fumigates the smoke directly to ground level.

---

## 6. What Can Realistically Be Ingested in SIH 2026

1. **Live System:** Automated hourly background worker querying NASA FIRMS REST API for the past 24–48 hours of VIIRS active fires across Punjab and Haryana.
2. **Historical Benchmark System:** Pre-packaged FIRMS active fire datasets for the extreme November 1–15, 2023 and October 25–November 10, 2022 burning seasons to allow instant demonstration of stubble tracking during jury evaluation.
3. **Plume Feature Integration:** The calculated cluster coordinates, total FRP, and estimated mass emission rates feed directly into the **Forward Lagrangian Dispersion Engine** (`PLUME-MODELING.md`).
