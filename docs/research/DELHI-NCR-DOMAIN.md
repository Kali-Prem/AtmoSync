# Delhi NCR Geographic & Scientific Modeling Domain

**Document ID:** `DOC-RES-004`  
**Phase:** Research & Data Foundation  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Implementation-Ready & Scientifically Defined  

---

## 1. Domain Overview & Multi-Scale Delineation

Air pollution in Delhi NCR cannot be modeled within administrative borders alone. Delhi sits at the heart of the Indo-Gangetic Plain (IGP), a natural topographical basin bounded by the Himalayas to the north and the Aravalli range and Thar Desert to the south/southwest.

To maintain strict scientific validity while ensuring a smooth user experience, the system formally distinguishes between three distinct boundaries:
1. **Official Administrative Boundary:** The statutory jurisdiction defined by the National Capital Region Planning Board (NCRPB).
2. **Scientific Modeling Domain:** A multi-scale nested grid capturing synoptic northwest winds, upstream agricultural burning in Punjab and Haryana, and local urban turbulence.
3. **Dashboard Visualization Boundary:** The interactive viewport optimized for environmental regulators and decision-makers.

---

## 2. Three Distinct Boundary Specifications

```
+---------------------------------------------------------------------------------------------------------+
|                                    DELHI NCR DOMAIN SPECIFICATION                                       |
+=========================================================================================================+
| BOUNDARY TYPE             | GEOGRAPHIC EXTENT (LAT / LON)         | AREA / RESOLUTION | PRIMARY PURPOSE |
+---------------------------+---------------------------------------+-------------------+-----------------+
| 1. Official NCR Boundary  | Lat: 27.03°N – 29.48°N                | 55,083 km²        | Regulatory GRAP |
|    (NCRPB Statutory)      | Lon: 76.10°E – 78.29°E                | Administrative    | Enforcement     |
+---------------------------+---------------------------------------+-------------------+-----------------+
| 2. Modeling Domain (D01)  | Lat: 27.00°N – 32.50°N                | ~610 km x 450 km  | Synoptic & Crop |
|    Regional Plume Corridor| Lon: 74.00°E – 79.50°E                | Grid: 9 km / 0.1° | Fire Transport  |
+---------------------------+---------------------------------------+-------------------+-----------------+
| 3. Modeling Domain (D02)  | Lat: 27.80°N – 29.40°N                | ~180 km x 160 km  | Boundary Layer  |
|    NCR Mesoscale          | Lon: 76.40°E – 78.10°E                | Grid: 3 km        | & Ring-Road Met |
+---------------------------+---------------------------------------+-------------------+-----------------+
| 4. Modeling Domain (D03)  | Lat: 28.40°N – 28.90°N                | ~50 km x 50 km    | Street/Station  |
|    Delhi NCT Urban Core   | Lon: 76.80°E – 77.40°E                | Grid: 1 km / Stn  | Local Exposure  |
+---------------------------+---------------------------------------+-------------------+-----------------+
| 5. Dashboard Viewport     | Lat: 28.30°N – 28.95°N (Default Zoom) | Dynamic Leaflet/  | 60 FPS UX Scrub |
|    Visualization Window   | Lon: 76.75°E – 77.45°E (Expanded Reg) | MapLibre Canvas   | & Reg. Briefing |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Detailed Boundary Analysis

### 3.1 Official NCR Administrative Boundary (NCRPB)
- **Authority:** National Capital Region Planning Board (NCRPB) Act, 1985.
- **Constituent Areas:**
  - **National Capital Territory (NCT) of Delhi:** 1,483 km² (11 districts).
  - **Haryana Sub-region:** 14 districts (Gurugram, Faridabad, Sonipat, Jhajjar, Rohtak, Panipat, Rewari, Palwal, Nuh, Mewat, Bhiwani, Charkhi Dadri, Mahendragarh, Jind, Karnal) covering ~25,327 km².
  - **Uttar Pradesh Sub-region:** 8 districts (Gautam Buddha Nagar/Noida, Ghaziabad, Meerut, Bulandshahr, Hapur, Baghpat, Muzaffarnagar, Shamli) covering ~14,826 km².
  - **Rajasthan Sub-region:** 2 districts (Alwar, Bharatpur) covering ~13,447 km².
- **Total Statutory Area:** ~55,083 km².
- **Significance:** Used for regulatory policy triggers (e.g., Graded Response Action Plan - GRAP stages I, II, III, IV, entry bans for diesel trucks, school closures).

---

### 3.2 Scientific Modeling Domain (Physics & Chemistry Grids)

Numerical models require rectangular domains aligned with Cartesian or map-projected coordinate reference systems (CRS: EPSG:4326 for WGS84 coordinates or Lambert Conformal Conic for WRF/NWP).

```
   74.0°E                      76.8°E         77.4°E                     79.5°E
    +--------------------------------------------------------------------+ 32.5°N
    |  D01: REGIONAL TRANSPORT CORRIDOR (610 km x 450 km)                 |
    |                                                                    |
    |  [PUNJAB] (Amritsar, Ludhiana, Sangrur, Patiala)                   |
    |  * * * Stubble Fire Emission Hotspots * * *                        |
    |          \                                                         |
    |           \  Synoptic Northwest Winds (Oct-Nov)                    |
    |            v                                                       |
    |           [HARYANA] (Karnal, Kurukshetra, Jind)                    |
    |                  \                                                 |
    |                   v                                                |
    |              +------------------------------+ 29.4°N               |
    |              | D02: NCR MESOSCALE           |                      |
    |              |      (180 km x 160 km)       |                      |
    |              |       +--------------+28.9°N |                      |
    |              |       | D03: NCT     |       |                      |
    |              |       | URBAN CORE   |       |                      |
    |              |       | (50 km x     |       |                      |
    |              |       |  50 km)      |       |                      |
    |              |       +--------------+28.4°N |                      |
    |              +------------------------------+ 27.8°N               |
    |                                                                    |
    +--------------------------------------------------------------------+ 27.0°N
```

#### Domain 1 (D01): Regional Agricultural & Synoptic Corridor
- **Geographic Extent:** $27.0^\circ\text{N} - 32.5^\circ\text{N}$ (Latitude), $74.0^\circ\text{E} - 79.5^\circ\text{E}$ (Longitude).
- **Physical Rationale:** Encompasses the entire agricultural paddy belt of Punjab (Amritsar, Tarn Taran, Firozpur, Ludhiana, Sangrur, Patiala) and northern Haryana (Kaithal, Kurukshetra, Karnal, Fatehabad), which are located $150\text{ km} - 350\text{ km}$ upwind of Delhi. In autumn, northwesterly winds advect smoke plumes southeastward along this precise corridor into the Delhi basin within 12 to 36 hours.
- **Grid Resolution:** $9\text{ km} \times 9\text{ km}$ (or $0.1^\circ$).
- **Function:** Ingests NASA FIRMS active fires, computes smoke injection, and simulates regional advection down to Delhi.

#### Domain 2 (D02): NCR Mesoscale Domain
- **Geographic Extent:** $27.8^\circ\text{N} - 29.4^\circ\text{N}$, $76.4^\circ\text{E} - 78.1^\circ\text{E}$.
- **Physical Rationale:** Resolves mesoscale thermal circulations between the urban built-up area and surrounding agrarian/arid plains, the Aravalli ridge micro-topography, and the regional Eastern & Western Peripheral Expressways (KMP and KGP).
- **Grid Resolution:** $3\text{ km} \times 3\text{ km}$.
- **Function:** Computes regional boundary layer height (PBLH), nocturnal temperature inversions, and cross-district transport between Noida, Gurugram, Faridabad, Ghaziabad, and Delhi.

#### Domain 3 (D03): Delhi NCT High-Resolution Urban Core
- **Geographic Extent:** $28.40^\circ\text{N} - 28.90^\circ\text{N}$, $76.80^\circ\text{E} - 77.40^\circ\text{E}$.
- **Physical Rationale:** Focuses on the dense urban core containing all 40 DPCC/CPCB monitoring stations, major traffic junctions (Ring Road, Outer Ring Road), Yamuna river floodplain microclimate, industrial clusters (Wazirpur, Mayapuri, Anand Vihar), and heavy commercial freight transit corridors.
- **Grid Resolution:** $1\text{ km} \times 1\text{ km}$ downscaled raster and discrete monitoring station points.
- **Function:** Target evaluation domain for station-level hourly 72h forecasts and TreeSHAP explainability breakdowns.

---

### 3.3 Dashboard Visualization Boundary (User Interface)

- **Default Operational Viewport:**  
  - Center: Lat `28.6139°N`, Lon `77.2090°E` (Connaught Place / Central Delhi).
  - Default Zoom Level: `10.5` (encompasses Delhi NCT, Gurugram, Noida, Faridabad, and Ghaziabad).
  - Bounding Box: $28.35^\circ\text{N} - 28.85^\circ\text{N}$, $76.90^\circ\text{E} - 77.40^\circ\text{E}$.
- **Regional Transport Viewport (Interactive Toggle):**  
  - Center: Lat `29.80°N`, Lon `76.50°E`.
  - Zoom Level: `7.5` (displays entire Punjab, Haryana, and Delhi corridor).
  - Visualization: Live satellite active fire hotspots, animated wind vector particles, and color-coded forward plume trajectories streaming into Delhi.
- **Map Projection:** Web Mercator (EPSG:3857) for MapLibre GL rendering; internal data stored and computed in WGS84 (EPSG:4326) and projected to UTM Zone 43N (EPSG:32643) for meter-accurate Euclidean distance and dispersion operations.

---

## 4. Topographical & Environmental Features of the Domain

```
+---------------------------------------------------------------------------------------------------+
| FEATURE             | ELEVATION / LOCATION       | IMPACT ON AIR POLLUTION & DISPERSION           |
+=====================+============================+================================================+
| Aravalli Ridge      | 220 m – 320 m ASL          | Low quartzite hills running SW-NE. Forms a     |
| (Delhi Ridge)       | South & Central Delhi      | weak physical barrier to low-level southwesterly|
|                     |                            | winds and creates micro-scale shear pockets.   |
+---------------------+----------------------------+------------------------------------------------+
| Yamuna River Basin  | 200 m – 210 m ASL          | Low-lying alluvial floodplain. High nocturnal  |
|                     | North-to-South spine       | relative humidity induces intense radiative    |
|                     |                            | fog formation and aqueous secondary aerosol    |
|                     |                            | oxidation (SO2 -> Sulfate).                    |
+---------------------+----------------------------+------------------------------------------------+
| Urban Heat Island   | High building density      | Core city is 2°C–4°C warmer than rural periphery|
| (Central/East Delhi)| Connaught Place, Shahdara  | at sunset, delaying surface inversion by 1–2h  |
|                     |                            | compared to Najafgarh or Bawana rural plains.  |
+---------------------+----------------------------+------------------------------------------------+
| Upstream Farmlands  | 220 m – 260 m ASL          | Vast open agricultural fields. High nocturnal  |
| (Punjab / Haryana)  | 150–350 km NW of Delhi     | radiative cooling creates strong surface inver-|
|                     |                            | sions, trapping stubble smoke near ground.     |
+---------------------------------------------------------------------------------------------------+
```

This multi-tier domain definition ensures that all spatial operations—from wide-area fire tracking down to station-level AQI predictions—remain mathematically rigorous and geographically unambiguous.
