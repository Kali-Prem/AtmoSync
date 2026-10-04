/**
 * ATMOSYNC API Client (Phase 4)
 * Type-safe interface to the FastAPI backend serving verified observations and baseline forecasts.
 */

function resolveApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "").trim();
  if (!raw) {
    return "https://atmosync-api.onrender.com";
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
  is_default_anchor?: boolean;
  extra_metadata?: Record<string, any>;
}

export const DEFAULT_ANCHOR_CODES = new Set([
  'DL_ANAND_VIHAR',
  'DL_PUNJABI_BAGH',
  'DL_RK_PURAM',
  'DL_IGI_AIRPORT',
  'DL_BAWANA'
]);

export const EXPERIMENTAL_STATIONS: MonitoringStation[] = [
  {
    id: 'stn_dl_major_dhyan_chand',
    station_code: 'DL_MAJOR_DHYAN_CHAND',
    name: 'Major Dhyan Chand National Stadium, Delhi - DPCC',
    location_id: 'loc_delhi_central',
    latitude: 28.6119,
    longitude: 77.2372,
    provider: 'DPCC',
    status: 'ACTIVE',
    elevation_m: 215.0,
    is_default_anchor: false,
    extra_metadata: {
      station_type: 'Urban Background / Sports Complex',
      is_experimental: true,
      category: 'experimental',
      is_traffic_hotspot: false
    }
  },
  {
    id: 'stn_dl_alipur',
    station_code: 'DL_ALIPUR',
    name: 'Alipur, Delhi - DPCC',
    location_id: 'loc_delhi_north',
    latitude: 28.8153,
    longitude: 77.1530,
    provider: 'DPCC',
    status: 'ACTIVE',
    elevation_m: 216.0,
    is_default_anchor: false,
    extra_metadata: {
      station_type: 'Semi-Urban / Agricultural Boundary',
      is_experimental: true,
      category: 'experimental',
      is_traffic_hotspot: false
    }
  },
  {
    id: 'stn_dl_vivek_vihar',
    station_code: 'DL_VIVEK_VIHAR',
    name: 'Vivek Vihar, Delhi - DPCC',
    location_id: 'loc_delhi_east',
    latitude: 28.6723,
    longitude: 77.3153,
    provider: 'DPCC',
    status: 'ACTIVE',
    elevation_m: 214.0,
    is_default_anchor: false,
    extra_metadata: {
      station_type: 'Urban Residential',
      is_experimental: true,
      category: 'experimental',
      is_traffic_hotspot: true
    }
  }
];

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

async function safeApiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
  const url = `${API_BASE_URL}${endpoint}`;
  const method = options.method || "GET";
  try {
    const res = await fetch(url, { ...options, cache: "no-store" });
    if (!res.ok) {
      console.warn(`[ATMOSYNC API] ${method} ${url} -> HTTP ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    return data as T;
  } catch (err: any) {
    console.error(`[ATMOSYNC API] Network/Fetch Error: ${method} ${url}:`, err?.message || err);
    return null;
  }
}

export async function fetchHealth(): Promise<SystemHealth | null> {
  return safeApiFetch<SystemHealth>("/health");
}

export async function fetchStations(): Promise<MonitoringStation[]> {
  const res = await safeApiFetch<MonitoringStation[]>("/api/v1/locations/stations");
  const stations = res && Array.isArray(res) ? res : [];

  // Normalize is_default_anchor flag cleanly
  const processed: MonitoringStation[] = stations.map((stn) => ({
    ...stn,
    is_default_anchor: stn.is_default_anchor !== undefined
      ? Boolean(stn.is_default_anchor)
      : DEFAULT_ANCHOR_CODES.has(stn.station_code)
  }));

  // Ensure experimental demo stations exist in the registry even if connecting
  // to a deployment before the backend migration completes on Render
  const existingCodes = new Set(processed.map((s) => s.station_code));
  for (const exp of EXPERIMENTAL_STATIONS) {
    if (!existingCodes.has(exp.station_code)) {
      processed.push(exp);
    }
  }

  return processed;
}

export async function fetchInversionStatus(): Promise<InversionStatus | null> {
  return safeApiFetch<InversionStatus>("/api/v1/inversion/status");
}

export async function fetchStationForecast(stationCode: string): Promise<StationForecastResponse | null> {
  return safeApiFetch<StationForecastResponse>(`/api/v1/forecasts/stations/${encodeURIComponent(stationCode)}`);
}

export async function fetchLatestObservations(): Promise<LatestObservationsResponse | null> {
  return safeApiFetch<LatestObservationsResponse>("/api/v1/observations/latest");
}

export async function fetchDataFreshness(): Promise<DataFreshness | null> {
  return safeApiFetch<DataFreshness>("/api/v1/forecasts/freshness");
}

export async function fetchModelMetadata(): Promise<ModelMetadata | null> {
  return safeApiFetch<ModelMetadata>("/api/v1/forecasts/models");
}

export async function fetchAtmosphereCurrent(): Promise<any | null> {
  return safeApiFetch<any>("/api/v1/atmosphere/current");
}

export async function fetchFireClusters(): Promise<any | null> {
  return safeApiFetch<any>("/api/v1/fires/clusters");
}

export async function fetchPlumeRisk(): Promise<any | null> {
  return safeApiFetch<any>("/api/v1/plume/risk");
}


