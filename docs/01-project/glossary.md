# Comprehensive Glossary of Scientific & Technical Terms

**Document ID:** `DOC-01-PROJ-006`  
**Problem Statement ID:** 26082  
**Domain:** Atmospheric Science, Numerical Modeling, Machine Learning, Geospatial Systems  

---

### Air Quality Index (AQI / NAQI)
A standardized, dimensionless metric used by government agencies to communicate the health risk of ambient air pollution to the public. In India, the National Air Quality Index (NAQI) established by the Central Pollution Control Board (CPCB) evaluates 8 criteria pollutants ($PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3, NH_3, Pb$) through a piecewise linear sub-index calculation; the overall AQI is governed by the maximum sub-index ("worst pollutant" rule) across 6 categories: Good (0-50), Satisfactory (51-100), Moderate (101-200), Poor (201-300), Very Poor (301-400), and Severe (401-500+).

### Particulate Matter 2.5 ($PM_{2.5}$)
Fine inhalable particulate matter with an aerodynamic diameter of $2.5\,\mu\text{m}$ or smaller. Consists of primary combustion particles (soot, black carbon, organic carbon) and secondary inorganic/organic aerosols (sulfate, nitrate, ammonium). Capable of penetrating deep into the pulmonary alveoli and bloodstream, posing severe cardiovascular and respiratory hazards. In Delhi NCR, winter $PM_{2.5}$ frequently exceeds $300 - 500\,\mu\text{g/m}^3$ (CPCB 24-hr standard is $60\,\mu\text{g/m}^3$; WHO guideline is $15\,\mu\text{g/m}^3$).

### Particulate Matter 10 ($PM_{10}$)
Inhalable particles with an aerodynamic diameter $\le 10\,\mu\text{m}$. Encompasses fine $PM_{2.5}$ as well as coarser mechanical dust particles generated from road dust resuspension, construction activities, soil erosion, and agricultural tilling. Indian 24-hour national standard is $100\,\mu\text{g/m}^3$.

### Ground-Level Ozone ($O_3$)
A secondary photochemical oxidant formed in the troposphere via non-linear sunlight-driven photolysis of nitrogen dioxide ($NO_2$) in the presence of volatile organic compounds (VOCs) and reactive carbon monoxide. Unlike stratospheric ozone which protects against UV radiation, tropospheric ozone is a strong lung irritant and phytotoxin damaging crops and human respiratory tissue.

### Nitrogen Oxides ($NO_x$)
The collective term for nitric oxide ($NO$) and nitrogen dioxide ($NO_2$), primarily produced by high-temperature fossil fuel combustion (diesel freight vehicles, coal-fired thermal power plants, industrial boilers). In the atmosphere, $NO$ rapidly titrates $O_3$ to form $NO_2$, which subsequently undergoes photolysis in daylight to regenerate $O_3$ and produces nitric acid ($HNO_3$), a key precursor for secondary nitrate aerosols.

### Planetary Boundary Layer (PBL) & PBL Height (PBLH)
The lowest layer of the troposphere in direct mechanical and thermal contact with the Earth's surface, characterized by turbulent mixing. Its height ($PBLH$) undergoes a dramatic diurnal cycle: expanding during the day ($1,000\text{ m} - 2,500\text{ m}$) due to surface solar heating generating buoyant thermals, and collapsing at night ($50\text{ m} - 200\text{ m}$) under stable radiative cooling. A shallow PBL drastically restricts the volume of air available to dilute emissions.

### Atmospheric Inversion (Thermal Inversion)
A meteorological condition wherein the normal vertical temperature lapse rate of the atmosphere is inverted, such that air temperature increases with altitude ($\frac{\partial T}{\partial z} > 0$). Inversion layers possess immense static stability ($Ri > 0.25$), acting as an impenetrable lid that halts vertical convective overturning and traps ground emissions within a thin surface boundary layer.

### Aerosols & Aerosol Optical Depth (AOD)
A suspension of fine solid particles or liquid droplets in the atmosphere. Aerosol Optical Depth (AOD) is a dimensionless measure of the total light extinction (scattering plus absorption) caused by aerosols integrated along an atmospheric column from the surface to the top of the atmosphere. AOD values over Delhi NCR in winter routinely exceed $1.0 - 2.5$.

### Emission Inventory
A structured database quantifying the mass of specific chemical pollutants released into the atmosphere from localized geographic areas over designated timeframes, partitioned into source sectors: transport (exhaust/non-exhaust), industrial stacks, power generation, residential biomass/cooking, road dust, construction, and agricultural burning.

### Chemical Transport Model (CTM)
A numerical modeling framework that solves the three-dimensional advection-diffusion-reaction equation for chemical species in the atmosphere, tracking emission, horizontal/vertical transport by wind, chemical transformation, and dry/wet deposition.

### Weather Research and Forecasting Model (WRF)
A next-generation, non-hydrostatic mesoscale numerical weather prediction system designed for operational forecasting and atmospheric research, developed collaboratively by NCAR, NOAA, and international agencies.

### WRF-Chem (Coupled Weather-Chemistry Model)
An advanced variant of WRF wherein atmospheric physics, thermodynamics, gas-phase chemistry, and aerosol microphysics are solved simultaneously (online coupling). This enables two-way feedback between aerosol radiative extinction and atmospheric dynamics.

### Data Assimilation (DA)
The mathematical technique of combining observational measurements (ground stations, satellite radiances, radiosondes) with numerical model background forecasts using statistical error covariance (e.g., 3D-Var, 4D-Var, Ensemble Kalman Filter) to generate an optimal estimate of the true atmospheric state (the analysis).

### Downscaling (Spatial Downscaling)
The process of deriving high-resolution local weather or air quality estimates from coarse-resolution regional or global model grids ($25\text{ km} \rightarrow 1\text{ km}$), using dynamical nesting or statistical/machine learning super-resolution techniques.

### Bias Correction
Post-processing statistical or machine-learning methodologies applied to raw numerical model outputs to systematically eliminate recurring systematic errors (underprediction of peak concentrations, wind speed overestimation) calibrated against real-world observational ground truth.

### Pollution Dispersion
The physical spreading, transport, and dilution of emitted contaminants through the atmosphere governed by three primary mechanisms: mean advection by wind, turbulent eddy diffusion, and gravitational settling/deposition.

### Pollution Plume
A continuous or puff-like localized geometric column or cloud of concentrated smoke/pollutants released from a point or regional source (e.g., a cluster of crop residue fires) that advects downstream along the prevailing wind vector while expanding due to turbulent diffusion.

### Stubble Burning (Agricultural Crop Residue Burning)
The seasonal practice of deliberately burning rice paddy stubble and straw in Punjab, Haryana, and Western Uttar Pradesh following post-monsoon harvest to rapidly clear fields for wheat planting. This emits massive episodic plumes of $PM_{2.5}$, organic carbon, black carbon, $CO$, and volatile organics into the northwest wind corridor toward Delhi NCR.

### Meteorological Forcing
The atmospheric state variables—temperature, wind velocity, barometric pressure, moisture, solar irradiance, and turbulent kinetic energy—that drive the physical movement, dilution, and chemical reaction rates of pollutants in the atmosphere.

### Bulk Richardson Number ($Ri_b$)
A dimensionless ratio relating thermal buoyancy to kinematic wind shear:
$$Ri_b = \frac{g}{\theta_v} \frac{(\theta_v(z) - \theta_v(0)) \cdot z}{u(z)^2 + v(z)^2}$$
Used extensively in boundary layer meteorology to diagnose atmospheric stability and calculate the top of the stable boundary layer (inversion cap). When $Ri_b > 0.25$, turbulence is dynamically damped and vertical mixing ceases.

---

## Document Sign-off
- **Atmospheric Systems Engineer:** Verified
- **Glossary Review Complete:** `DOC-01-PROJ-006` Complete
