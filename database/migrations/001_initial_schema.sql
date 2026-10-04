-- ==============================================================================
-- Migration 001: Initial Core Schema for VayuDrishti NCR
-- Compatible with PostgreSQL 16 + PostGIS + TimescaleDB
-- ==============================================================================

-- 1. Locations (Base geographic entities: cities, districts, zones)
CREATE TABLE IF NOT EXISTS locations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    region VARCHAR(64) NOT NULL, -- e.g., 'Delhi-NCT', 'Haryana-NCR', 'UP-NCR'
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Monitoring Stations (Ground CAAQMS stations in Delhi NCR)
CREATE TABLE IF NOT EXISTS monitoring_stations (
    id VARCHAR(64) PRIMARY KEY,
    station_code VARCHAR(32) UNIQUE NOT NULL, -- e.g., 'DL001', 'site_1420'
    name VARCHAR(128) NOT NULL,
    location_id VARCHAR(64) REFERENCES locations(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    provider VARCHAR(64) NOT NULL DEFAULT 'CPCB', -- 'CPCB', 'DPCC', 'IMD', 'US-EMBASSY'
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'INACTIVE', 'MAINTENANCE'
    elevation_m DOUBLE PRECISION DEFAULT 215.0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Weather Observations (Hourly surface & boundary layer met)
CREATE TABLE IF NOT EXISTS weather_observations (
    id BIGSERIAL,
    time TIMESTAMPTZ NOT NULL,
    location_id VARCHAR(64) REFERENCES locations(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    temperature_2m DOUBLE PRECISION,
    relative_humidity_2m DOUBLE PRECISION,
    surface_pressure_hpa DOUBLE PRECISION,
    wind_speed_10m DOUBLE PRECISION,
    wind_direction_10m DOUBLE PRECISION,
    precipitation_mm DOUBLE PRECISION DEFAULT 0.0,
    direct_radiation_wm2 DOUBLE PRECISION,
    boundary_layer_height_m DOUBLE PRECISION,
    lapse_rate_low DOUBLE PRECISION, -- °C / 100m (inversion diagnostic)
    source VARCHAR(64) NOT NULL DEFAULT 'OPEN-METEO',
    qc_flag INTEGER DEFAULT 0,
    PRIMARY KEY (id, time)
);
CREATE INDEX IF NOT EXISTS idx_weather_obs_time_loc ON weather_observations (location_id, time DESC);

-- 4. Air Quality Observations (Hourly criteria pollutants from ground sensors)
CREATE TABLE IF NOT EXISTS air_quality_observations (
    id BIGSERIAL,
    time TIMESTAMPTZ NOT NULL,
    station_id VARCHAR(64) REFERENCES monitoring_stations(id) ON DELETE CASCADE,
    pm25 DOUBLE PRECISION,
    pm10 DOUBLE PRECISION,
    no2 DOUBLE PRECISION,
    o3 DOUBLE PRECISION,
    so2 DOUBLE PRECISION,
    co DOUBLE PRECISION,
    nh3 DOUBLE PRECISION,
    aqi INTEGER,
    prominent_pollutant VARCHAR(16),
    source VARCHAR(64) NOT NULL DEFAULT 'OPENAQ-CPCB',
    qc_flag INTEGER DEFAULT 0,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (id, time)
);
CREATE INDEX IF NOT EXISTS idx_aq_obs_time_stn ON air_quality_observations (station_id, time DESC);

-- 5. Model Runs (Provenance and execution audit logs)
CREATE TABLE IF NOT EXISTS model_runs (
    id VARCHAR(64) PRIMARY KEY, -- e.g., 'run_20261003_0600Z'
    model_name VARCHAR(64) NOT NULL, -- 'VayuDrishti-Hybrid-LightGBM'
    model_version VARCHAR(32) NOT NULL, -- 'v1.0.0-phase3'
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED'
    config_reference JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Forecasts (Hourly 72-hour predictions per station/location)
CREATE TABLE IF NOT EXISTS forecasts (
    id BIGSERIAL,
    forecast_cycle TIMESTAMPTZ NOT NULL,
    valid_time TIMESTAMPTZ NOT NULL,
    lead_hour INTEGER NOT NULL,
    station_id VARCHAR(64) REFERENCES monitoring_stations(id) ON DELETE CASCADE,
    location_id VARCHAR(64) REFERENCES locations(id) ON DELETE CASCADE,
    variable VARCHAR(32) NOT NULL, -- 'PM2.5', 'PM10', 'O3', 'NO2', 'AQI'
    predicted_value DOUBLE PRECISION NOT NULL,
    p10_value DOUBLE PRECISION,
    p90_value DOUBLE PRECISION,
    model_run_id VARCHAR(64) REFERENCES model_runs(id) ON DELETE CASCADE,
    model_version VARCHAR(32) NOT NULL,
    PRIMARY KEY (id, valid_time)
);
CREATE INDEX IF NOT EXISTS idx_forecasts_stn_cycle ON forecasts (station_id, forecast_cycle, valid_time);

-- 7. Fire Events (Satellite active fires / thermal anomalies from VIIRS/MODIS)
CREATE TABLE IF NOT EXISTS fire_events (
    id BIGSERIAL PRIMARY KEY,
    source VARCHAR(32) NOT NULL, -- 'VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT'
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    acq_time TIMESTAMPTZ NOT NULL,
    frp_mw DOUBLE PRECISION NOT NULL,
    brightness_temp_k DOUBLE PRECISION,
    confidence VARCHAR(16),
    daynight VARCHAR(2),
    state VARCHAR(64) DEFAULT 'Punjab',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fire_events_time ON fire_events (acq_time DESC);

-- 8. Alerts (GRAP enforcement & emergency public health notifications)
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(64) NOT NULL, -- 'GRAP_STAGE_1', 'GRAP_STAGE_2', 'INVERSION_LOCK', 'STUBBLE_PLUME'
    severity VARCHAR(32) NOT NULL, -- 'INFO', 'WARNING', 'CRITICAL', 'EMERGENCY'
    location_id VARCHAR(64) REFERENCES locations(id) ON DELETE CASCADE,
    triggered_at TIMESTAMPTZ NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'
    metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_alerts_status_time ON alerts (status, triggered_at DESC);
