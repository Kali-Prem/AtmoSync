/**
 * ATMOSYNC API Client (Phase 4)
 * Type-safe interface to the FastAPI backend serving verified observations and baseline forecasts.
 */

function resolveApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "").trim();
  if (!raw) {
    return "http://127.0.0.1:8000";
  }
  let base = raw.replace(/\/+$/, "");
  if (base.endsWith("/api")) {
    base = base.slice(0, -4);
  }
  if (base.startsWith("http://") || base.startsWith("https://")) {
    return base;
  }
  if (base.startsWith("localhost") || base.startsWith("127.0.0.1")) {
    return `http://${base}`;
  }
  if (base === "atmosync-api") {
    return "https://atmosync-api.onrender.com";
  }
  return `https://${base}`;
}

const API_BASE_URL = resolveApiBaseUrl();

export interface SystemHealth {
  status: string;
  timestamp: string;
  app_name: string;
  version: string;
  environment: string;
  database: {
    status: string;
    engine: string;
  };
  active_providers: Record<string, string>;
}

export interface MonitoringStation {
  id: string;
  station_code: string;
  name: string;
  location_id?: string;
  latitude: number;
  longitude: number;
  provider: string;
  status: string;
  elevation_m: number;
  extra_metadata?: Record<string, any>;
}

export interface InversionStatus {
  status: string;
  timestamp?: string;
  temperature_2m?: number;
  boundary_layer_height_m?: number;
  wind_speed_10m?: number;
  near_surface_lapse_rate?: number;
  inversion_class?: string;
  trapping_severity_index?: number;
  ventilation_index?: number;
  risk_summary?: string;
  message?: string;
}

export interface ForecastStep {
  horizon_hours: number;
  target_time_utc: string;
  predicted_pm25_ugm3: number;
  derived_aqi: number;
  aqi_category: string;
  model_type: string;
}

export interface StationForecastResponse {
  status: string;
  station_code: string;
  station_name: string;
  initialization_time_utc: string;
  latest_observed_pm25: number;
  forecast_horizons: ForecastStep[];
  data_freshness: {
    dataset_source: string;
    last_pipeline_run: string;
    temporal_coverage: string;
  };
}

export interface StationObservationRecord {
  station_code: string;
  station_name: string;
  timestamp_utc: string;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co_mgm3: number;
  o3: number;
  temp_c: number;
  rh_pct: number;
  wind_speed_ms: number;
  pblh_m: number;
  itsi: number;
}

export interface LatestObservationsResponse {
  status: string;
  stations_count: number;
  records: StationObservationRecord[];
}

export interface DataFreshness {
  status: string;
  last_ingestion_utc: string;
  latest_observation_utc: string;
  latest_forecast_generated_utc: string;
  dataset_name: string;
  providers_active: string[];
  message: string;
}

export interface ModelMetadata {
  status: string;
  active_models: Array<{
    name: string;
    version: string;
    type: string;
    status: string;
    horizons_loaded?: number[];
  }>;
  benchmark_evaluation: Record<string, Record<string, Record<string, number>>>;
}

export async function fetchHealth(): Promise<SystemHealth | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Failed to connect to ATMOSYNC API:", err);
    return null;
  }
}

export async function fetchStations(): Promise<MonitoringStation[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/locations/stations`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch stations:", err);
    return [];
  }
}

export async function fetchInversionStatus(): Promise<InversionStatus | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/inversion/status`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch inversion status:", err);
    return null;
  }
}

export async function fetchStationForecast(stationCode: string): Promise<StationForecastResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/forecasts/stations/${stationCode}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch forecast for ${stationCode}:`, err);
    return null;
  }
}

export async function fetchLatestObservations(): Promise<LatestObservationsResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/observations/latest`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch latest observations:", err);
    return null;
  }
}

export async function fetchDataFreshness(): Promise<DataFreshness | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/forecasts/freshness`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch data freshness:", err);
    return null;
  }
}

export async function fetchModelMetadata(): Promise<ModelMetadata | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/forecasts/models`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch model metadata:", err);
    return null;
  }
}

export async function fetchAtmosphereCurrent(): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/atmosphere/current`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch atmosphere:", err);
    return null;
  }
}

export async function fetchFireClusters(): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/fires/clusters`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch fire clusters:", err);
    return null;
  }
}

export async function fetchPlumeRisk(): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/plume/risk`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch plume risk:", err);
    return null;
  }
}

