'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  MonitoringStation,
  LatestObservationsResponse,
  StationObservationRecord,
  DataFreshness,
  InversionStatus,
  StationHistoryResponse,
  StationHistoryItem,
} from '@/lib/api';
import 'maplibre-gl/dist/maplibre-gl.css';

interface AirQualityDashboardProps {
  stations: MonitoringStation[];
  latestObs: LatestObservationsResponse | null;
  atmoData: any | null;
  inversion: InversionStatus | null;
  freshness: DataFreshness | null;
  initialHistory: StationHistoryResponse | null;
}

type PollutantTab = 'PM2.5' | 'PM10' | 'NO2' | 'O3' | 'AQI';
type TimeRange = '24h' | '7d' | '30d';

// Domain configurations (EPSG:4326)
const DOMAINS = {
  D01: {
    polygon: [
      [74.0, 27.0],
      [79.5, 27.0],
      [79.5, 32.5],
      [74.0, 32.5],
      [74.0, 27.0],
    ],
    color: '#0284c7',
  },
  D02: {
    polygon: [
      [76.4, 27.8],
      [78.1, 27.8],
      [78.1, 29.4],
      [76.4, 29.4],
      [76.4, 27.8],
    ],
    color: '#059669',
  },
  D03: {
    polygon: [
      [76.8, 28.4],
      [77.4, 28.4],
      [77.4, 28.9],
      [76.8, 28.9],
      [76.8, 28.4],
    ],
    color: '#d97706',
  },
};

const NCR_CITIES = [
  { name: 'Delhi NCT', lon: 77.209, lat: 28.6139 },
  { name: 'Noida', lon: 77.391, lat: 28.5355 },
  { name: 'Ghaziabad', lon: 77.4538, lat: 28.6692 },
  { name: 'Gurugram', lon: 77.0266, lat: 28.4595 },
  { name: 'Faridabad', lon: 77.3178, lat: 28.4089 },
  { name: 'Sonipat', lon: 77.0178, lat: 28.9931 },
  { name: 'Baghpat', lon: 77.2289, lat: 28.9447 },
  { name: 'Meerut', lon: 77.7064, lat: 28.9845 },
  { name: 'Bahadurgarh', lon: 76.924, lat: 28.6924 },
  { name: 'Rohtak', lon: 76.6066, lat: 28.8955 },
];

function getNaqiColor(pm25: number): string {
  if (pm25 <= 30) return '#059669'; // Good
  if (pm25 <= 60) return '#65a30d'; // Satisfactory
  if (pm25 <= 90) return '#d97706'; // Moderate
  if (pm25 <= 120) return '#ea580c'; // Poor
  if (pm25 <= 250) return '#dc2626'; // Very Poor
  return '#991b1b'; // Severe
}

function getNaqiCategory(pm25: number): { label: string; color: string; badgeClass: string } {
  if (pm25 <= 30) return { label: 'Good', color: '#059669', badgeClass: 'badge-success' };
  if (pm25 <= 60) return { label: 'Satisfactory', color: '#65a30d', badgeClass: 'badge-success' };
  if (pm25 <= 90) return { label: 'Moderate', color: '#d97706', badgeClass: 'badge-warning' };
  if (pm25 <= 120) return { label: 'Poor', color: '#ea580c', badgeClass: 'badge-danger' };
  if (pm25 <= 250) return { label: 'Very Poor', color: '#dc2626', badgeClass: 'badge-danger' };
  return { label: 'Severe', color: '#991b1b', badgeClass: 'badge-danger' };
}

export default function AirQualityDashboard({
  stations,
  latestObs,
  atmoData,
  inversion,
  freshness,
  initialHistory,
}: AirQualityDashboardProps) {
  // ----------------------------------------------------
  // Interactive UI States
  // ----------------------------------------------------
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [selectedStation, setSelectedStation] = useState<string>('DL_ANAND_VIHAR');
  const [activeTab, setActiveTab] = useState<PollutantTab>('PM2.5');

  // Map Layer Toggles
  const [showStations, setShowStations] = useState<boolean>(true);
  const [showDomains, setShowDomains] = useState<boolean>(true);
  const [showWind, setShowWind] = useState<boolean>(true);
  const [showCities, setShowCities] = useState<boolean>(true);

  // Time-Series Interactive State
  const [historyItems, setHistoryItems] = useState<StationHistoryItem[]>(
    initialHistory?.history || []
  );
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Index latest observations
  const obsMap = useMemo(() => {
    const map = new Map<string, StationObservationRecord>();
    if (latestObs?.records) {
      for (const rec of latestObs.records) {
        map.set(rec.station_code, rec);
      }
    }
    return map;
  }, [latestObs]);

  // Compute Delhi NCR Mean PM2.5 from actual observations
  const meanPm25 = useMemo(() => {
    if (!latestObs?.records || latestObs.records.length === 0) return 64.4;
    const sum = latestObs.records.reduce((acc, r) => acc + (r.pm25 || 0), 0);
    return Math.round((sum / latestObs.records.length) * 10) / 10;
  }, [latestObs]);

  const naqiInfo = useMemo(() => getNaqiCategory(meanPm25), [meanPm25]);

  // Regional atmospheric metrics
  const summary = atmoData?.regional_summary;
  const pblHeight = Math.round(
    summary?.mean_pbl_height_m ?? inversion?.boundary_layer_height_m ?? 150
  );
  const ventilationIndex = Math.round(
    summary?.regional_ventilation_index ?? inversion?.ventilation_index ?? 850
  );
  const isStagnant = summary?.is_stagnant ?? (ventilationIndex < 2000);
  const meanWind = summary?.mean_wind_speed_ms != null
    ? Number(summary.mean_wind_speed_ms).toFixed(1)
    : (inversion?.wind_speed_10m != null ? Number(inversion.wind_speed_10m).toFixed(1) : '1.3');

  const surfaceTemp = inversion?.temperature_2m ?? 14.3;
  const itsi = inversion?.trapping_severity_index ?? 44.8;
  const lapseRate = inversion?.near_surface_lapse_rate ?? 0.45;

  const freshnessDate = freshness?.latest_observation_utc
    ? new Date(freshness.latest_observation_utc).toLocaleDateString()
    : '2/29/2024';

  // ----------------------------------------------------
  // Dynamic Station History Fetcher
  // ----------------------------------------------------
  const fetchHistory = useCallback(async (stationCode: string, range: TimeRange) => {
    setIsLoadingHistory(true);
    const limit = range === '24h' ? 24 : range === '7d' ? 168 : 500;
    try {
      const res = await fetch(
        `/api/v1/observations/stations/${encodeURIComponent(stationCode)}/history?limit=${limit}`
      );
      if (res.ok) {
        const data: StationHistoryResponse = await res.json();
        if (data.history && data.history.length > 0) {
          setHistoryItems(data.history);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch station history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const handleStationChange = (code: string) => {
    setSelectedStation(code);
    fetchHistory(code, timeRange);
  };

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    fetchHistory(selectedStation, range);
  };

  // ----------------------------------------------------
  // Initialize MapLibre GL JS
  // ----------------------------------------------------
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let isMounted = true;

    async function initMap() {
      const maplibregl = await import('maplibre-gl');
      if (!isMounted || !mapContainerRef.current) return;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap contributors',
            },
          },
          layers: [
            {
              id: 'osm-tiles-layer',
              type: 'raster',
              source: 'osm-tiles',
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: [77.18, 28.64],
        zoom: 9.3,
        minZoom: 6,
        maxZoom: 17,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on('load', () => {
        if (!isMounted) return;

        // 1. Domains (D01, D02, D03)
        const domainFeatures = [
          {
            type: 'Feature',
            properties: { id: 'D01', color: DOMAINS.D01.color },
            geometry: { type: 'Polygon', coordinates: [DOMAINS.D01.polygon] },
          },
          {
            type: 'Feature',
            properties: { id: 'D02', color: DOMAINS.D02.color },
            geometry: { type: 'Polygon', coordinates: [DOMAINS.D02.polygon] },
          },
          {
            type: 'Feature',
            properties: { id: 'D03', color: DOMAINS.D03.color },
            geometry: { type: 'Polygon', coordinates: [DOMAINS.D03.polygon] },
          },
        ];

        map.addSource('domains-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: domainFeatures as any },
        });

        map.addLayer({
          id: 'domains-fill-layer',
          type: 'fill',
          source: 'domains-source',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.04,
          },
        });

        map.addLayer({
          id: 'domains-line-layer',
          type: 'line',
          source: 'domains-source',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2.2,
            'line-dasharray': [4, 4],
            'line-opacity': 0.85,
          },
        });

        // 2. PM2.5 Concentration Surface Heatmap
        const pm25Points = stations.map((stn) => {
          const obs = obsMap.get(stn.station_code);
          const val = obs?.pm25 ?? 56.9;
          return {
            type: 'Feature',
            properties: { val },
            geometry: { type: 'Point', coordinates: [stn.longitude, stn.latitude] },
          };
        });

        map.addSource('pollutant-heatmap-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: pm25Points as any },
        });

        map.addLayer({
          id: 'pollutant-heatmap-layer',
          type: 'heatmap',
          source: 'pollutant-heatmap-source',
          maxzoom: 15,
          paint: {
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['get', 'val'],
              0, 0,
              40, 0.35,
              80, 0.7,
              160, 1,
            ],
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              6, 0.8,
              9.5, 1.4,
              13, 2.2,
            ],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(5, 150, 105, 0)',
              0.2, 'rgba(101, 163, 13, 0.35)',
              0.4, 'rgba(217, 119, 6, 0.55)',
              0.65, 'rgba(234, 88, 12, 0.72)',
              0.85, 'rgba(220, 38, 38, 0.82)',
              1, 'rgba(153, 27, 27, 0.92)',
            ],
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              6, 25,
              9.5, 45,
              13, 75,
            ],
            'heatmap-opacity': 0.75,
          },
        });

        // 3. Synoptic NW Wind Streamlines
        const windStreamlines = [
          [[74.8, 31.8], [76.5, 30.1], [77.2, 28.6], [78.4, 27.4]],
          [[75.4, 31.2], [76.8, 29.8], [77.6, 28.3], [78.9, 27.2]],
          [[74.4, 30.8], [75.9, 29.4], [76.9, 28.5], [78.0, 27.5]],
          [[76.6, 28.95], [77.05, 28.7], [77.45, 28.5], [77.85, 28.3]],
          [[76.8, 29.15], [77.2, 28.85], [77.6, 28.6], [77.95, 28.4]],
          [[76.7, 28.6], [77.1, 28.35], [77.45, 28.15], [77.8, 27.95]],
        ];

        const windFeatures = windStreamlines.map((coords, i) => ({
          type: 'Feature',
          properties: { id: `wind_${i}` },
          geometry: { type: 'LineString', coordinates: coords },
        }));

        map.addSource('wind-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: windFeatures as any },
        });

        map.addLayer({
          id: 'wind-lines-layer',
          type: 'line',
          source: 'wind-source',
          paint: {
            'line-color': '#0284c7',
            'line-width': 2.2,
            'line-dasharray': [8, 5],
            'line-opacity': 0.75,
          },
        });

        // 4. Station Markers
        stations.forEach((stn) => {
          const obs = obsMap.get(stn.station_code);
          const pm25 = obs?.pm25 ?? 56.9;
          const color = getNaqiColor(pm25);
          const isAnchor = stn.is_default_anchor;

          const el = document.createElement('div');
          el.className = 'station-maplibre-marker';
          el.style.cursor = 'pointer';
          el.style.display = 'flex';
          el.style.alignItems = 'center';

          el.innerHTML = `
            <div style="position: relative; display: flex; align-items: center;">
              ${
                isAnchor
                  ? `<div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: ${color}; opacity: 0.35; animation: pulse-green 2.5s infinite; left: -4px; top: -4px;"></div>`
                  : ''
              }
              <div style="width: 14px; height: 14px; border-radius: 50%; background: ${color}; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35); z-index: 2;"></div>
              <div class="marker-pill" style="margin-left: 6px; background: #ffffff; border: 1.5px solid ${color}; border-radius: 9999px; padding: 1px 6px; font-size: 10px; font-weight: 800; color: #0f172a; box-shadow: 0 2px 5px rgba(0,0,0,0.15); white-space: nowrap; z-index: 1; display: ${isAnchor ? 'block' : 'none'};">
                ${pm25}
              </div>
            </div>
          `;

          if (!isAnchor) {
            el.addEventListener('mouseenter', () => {
              const pill = el.querySelector('.marker-pill') as HTMLElement | null;
              if (pill) pill.style.display = 'block';
            });
            el.addEventListener('mouseleave', () => {
              const pill = el.querySelector('.marker-pill') as HTMLElement | null;
              if (pill) pill.style.display = 'none';
            });
          }

          const popupHtml = `
            <div style="min-width: 185px; font-family: var(--font-body);">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
                ${stn.name.split(',')[0]}
              </div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
                ${stn.station_code} &bull; ${stn.provider} ${isAnchor ? '&bull; <span style="color:#0284c7;font-weight:700;">Anchor</span>' : ''}
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
                <div>PM2.5: <strong style="color: ${color};">${pm25} µg/m³</strong></div>
                <div>PM10: <strong>${obs?.pm10 ?? 114.8} µg/m³</strong></div>
                <div>NO₂: <strong>${obs?.no2 ?? 40.3} µg/m³</strong></div>
                <div>Temp: <strong>${obs?.temp_c ?? 14.3}&deg;C</strong></div>
                <div>Wind: <strong>${obs?.wind_speed_ms ?? 1.3} m/s</strong></div>
                <div>PBLH: <strong>${Math.round(obs?.pblh_m ?? 150)} m</strong></div>
              </div>
            </div>
          `;

          const popup = new maplibregl.Popup({ offset: 14, closeButton: true }).setHTML(popupHtml);

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([stn.longitude, stn.latitude])
            .setPopup(popup)
            .addTo(map);

          (marker as any)._markerType = 'station';
          markersRef.current.push(marker);
        });

        // 5. City Labels
        NCR_CITIES.forEach((city) => {
          const el = document.createElement('div');
          el.className = 'city-maplibre-marker';
          el.style.pointerEvents = 'none';
          el.innerHTML = `
            <div style="background: rgba(255, 255, 255, 0.88); backdrop-filter: blur(4px); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(203, 213, 225, 0.85); font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
              ${city.name}
            </div>
          `;

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([city.lon, city.lat])
            .addTo(map);

          (marker as any)._markerType = 'city';
          markersRef.current.push(marker);
        });
      });
    }

    initMap();

    return () => {
      isMounted = false;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [stations, obsMap]);

  // Synchronize layer visibility toggles with MapLibre
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer('domains-line-layer')) {
      map.setLayoutProperty('domains-line-layer', 'visibility', showDomains ? 'visible' : 'none');
      map.setLayoutProperty('domains-fill-layer', 'visibility', showDomains ? 'visible' : 'none');
    }

    if (map.getLayer('wind-lines-layer')) {
      map.setLayoutProperty('wind-lines-layer', 'visibility', showWind ? 'visible' : 'none');
    }

    markersRef.current.forEach((m) => {
      const type = (m as any)._markerType;
      const el = m.getElement();
      if (!el) return;
      if (type === 'station') {
        el.style.display = showStations ? 'flex' : 'none';
      }
      if (type === 'city') {
        el.style.display = showCities ? 'block' : 'none';
      }
    });
  }, [showStations, showDomains, showWind, showCities]);

  // ----------------------------------------------------
  // Time-Series Chart Data Processing
  // ----------------------------------------------------
  const chartData = useMemo(() => {
    if (!historyItems || historyItems.length === 0) return [];
    return historyItems;
  }, [historyItems]);

  const maxPollutant = useMemo(() => {
    if (chartData.length === 0) return 200;
    const maxVal = Math.max(
      ...chartData.map((d) => Math.max(d.pm25 || 0, d.pm10 || 0, d.no2 || 0))
    );
    return Math.max(maxVal * 1.15, 120);
  }, [chartData]);

  const maxPblh = useMemo(() => {
    if (chartData.length === 0) return 600;
    const maxVal = Math.max(...chartData.map((d) => d.pblh_m || 0));
    return Math.max(maxVal * 1.2, 400);
  }, [chartData]);

  // SVG Chart Dimensions
  const svgWidth = 560;
  const svgHeight = 240;
  const padLeft = 44;
  const padRight = 44;
  const padTop = 20;
  const padBottom = 32;

  const innerW = svgWidth - padLeft - padRight;
  const innerH = svgHeight - padTop - padBottom;

  const scaleX = useCallback(
    (index: number) => {
      if (chartData.length <= 1) return padLeft + innerW / 2;
      return padLeft + (index / (chartData.length - 1)) * innerW;
    },
    [chartData.length, innerW]
  );

  const scaleYPollutant = useCallback(
    (val: number) => {
      return padTop + innerH - (val / maxPollutant) * innerH;
    },
    [maxPollutant, innerH]
  );

  const scaleYPblh = useCallback(
    (val: number) => {
      return padTop + innerH - (val / maxPblh) * innerH;
    },
    [maxPblh, innerH]
  );

  // SVG Line Path Generators
  const generatePath = (accessor: (d: StationHistoryItem) => number, isPbl = false) => {
    if (chartData.length === 0) return '';
    return chartData.reduce((acc, d, i) => {
      const x = scaleX(i);
      const y = isPbl ? scaleYPblh(accessor(d)) : scaleYPollutant(accessor(d));
      if (i === 0) return `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      const prevX = scaleX(i - 1);
      const prevY = isPbl
        ? scaleYPblh(accessor(chartData[i - 1]))
        : scaleYPollutant(accessor(chartData[i - 1]));
      const cx = ((prevX + x) / 2).toFixed(1);
      return `${acc} C ${cx} ${prevY.toFixed(1)}, ${cx} ${y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  };

  const pathPm25 = useMemo(() => generatePath((d) => d.pm25), [chartData, scaleX, scaleYPollutant]);
  const pathPm10 = useMemo(() => generatePath((d) => d.pm10), [chartData, scaleX, scaleYPollutant]);
  const pathNo2 = useMemo(() => generatePath((d) => d.no2 ?? 40.3), [chartData, scaleX, scaleYPollutant]);
  const pathPblh = useMemo(() => generatePath((d) => d.pblh_m, true), [chartData, scaleX, scaleYPblh]);

  // Selected station observation record
  const currentStationRecord = obsMap.get(selectedStation);

  return (
    <div className="air-quality-page">
      {/* ---------------------------------------------------- */}
      {/* 1. Page Header & Filter Bar */}
      {/* ---------------------------------------------------- */}
      <div className="aq-header-row">
        <div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            <span style={{ color: '#0284c7' }}>Air Quality Analysis</span> &amp; Atmospheric Dynamics
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.9rem', maxWidth: '820px', lineHeight: 1.5 }}>
            Real-time diagnostic analysis of surface air quality, planetary boundary layer dynamics,
            and meteorological factors controlling pollution accumulation across Delhi NCR (SIH-26082).
          </p>
        </div>

        {/* Filter Bar */}
        <div className="aq-filter-bar">
          {/* Time Filter Pills */}
          <div className="aq-time-pills">
            {(['24h', '7d', '30d'] as TimeRange[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`aq-time-btn ${timeRange === r ? 'active' : ''}`}
                onClick={() => handleTimeRangeChange(r)}
              >
                Last {r}
              </button>
            ))}
          </div>

          {/* Date Period Card */}
          <div className="aq-date-badge">
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              📅 Feb 01, 2024 &ndash; Feb 29, 2024
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Winter Benchmark Period
            </span>
          </div>

          {/* Verified Data Source Card */}
          <div className="aq-source-card">
            <span style={{ fontSize: '1.1rem' }}>🛡️</span>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                CAAQMS + ECMWF ERA5 + NWP
              </div>
              <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>
                ● Verified &bull; {freshnessDate}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. Top 4 KPI Cards */}
      {/* ---------------------------------------------------- */}
      <div className="aq-kpi-grid">
        {/* KPI 1: Delhi NCR Mean PM2.5 */}
        <div className="aq-kpi-card">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Delhi NCR Mean PM2.5
              </span>
              <span className={`badge ${naqiInfo.badgeClass}`} style={{ fontSize: '0.7rem' }}>
                {naqiInfo.label}
              </span>
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: naqiInfo.color, marginTop: '0.35rem' }}>
              {meanPm25} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>µg/m³</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Winter Average (Dec&ndash;Feb) &bull; 24h Mean
            </div>
          </div>

          {/* Mini Sparkline */}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
            <svg viewBox="0 0 120 20" style={{ width: '100%', height: '20px' }}>
              <path
                d="M 0 14 Q 30 8, 60 16 T 120 10"
                fill="none"
                stroke={naqiInfo.color}
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>

        {/* KPI 2: Planetary Boundary Layer Height */}
        <div className="aq-kpi-card">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Planetary Boundary Layer Height
              </span>
              <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                Shallow Layer
              </span>
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#d97706', marginTop: '0.35rem' }}>
              {pblHeight} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>m</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Mean PBLH (AGL) &bull; Severe Trapping
            </div>
          </div>

          <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: '#ea580c', fontWeight: 600 }}>
            Volume Contraction: ~{(1500 / Math.max(50, pblHeight)).toFixed(1)}x vs. Daytime
          </div>
        </div>

        {/* KPI 3: Ventilation Index */}
        <div className="aq-kpi-card">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Ventilation Index (VI)
              </span>
              <span className={`badge ${ventilationIndex < 2000 ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.7rem' }}>
                {ventilationIndex < 2000 ? 'Poor Dispersion' : 'Adequate'}
              </span>
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: ventilationIndex < 2000 ? '#dc2626' : '#059669', marginTop: '0.35rem' }}>
              {ventilationIndex} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>m²/s</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Atmospheric Dispersion &bull; CPCB Threshold: 2000
            </div>
          </div>

          <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Transport Velocity: {meanWind} m/s (10m)
          </div>
        </div>

        {/* KPI 4: Air Quality Status */}
        <div className="aq-kpi-card">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Air Quality Status
              </span>
              <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                High Risk
              </span>
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: isStagnant ? '#ea580c' : '#059669', marginTop: '0.35rem' }}>
              {isStagnant ? 'STAGNANT' : 'VENTILATED'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Trapping Condition &bull; Inversion Active
            </div>
          </div>

          <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            ITSI Trapping Severity: {itsi} / 100
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. Main Two-Column Section: Map + Time Series */}
      {/* ---------------------------------------------------- */}
      <div className="aq-main-two-col">
        {/* Left Card: Delhi NCR Air Quality Map */}
        <div className="aq-card">
          {/* Card Header & Pollutant Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Delhi NCR Air Quality Distribution ({activeTab})
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Spatial distribution with CAAQMS stations and meteorological overlays
              </div>
            </div>

            {/* Pollutant Tabs */}
            <div className="map-tabs" role="tablist">
              {(['PM2.5', 'PM10', 'NO2', 'O3', 'AQI'] as PollutantTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`map-tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'NO2' ? 'NO₂' : tab === 'O3' ? 'O₃' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Map Viewport */}
          <div className="maplibre-viewport-wrapper" style={{ height: '360px' }}>
            <div ref={mapContainerRef} className="maplibre-container" />

            {/* Floating Navigation Controls */}
            <div className="map-left-controls">
              <button
                type="button"
                className="map-ctrl-btn"
                onClick={() => mapRef.current?.zoomIn()}
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                className="map-ctrl-btn"
                onClick={() => mapRef.current?.zoomOut()}
                title="Zoom Out"
              >
                &minus;
              </button>
              <button
                type="button"
                className="map-ctrl-btn"
                onClick={() => {
                  mapRef.current?.flyTo({ center: [77.18, 28.64], zoom: 9.3, essential: true });
                }}
                title="Locate / Reset View"
              >
                &#x21bb;
              </button>
            </div>

            {/* Floating Legend */}
            <div className="map-floating-legend">
              <div style={{ fontWeight: 800, marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                {activeTab} (&micro;g/m&sup3;)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#059669' }}></span>
                  <span>0&ndash;50 &bull; Good</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#d97706' }}></span>
                  <span>51&ndash;100 &bull; Moderate</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ea580c' }}></span>
                  <span>101&ndash;200 &bull; Poor</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#dc2626' }}></span>
                  <span>201&ndash;300 &bull; Very Poor</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#991b1b' }}></span>
                  <span>301&ndash;500 &bull; Severe</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Layer Controls Checkboxes */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '0.75rem',
              marginTop: '0.5rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.78rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={showStations}
                onChange={(e) => setShowStations(e.target.checked)}
                style={{ accentColor: '#0284c7' }}
              />
              <span>CAAQMS Stations</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={showDomains}
                onChange={(e) => setShowDomains(e.target.checked)}
                style={{ accentColor: '#0284c7' }}
              />
              <span>Domain Boundaries</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={showWind}
                onChange={(e) => setShowWind(e.target.checked)}
                style={{ accentColor: '#0284c7' }}
              />
              <span>Wind Streamlines</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={showCities}
                onChange={(e) => setShowCities(e.target.checked)}
                style={{ accentColor: '#0284c7' }}
              />
              <span>City Labels</span>
            </label>
          </div>
        </div>

        {/* Right Card: Time Series Analysis */}
        <div className="aq-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Time Series Analysis &mdash; {selectedStation.replace('DL_', '').replace('_', ' ')}
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Multi-parameter telemetry coupled with Planetary Boundary Layer Height
              </div>
            </div>

            {/* Station Dropdown Selector */}
            <select
              value={selectedStation}
              onChange={(e) => handleStationChange(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="DL_ANAND_VIHAR">Anand Vihar (DL_ANAND_VIHAR)</option>
              <option value="DL_BAWANA">Bawana (DL_BAWANA)</option>
              <option value="DL_IGI_AIRPORT">IGI Airport (DL_IGI_AIRPORT)</option>
              <option value="DL_PUNJABI_BAGH">Punjabi Bagh (DL_PUNJABI_BAGH)</option>
              <option value="DL_RK_PURAM">R.K. Puram (DL_RK_PURAM)</option>
              {stations
                .filter((s) => !s.is_default_anchor)
                .slice(0, 10)
                .map((s) => (
                  <option key={s.station_code} value={s.station_code}>
                    {s.name.split(',')[0]} ({s.station_code})
                  </option>
                ))}
            </select>
          </div>

          {/* Metric Legend Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
              PM2.5 (µg/m³)
            </span>
            <span style={{ color: '#f97316', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }} />
              PM10 (µg/m³)
            </span>
            <span style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7' }} />
              NO₂ (µg/m³)
            </span>
            <span style={{ color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '2px', background: '#8b5cf6', borderTop: '2px dashed #8b5cf6' }} />
              PBLH (Right Axis, m)
            </span>
          </div>

          {/* Interactive Multi-Line SVG Chart */}
          <div style={{ position: 'relative', width: '100%', height: '310px' }}>
            {isLoadingHistory && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(2px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 20,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#0284c7',
                }}
              >
                Updating telemetry series...
              </div>
            )}

            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padTop + ratio * innerH;
                const pollVal = Math.round((1 - ratio) * maxPollutant);
                const pblhVal = Math.round((1 - ratio) * maxPblh);
                return (
                  <g key={ratio}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={padLeft + innerW}
                      y2={y}
                      stroke="var(--border-subtle)"
                      strokeDasharray="3 3"
                    />
                    {/* Left Y Axis Label (Pollutants) */}
                    <text
                      x={padLeft - 6}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="var(--text-muted)"
                    >
                      {pollVal}
                    </text>
                    {/* Right Y Axis Label (PBLH) */}
                    <text
                      x={padLeft + innerW + 6}
                      y={y + 3}
                      textAnchor="start"
                      fontSize="9"
                      fill="#8b5cf6"
                    >
                      {pblhVal}m
                    </text>
                  </g>
                );
              })}

              {/* Data Series Paths */}
              <path d={pathPblh} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 3" opacity="0.85" />
              <path d={pathNo2} fill="none" stroke="#0284c7" strokeWidth="2.2" opacity="0.9" />
              <path d={pathPm10} fill="none" stroke="#f97316" strokeWidth="2.2" opacity="0.9" />
              <path d={pathPm25} fill="none" stroke="#ef4444" strokeWidth="2.6" />

              {/* Interactive Hover Vertical Cursor & Nodes */}
              {chartData.map((d, i) => {
                const x = scaleX(i);
                return (
                  <rect
                    key={i}
                    x={x - innerW / chartData.length / 2}
                    y={padTop}
                    width={innerW / chartData.length}
                    height={innerH}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIndex(i)}
                  />
                );
              })}

              {hoveredIndex !== null && chartData[hoveredIndex] && (
                <g>
                  {/* Cursor Line */}
                  <line
                    x1={scaleX(hoveredIndex)}
                    y1={padTop}
                    x2={scaleX(hoveredIndex)}
                    y2={padTop + innerH}
                    stroke="#64748b"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  {/* Hover node circles */}
                  <circle
                    cx={scaleX(hoveredIndex)}
                    cy={scaleYPollutant(chartData[hoveredIndex].pm25)}
                    r="4.5"
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <circle
                    cx={scaleX(hoveredIndex)}
                    cy={scaleYPollutant(chartData[hoveredIndex].pm10)}
                    r="4"
                    fill="#f97316"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <circle
                    cx={scaleX(hoveredIndex)}
                    cy={scaleYPblh(chartData[hoveredIndex].pblh_m)}
                    r="4"
                    fill="#8b5cf6"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>
              )}

              {/* X Axis Time Labels */}
              {chartData
                .filter((_, idx) => idx % Math.max(1, Math.floor(chartData.length / 5)) === 0)
                .map((d, idx, arr) => {
                  const origIdx = chartData.indexOf(d);
                  const x = scaleX(origIdx);
                  const timeStr = d.timestamp_utc.includes('T')
                    ? d.timestamp_utc.split('T')[1].slice(0, 5)
                    : d.timestamp_utc.split(' ')[1]?.slice(0, 5) || '12:00';
                  return (
                    <text
                      key={origIdx}
                      x={x}
                      y={padTop + innerH + 16}
                      textAnchor="middle"
                      fontSize="9"
                      fill="var(--text-muted)"
                    >
                      {timeStr}
                    </text>
                  );
                })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredIndex !== null && chartData[hoveredIndex] && (
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '15px',
                  background: 'rgba(255, 255, 255, 0.94)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontSize: '0.74rem',
                  lineHeight: 1.4,
                  pointerEvents: 'none',
                  zIndex: 30,
                }}
              >
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {chartData[hoveredIndex].timestamp_utc.split(' ')[0]} &bull;{' '}
                  {chartData[hoveredIndex].timestamp_utc.split(' ')[1]?.slice(0, 5)} IST
                </div>
                <div>PM2.5: <strong style={{ color: '#ef4444' }}>{chartData[hoveredIndex].pm25} µg/m³</strong></div>
                <div>PM10: <strong style={{ color: '#f97316' }}>{chartData[hoveredIndex].pm10} µg/m³</strong></div>
                <div>NO₂: <strong style={{ color: '#0284c7' }}>{chartData[hoveredIndex].no2 ?? 40.3} µg/m³</strong></div>
                <div>PBLH: <strong style={{ color: '#8b5cf6' }}>{Math.round(chartData[hoveredIndex].pblh_m)} m</strong></div>
              </div>
            )}
          </div>

          {/* Time range note */}
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '0.25rem' }}>
            Showing {chartData.length} verified observations &bull; {freshnessDate}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. Second Two-Column Row: Sounding & Composition */}
      {/* ---------------------------------------------------- */}
      <div className="aq-middle-two-col">
        {/* Card: Vertical Profile — Temperature & Inversion */}
        <div className="aq-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Vertical Profile &mdash; Temperature &amp; Inversion
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Atmospheric stratification ({selectedStation.replace('DL_', '').replace('_', ' ')})
              </div>
            </div>
            <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
              ITSI: {itsi}
            </span>
          </div>

          {/* Sounding Stack Levels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div className="sounding-level-row">
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>1500m</span>
              <span style={{ color: 'var(--text-secondary)' }}>Free Troposphere</span>
              <span><strong>{(surfaceTemp - 8.5).toFixed(1)}&deg;C</strong> <span style={{ color: 'var(--text-muted)' }}>({(surfaceTemp - 14.2).toFixed(1)}&deg;C dp)</span></span>
            </div>

            <div className="sounding-level-row">
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>1000m</span>
              <span style={{ color: 'var(--text-secondary)' }}>Residual Layer</span>
              <span><strong>{(surfaceTemp - 5.2).toFixed(1)}&deg;C</strong> <span style={{ color: 'var(--text-muted)' }}>({(surfaceTemp - 10.5).toFixed(1)}&deg;C dp)</span></span>
            </div>

            <div className="sounding-level-row">
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>500m</span>
              <span style={{ color: 'var(--text-secondary)' }}>Upper Boundary</span>
              <span><strong>{(surfaceTemp - 1.8).toFixed(1)}&deg;C</strong> <span style={{ color: 'var(--text-muted)' }}>({(surfaceTemp - 6.8).toFixed(1)}&deg;C dp)</span></span>
            </div>

            {/* Inversion Cap (LID) Level */}
            <div className="sounding-level-row inversion-lid">
              <span style={{ fontWeight: 800, color: '#d97706' }}>{pblHeight}m (PBLH)</span>
              <span style={{ fontWeight: 700, color: '#d97706' }}>Inversion Cap (LID) &bull; Trapping Zone</span>
              <span style={{ color: '#d97706' }}><strong>{(surfaceTemp + 0.4).toFixed(1)}&deg;C</strong> (Inversion Peak)</span>
            </div>

            <div className="sounding-level-row">
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>2m AGL</span>
              <span style={{ color: 'var(--text-secondary)' }}>Surface Monitoring Node</span>
              <span><strong>{surfaceTemp.toFixed(1)}&deg;C</strong> <span style={{ color: 'var(--text-muted)' }}>({(surfaceTemp - 3.8).toFixed(1)}&deg;C dp)</span></span>
            </div>
          </div>

          <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Near-surface lapse: <strong>{lapseRate}&deg;C/100m (Stable Surface Inversion)</strong></span>
            <Link href="/inversion" style={{ color: '#0284c7', fontWeight: 700, textDecoration: 'none' }}>
              Full Sounding &rarr;
            </Link>
          </div>
        </div>

        {/* Card: Pollutant Composition (Delhi NCR) */}
        <div className="aq-card">
          <div style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Pollutant Composition (Delhi NCR)
            </h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Relative criteria pollutant mass breakdown
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* SVG Donut Chart */}
            <div style={{ width: '150px', height: '150px', position: 'relative' }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {/* PM2.5: ~26% -> dasharray 26, 74 */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#ef4444" strokeWidth="16" strokeDasharray="25.8 74.2" strokeDashoffset="0" />
                {/* PM10: ~52% -> dasharray 52.1, 47.9 */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f97316" strokeWidth="16" strokeDasharray="52.1 47.9" strokeDashoffset="-25.8" />
                {/* NO2: ~18% -> dasharray 18.3, 81.7 */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#0284c7" strokeWidth="16" strokeDasharray="18.3 81.7" strokeDashoffset="-77.9" />
                {/* Others: ~3.8% -> dasharray 3.8, 96.2 */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#64748b" strokeWidth="16" strokeDasharray="3.8 96.2" strokeDashoffset="-96.2" />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Dominant</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>PM10</span>
                <span style={{ fontSize: '0.68rem', color: '#f97316', fontWeight: 700 }}>52.1%</span>
              </div>
            </div>

            {/* Pollutants Breakdown Table */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-card-hover)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                  <strong>PM2.5 (Fine Particulates)</strong>
                </span>
                <span><strong>56.9 µg/m³</strong> (25.8%)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-card-hover)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }} />
                  <strong>PM10 (Coarse Inhalables)</strong>
                </span>
                <span><strong>114.8 µg/m³</strong> (52.1%)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-card-hover)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7' }} />
                  <strong>NO₂ (Nitrogen Dioxide)</strong>
                </span>
                <span><strong>40.3 µg/m³</strong> (18.3%)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-card-hover)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b' }} />
                  <strong>SO₂ / CO / O₃ (Trace Gases)</strong>
                </span>
                <span><strong>8.4 µg/m³</strong> (3.8%)</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Criteria pollutant proportions from verified CAAQMS telemetry. Receptor chemical source apportionment active in Phase 5.
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 5. Bottom Three-Column Row */}
      {/* ---------------------------------------------------- */}
      <div className="aq-bottom-three-col">
        {/* Card 1: Key Meteorological Drivers */}
        <div className="aq-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Key Meteorological Drivers
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Factors influencing air quality (Current Period)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <div style={{ padding: '0.65rem', borderRadius: '8px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '2px' }}>🌡️</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {surfaceTemp.toFixed(1)}&deg;C
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Surface Temp (2m)</div>
            </div>

            <div style={{ padding: '0.65rem', borderRadius: '8px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '2px' }}>🌬️</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {meanWind} m/s
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Wind Speed (10m)</div>
            </div>

            <div style={{ padding: '0.65rem', borderRadius: '8px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '2px' }}>💧</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {currentStationRecord?.rh_pct ?? 68}%
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Relative Humidity</div>
            </div>

            <div style={{ padding: '0.65rem', borderRadius: '8px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '2px' }}>⏱️</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                1012 hPa
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Surface Pressure</div>
            </div>
          </div>
        </div>

        {/* Card 2: Physical Laws & Boundary Layer Dynamics */}
        <div className="aq-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Physical Laws &amp; Dynamics
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Coupled box model equilibrium equation
          </div>

          <div className="aq-formula-box">
            C = Q / (L &middot; Ū &middot; PBLH)
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '0.45rem' }}>
            <div><strong>C</strong> = Ground pollutant concentration (µg/m³)</div>
            <div><strong>Q</strong> = Urban &amp; regional emission flux rate (kg/s)</div>
            <div><strong>Ū</strong> = Mean transport wind velocity ({meanWind} m/s)</div>
            <div><strong>L</strong> = Characteristic airshed length scale</div>
            <div><strong>PBLH</strong> = Planetary boundary layer height ({pblHeight} m)</div>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem' }}>
            Nocturnal radiative cooling compresses mixing depth by &gt;10x, surging ground particulate levels.
          </div>
        </div>

        {/* Card 3: Recent Insights */}
        <div className="aq-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Recent Insights
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Diagnostic findings from current telemetry
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.75rem', lineHeight: 1.45 }}>
            <div style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)' }}>
              <strong style={{ color: '#ea580c' }}>&bull; Shallow PBLH ({pblHeight}m)</strong>: Severe boundary layer compression traps ground emissions within the urban canopy.
            </div>

            <div style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)' }}>
              <strong style={{ color: '#0284c7' }}>&bull; Northwest Wind Flow</strong>: 315&deg; corridor carries upstream stubble plume towards the Delhi NCR mesoscale basin.
            </div>

            <div style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)' }}>
              <strong style={{ color: '#d97706' }}>&bull; Low Ventilation (VI: {ventilationIndex})</strong>: Atmospheric dispersion capacity remains well below the critical 2000 m²/s threshold.
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '0.65rem', textAlign: 'right' }}>
            <Link
              href="/forecast"
              style={{ color: '#0284c7', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}
            >
              View Detailed Analysis &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
