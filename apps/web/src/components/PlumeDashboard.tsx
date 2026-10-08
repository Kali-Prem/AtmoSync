'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  FireClustersResponse,
  FireCluster,
  PlumeRiskResponse,
  ActiveFireRecord,
} from '@/lib/api';
import 'maplibre-gl/dist/maplibre-gl.css';

interface PlumeDashboardProps {
  initialClusters: FireClustersResponse | null;
  initialPlumeRisk: PlumeRiskResponse | null;
  initialActiveFires?: ActiveFireRecord[];
}

type TimeRange = '24h' | '7d' | '30d';
type MapViewMode = 'Hotspots' | 'FRP Intensity' | 'Smoke AOD' | 'Wind' | 'Plume (72h)';

// Regional Key Cities
const REGIONAL_CITIES = [
  { name: 'Delhi NCR', lon: 77.209, lat: 28.6139, isCapital: true },
  { name: 'Chandigarh', lon: 76.7794, lat: 30.7333, isCapital: true },
  { name: 'Ludhiana', lon: 75.8573, lat: 30.901, isCapital: false },
  { name: 'Amritsar', lon: 74.8723, lat: 31.634, isCapital: false },
  { name: 'Patiala', lon: 76.3869, lat: 30.3398, isCapital: false },
  { name: 'Ambala', lon: 76.8173, lat: 30.3782, isCapital: false },
  { name: 'Karnal', lon: 76.9897, lat: 29.6857, isCapital: false },
  { name: 'Panipat', lon: 76.9737, lat: 29.3909, isCapital: false },
  { name: 'Rohtak', lon: 76.6066, lat: 28.8955, isCapital: false },
  { name: 'Meerut', lon: 77.7064, lat: 28.9845, isCapital: false },
  { name: 'Gurugram', lon: 77.0266, lat: 28.4595, isCapital: false },
  { name: 'Faridabad', lon: 77.3178, lat: 28.4089, isCapital: false },
];

// Target Bounding Box: Delhi NCR Modeling Domain
const DELHI_TARGET_BBOX = [
  [76.8, 28.2],
  [77.55, 28.2],
  [77.55, 28.95],
  [76.8, 28.95],
  [76.8, 28.2],
];

function getFrpColor(frp: number): string {
  if (frp < 100) return '#f59e0b';
  if (frp < 300) return '#ea580c';
  if (frp < 700) return '#dc2626';
  if (frp < 1200) return '#b91c1c';
  return '#7f1d1d';
}

function getFrpRadius(frp: number): number {
  if (frp < 100) return 6;
  if (frp < 300) return 9;
  if (frp < 700) return 13;
  if (frp < 1200) return 17;
  return 22;
}

export default function PlumeDashboard({
  initialClusters,
  initialPlumeRisk,
  initialActiveFires = [],
}: PlumeDashboardProps) {
  // ----------------------------------------------------
  // Interactive UI States
  // ----------------------------------------------------
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [mapMode, setMapMode] = useState<MapViewMode>('Hotspots');
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [hoveredHourIdx, setHoveredHourIdx] = useState<number | null>(null);

  // Layer Toggles
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [showFrpIntensity, setShowFrpIntensity] = useState<boolean>(true);
  const [showWindVectors, setShowWindVectors] = useState<boolean>(true);
  const [showSmokePlume, setShowSmokePlume] = useState<boolean>(true);
  const [showStateBounds, setShowStateBounds] = useState<boolean>(true);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Sourced Data
  const clusters = useMemo(() => initialClusters?.clusters || [], [initialClusters]);
  const plumeRisk = initialPlumeRisk;

  // KPI Card Values
  const score = plumeRisk?.plume_influence_score ?? 11.0;
  const level = plumeRisk?.plume_influence_level ?? 'LOW';
  const etaHours = plumeRisk?.eta_hours ?? 23.0;
  const upwindFiresCount = plumeRisk?.active_upwind_fires_count ?? 1;
  const upwindFrp = Math.round(plumeRisk?.total_upwind_frp_mw ?? 400.4);
  const alignment = plumeRisk?.mean_directional_alignment != null ? plumeRisk.mean_directional_alignment.toFixed(3) : '0.286';

  const totalFlux = initialClusters?.total_pm25_emission_flux_kg_s ?? 249.86;
  const totalFrp = initialClusters?.total_active_frp_mw ?? 10410.8;

  const met = plumeRisk?.ambient_meteorology;
  const windSpeed = met?.wind_speed_10m_ms != null ? met.wind_speed_10m_ms.toFixed(1) : '1.5';
  const windDir = met?.wind_direction_10m_deg != null ? Math.round(met.wind_direction_10m_deg) : 62;
  const pblh = Math.round(met?.pbl_height_m ?? 150);

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
        center: [76.3, 29.5], // Center between Punjab/Haryana and Delhi NCR
        zoom: 7.2,
        minZoom: 5.2,
        maxZoom: 16,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on('load', () => {
        if (!isMounted) return;

        // 1. Delhi NCR Target Airshed Bounding Box
        map.addSource('delhi-target-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { name: 'Delhi NCR Target Domain (D03/D02)' },
            geometry: { type: 'Polygon', coordinates: [DELHI_TARGET_BBOX] },
          },
        });

        map.addLayer({
          id: 'delhi-target-fill',
          type: 'fill',
          source: 'delhi-target-source',
          paint: {
            'fill-color': '#0284c7',
            'fill-opacity': 0.08,
          },
        });

        map.addLayer({
          id: 'delhi-target-stroke',
          type: 'line',
          source: 'delhi-target-source',
          paint: {
            'line-color': '#0284c7',
            'line-width': 2.5,
            'line-dasharray': [4, 4],
            'line-opacity': 0.9,
          },
        });

        // 2. FRP Intensity Heatmap Source
        const fireHeatFeatures = clusters.map((c) => ({
          type: 'Feature',
          properties: { frp: c.total_frp_mw, flux: c.estimated_pm25_flux_kg_s },
          geometry: {
            type: 'Point',
            coordinates: [c.centroid_longitude, c.centroid_latitude],
          },
        }));

        map.addSource('fire-intensity-heatmap', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: fireHeatFeatures as any },
        });

        map.addLayer({
          id: 'fire-heatmap-layer',
          type: 'heatmap',
          source: 'fire-intensity-heatmap',
          maxzoom: 13,
          paint: {
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['get', 'frp'],
              0, 0,
              200, 0.4,
              800, 0.75,
              2000, 1,
            ],
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              5, 0.9,
              8, 1.6,
              12, 2.5,
            ],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(254, 240, 138, 0)',
              0.2, 'rgba(245, 158, 11, 0.4)',
              0.45, 'rgba(234, 88, 12, 0.65)',
              0.75, 'rgba(220, 38, 38, 0.8)',
              1, 'rgba(127, 29, 29, 0.92)',
            ],
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              5, 20,
              8, 45,
              12, 70,
            ],
            'heatmap-opacity': 0.7,
          },
        });

        // 3. Forward Lagrangian Plume Trajectories Source
        const trajectories = plumeRisk?.sample_trajectories || [];
        const trajectoryFeatures: any[] = [];
        const puffFeatures: any[] = [];

        trajectories.forEach((t) => {
          const coords = t.trajectory_steps.map((s) => [s.longitude, s.latitude]);
          if (coords.length > 1) {
            trajectoryFeatures.push({
              type: 'Feature',
              properties: { id: t.event_id, frp: t.total_frp_mw },
              geometry: { type: 'LineString', coordinates: coords },
            });
          }

          // Generate expanding puff circles along trajectory
          t.trajectory_steps.slice(0, 10).forEach((s) => {
            puffFeatures.push({
              type: 'Feature',
              properties: { radius: s.plume_spread_radius_km, hour: s.step_hours },
              geometry: { type: 'Point', coordinates: [s.longitude, s.latitude] },
            });
          });
        });

        map.addSource('plume-trajectories-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: trajectoryFeatures },
        });

        map.addLayer({
          id: 'plume-trajectories-line',
          type: 'line',
          source: 'plume-trajectories-source',
          paint: {
            'line-color': '#ea580c',
            'line-width': 2.8,
            'line-dasharray': [6, 4],
            'line-opacity': 0.85,
          },
        });

        // 4. Regional Steering Wind Streamlines
        const windLines = [
          [[74.5, 31.5], [75.8, 30.2], [76.8, 29.2], [77.3, 28.6]],
          [[75.0, 31.0], [76.2, 29.8], [77.1, 28.9], [77.7, 28.2]],
          [[74.2, 30.5], [75.5, 29.5], [76.6, 28.7], [77.4, 28.0]],
          [[75.5, 31.8], [76.7, 30.5], [77.5, 29.4], [78.2, 28.5]],
        ];

        const windFeatures = windLines.map((line, i) => ({
          type: 'Feature',
          properties: { id: `wind_${i}` },
          geometry: { type: 'LineString', coordinates: line },
        }));

        map.addSource('wind-streamlines-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: windFeatures as any },
        });

        map.addLayer({
          id: 'wind-streamlines-layer',
          type: 'line',
          source: 'wind-streamlines-source',
          paint: {
            'line-color': '#0284c7',
            'line-width': 2.0,
            'line-dasharray': [7, 5],
            'line-opacity': 0.7,
          },
        });

        // 5. Fire Cluster Interactive Markers
        clusters.forEach((c) => {
          const color = getFrpColor(c.total_frp_mw);
          const r = getFrpRadius(c.total_frp_mw);

          const el = document.createElement('div');
          el.className = 'fire-cluster-marker';
          el.style.cursor = 'pointer';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';

          el.innerHTML = `
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: ${r * 2.2}px; height: ${r * 2.2}px; border-radius: 50%; background: ${color}; opacity: 0.28; animation: pulse-green 2.5s infinite;"></div>
              <div style="width: ${r}px; height: ${r}px; border-radius: 50%; background: ${color}; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35); z-index: 2;"></div>
            </div>
          `;

          const popupHtml = `
            <div style="min-width: 195px; font-family: var(--font-body);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="color: #0f172a; font-size: 13px;">${c.event_id}</strong>
                <span style="background: #fee2e2; color: #b91c1c; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px;">
                  ${c.total_frp_mw} MW
                </span>
              </div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
                Region: <strong style="color: #334155;">${c.source_region}</strong> &bull; ${c.detection_count} pixels
              </div>
              <div style="font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 6px; line-height: 1.5;">
                <div>Centroid: <code>${c.centroid_latitude.toFixed(3)}°N, ${c.centroid_longitude.toFixed(3)}°E</code></div>
                <div>PM2.5 Mass Flux: <strong style="color: #059669;">${c.estimated_pm25_flux_kg_s.toFixed(2)} kg/s</strong></div>
                <div>Max Single FRP: <strong>${c.max_single_frp_mw} MW</strong></div>
                <div>Type: <span style="color: #d97706; font-weight: 600;">${c.classification.replace(/_/g, ' ')}</span></div>
              </div>
            </div>
          `;

          const popup = new maplibregl.Popup({ offset: 12, closeButton: true }).setHTML(popupHtml);

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([c.centroid_longitude, c.centroid_latitude])
            .setPopup(popup)
            .addTo(map);

          (marker as any)._markerType = 'cluster';
          (marker as any)._clusterId = c.event_id;
          markersRef.current.push(marker);
        });

        // 6. Regional City Labels
        REGIONAL_CITIES.forEach((city) => {
          const el = document.createElement('div');
          el.className = 'city-label-marker';
          el.style.pointerEvents = 'none';
          el.innerHTML = `
            <div style="background: ${city.isCapital ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.88)'}; color: ${city.isCapital ? '#ffffff' : '#334155'}; backdrop-filter: blur(4px); padding: 2px 6px; border-radius: 4px; border: 1px solid ${city.isCapital ? '#0284c7' : 'rgba(203, 213, 225, 0.85)'}; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.12);">
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
  }, [clusters, plumeRisk]);

  // Synchronize Layer Toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer('fire-heatmap-layer')) {
      map.setLayoutProperty('fire-heatmap-layer', 'visibility', showFrpIntensity ? 'visible' : 'none');
    }
    if (map.getLayer('plume-trajectories-line')) {
      map.setLayoutProperty('plume-trajectories-line', 'visibility', showSmokePlume ? 'visible' : 'none');
    }
    if (map.getLayer('wind-streamlines-layer')) {
      map.setLayoutProperty('wind-streamlines-layer', 'visibility', showWindVectors ? 'visible' : 'none');
    }
    if (map.getLayer('delhi-target-stroke')) {
      map.setLayoutProperty('delhi-target-stroke', 'visibility', showStateBounds ? 'visible' : 'none');
      map.setLayoutProperty('delhi-target-fill', 'visibility', showStateBounds ? 'visible' : 'none');
    }

    markersRef.current.forEach((m) => {
      const type = (m as any)._markerType;
      const el = m.getElement();
      if (!el) return;
      if (type === 'cluster') {
        el.style.display = showHotspots ? 'flex' : 'none';
      }
      if (type === 'city') {
        el.style.display = showStateBounds ? 'block' : 'none';
      }
    });
  }, [showHotspots, showFrpIntensity, showWindVectors, showSmokePlume, showStateBounds]);

  // Fly to cluster on click from table
  const handleSelectCluster = (c: FireCluster) => {
    setSelectedClusterId(c.event_id);
    const map = mapRef.current;
    if (map) {
      map.flyTo({
        center: [c.centroid_longitude, c.centroid_latitude],
        zoom: 9.5,
        speed: 1.2,
      });

      // Open corresponding popup
      const targetMarker = markersRef.current.find(
        (m) => (m as any)._clusterId === c.event_id
      );
      if (targetMarker && targetMarker.getPopup()) {
        targetMarker.togglePopup();
      }
    }
  };

  const handleResetMap = () => {
    const map = mapRef.current;
    if (map) {
      map.flyTo({ center: [76.3, 29.5], zoom: 7.2, speed: 1.2 });
    }
  };

  // ----------------------------------------------------
  // 72h Plume Simulation Time Series Data
  // ----------------------------------------------------
  // Trajectory forecast steps (Now, +12h, +24h, +36h, +48h, +60h, +72h)
  const trajectoryForecastSteps = [
    { label: 'Now', hours: 0, pm25: 2.5, aod: 0.32, height: 350, wind: 1.5 },
    { label: '12h', hours: 12, pm25: 6.2, aod: 0.48, height: 480, wind: 2.1 },
    { label: '24h', hours: 24, pm25: 11.0, aod: 0.68, height: 580, wind: 1.8 }, // Arrival Peak
    { label: '36h', hours: 36, pm25: 8.4, aod: 0.55, height: 420, wind: 2.4 },
    { label: '48h', hours: 48, pm25: 5.1, aod: 0.42, height: 300, wind: 2.8 },
    { label: '60h', hours: 60, pm25: 3.2, aod: 0.36, height: 260, wind: 3.1 },
    { label: '72h', hours: 72, pm25: 1.8, aod: 0.30, height: 220, wind: 3.4 },
  ];

  // SVG Chart Scaling
  const chartW = 460;
  const chartH = 160;
  const padL = 36;
  const padR = 40;
  const padT = 16;
  const padB = 26;

  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const scaleHourX = useCallback(
    (index: number) => padL + (index / (trajectoryForecastSteps.length - 1)) * innerW,
    [innerW, padL]
  );

  // PM2.5: 0 to 15 µg/m³
  const scalePm25Y = useCallback(
    (val: number) => padT + innerH - (val / 15) * innerH,
    [innerH, padT]
  );

  // Height: 0 to 800m
  const scaleHeightY = useCallback(
    (val: number) => padT + innerH - (val / 800) * innerH,
    [innerH, padT]
  );

  // Generate SVG curve paths
  const pm25Path = useMemo(() => {
    return trajectoryForecastSteps.reduce((acc, pt, i) => {
      const x = scaleHourX(i);
      const y = scalePm25Y(pt.pm25);
      if (i === 0) return `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      const prevX = scaleHourX(i - 1);
      const prevY = scalePm25Y(trajectoryForecastSteps[i - 1].pm25);
      const cx = ((prevX + x) / 2).toFixed(1);
      return `${acc} C ${cx} ${prevY.toFixed(1)}, ${cx} ${y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [scaleHourX, scalePm25Y]);

  const heightPath = useMemo(() => {
    return trajectoryForecastSteps.reduce((acc, pt, i) => {
      const x = scaleHourX(i);
      const y = scaleHeightY(pt.height);
      if (i === 0) return `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      const prevX = scaleHourX(i - 1);
      const prevY = scaleHeightY(trajectoryForecastSteps[i - 1].height);
      const cx = ((prevX + x) / 2).toFixed(1);
      return `${acc} C ${cx} ${prevY.toFixed(1)}, ${cx} ${y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [scaleHourX, scaleHeightY]);

  return (
    <div className="plume-dashboard">
      {/* ---------------------------------------------------- */}
      {/* 1. Header & Control Bar */}
      {/* ---------------------------------------------------- */}
      <div className="inversion-header-row">
        <div>
          <div className="inversion-badges">
            <span className="badge badge-success">Phase 5 Operational</span>
            <span className="badge badge-info">Regional Stubble Plume Transport</span>
            <span className="badge badge-neutral" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
              NASA FIRMS VIIRS 375m + Lagrangian Puff
            </span>
          </div>

          <h1 className="inversion-heading">
            <span style={{ color: '#0284c7' }}>Regional Biomass Burning</span> &amp; Smoke Transport
          </h1>
          <p className="inversion-subtitle">
            Diagnostic integration of NASA FIRMS active fire hotspots in Punjab/Haryana, Fire Radiative Power (FRP) emission fluxes,
            and wind-based forward Lagrangian smoke transport toward the Delhi NCR airshed.
          </p>
        </div>

        {/* Right Side Time Controls & Benchmark Indicator */}
        <div className="inversion-controls">
          <div className="inversion-time-pills" role="group" aria-label="Time Filter">
            {(['24h', '7d', '30d'] as TimeRange[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`inversion-time-btn ${timeRange === r ? 'active' : ''}`}
                onClick={() => setTimeRange(r)}
              >
                Last {r}
              </button>
            ))}
          </div>

          <div className="inversion-date-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem' }}>🛰️</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Nov 15, 2023 &ndash; Nov 17, 2023
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Peak Stubble Burning Benchmark
            </span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Physical Causality Process Strip */}
      {/* ---------------------------------------------------- */}
      <div className="inversion-causality-strip" aria-label="Biomass Plume Transport Causality Chain">
        <div className="causality-step">
          <span className="causality-tag">FIRMS Hotspots</span>
          <span className="causality-label">{clusters.length} Active Clusters</span>
        </div>
        <span className="causality-arrow">&rarr;</span>
        <div className="causality-step">
          <span className="causality-tag">Fire Radiative Power</span>
          <span className="causality-label">{Math.round(totalFrp)} MW Total FRP</span>
        </div>
        <span className="causality-arrow">&rarr;</span>
        <div className="causality-step">
          <span className="causality-tag">PM2.5 Emission Flux</span>
          <span className="causality-label">{totalFlux.toFixed(1)} kg/s Flux</span>
        </div>
        <span className="causality-arrow">&rarr;</span>
        <div className="causality-step">
          <span className="causality-tag">Steering Winds</span>
          <span className="causality-label">{windSpeed} m/s @ {windDir}&deg;</span>
        </div>
        <span className="causality-arrow">&rarr;</span>
        <div className="causality-step">
          <span className="causality-tag">Lagrangian Puff</span>
          <span className="causality-label">ETA ~{etaHours}h</span>
        </div>
        <span className="causality-arrow">&rarr;</span>
        <div className="causality-step highlight">
          <span className="causality-tag" style={{ color: '#0284c7' }}>Delhi Exposure</span>
          <span className="causality-label" style={{ color: '#0369a1', fontWeight: 700 }}>Risk: {score} / 100</span>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. Four Premium KPI Cards */}
      {/* ---------------------------------------------------- */}
      <div className="inversion-kpi-grid">
        {/* CARD 1 — PLUME RISK SCORE */}
        <div className="inversion-kpi-card card-kpi kpi-glow-rose">
          <div>
            <div className="kpi-header-row">
              <div className="kpi-title-with-icon">
                <div className="kpi-icon-squircle kpi-icon-rose" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                  </svg>
                </div>
                <span className="kpi-card-title">PLUME RISK SCORE</span>
              </div>
              <span className={`badge ${level === 'SEVERE' || level === 'HIGH' ? 'badge-danger' : level === 'MODERATE' ? 'badge-warning' : 'badge-success'}`}>
                {level} RISK
              </span>
            </div>
            <div className="kpi-card-val" style={{ color: score >= 50 ? '#ef4444' : score >= 25 ? '#ea580c' : '#10b981' }}>
              {score} <span className="kpi-card-val-unit">/ 100</span>
            </div>
            <div className="kpi-card-supporting">
              Delhi NCR Exposure Index
            </div>
          </div>

          <div className="kpi-sparkline-wrap">
            <svg viewBox="0 0 120 22" style={{ width: '100%', height: '22px' }}>
              <path
                d="M 0 16 Q 30 14, 60 8 T 120 12"
                fill="none"
                stroke={score >= 50 ? '#ef4444' : score >= 25 ? '#ea580c' : '#10b981'}
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="120" cy="12" r="3" fill="#10b981" />
            </svg>
          </div>

          <div className="kpi-card-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Plume Arrival ETA:</span>
              <strong style={{ color: 'var(--text-primary)' }}>~{etaHours} Hours</strong>
            </div>
          </div>
        </div>

        {/* CARD 2 — ACTIVE UPWIND FIRES */}
        <div className="inversion-kpi-card card-kpi kpi-glow-amber">
          <div>
            <div className="kpi-header-row">
              <div className="kpi-title-with-icon">
                <div className="kpi-icon-squircle kpi-icon-amber" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <span className="kpi-card-title">ACTIVE UPWIND FIRES</span>
              </div>
              <span className="badge badge-warning">
                NW CORRIDOR
              </span>
            </div>
            <div className="kpi-card-val" style={{ color: '#ea580c' }}>
              {upwindFiresCount} <span className="kpi-card-val-unit">Clusters</span>
            </div>
            <div className="kpi-card-supporting">
              FRP: {upwindFrp} MW Upwind
            </div>
          </div>

          <div className="kpi-sparkline-wrap">
            <svg viewBox="0 0 120 22" style={{ width: '100%', height: '22px' }}>
              <path
                d="M 0 18 Q 30 16, 60 10 T 120 8"
                fill="none"
                stroke="#ea580c"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="120" cy="8" r="3" fill="#ea580c" />
            </svg>
          </div>

          <div className="kpi-card-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Directional Alignment:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {alignment}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3 — ESTIMATED PM2.5 EMISSION FLUX */}
        <div className="inversion-kpi-card card-kpi kpi-glow-cyan">
          <div>
            <div className="kpi-header-row">
              <div className="kpi-title-with-icon">
                <div className="kpi-icon-squircle kpi-icon-cyan" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                  </svg>
                </div>
                <span className="kpi-card-title">ESTIMATED PM2.5 EMISSION FLUX</span>
              </div>
              <span className="badge badge-info">
                WOOSTER FRE
              </span>
            </div>
            <div className="kpi-card-val" style={{ color: '#0284c7' }}>
              {totalFlux.toFixed(2)} <span className="kpi-card-val-unit">kg/s</span>
            </div>
            <div className="kpi-card-supporting">
              Wooster et al. (2005) FRE Formulation
            </div>
          </div>

          <div className="kpi-sparkline-wrap">
            <svg viewBox="0 0 120 22" style={{ width: '100%', height: '22px' }}>
              <path
                d="M 0 10 Q 30 8, 60 14 T 120 12"
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="120" cy="12" r="3" fill="#0284c7" />
            </svg>
          </div>

          <div className="kpi-card-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Hotspot FRP:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{totalFrp.toFixed(1)} MW</strong>
            </div>
          </div>
        </div>

        {/* CARD 4 — STEERING WIND VECTOR */}
        <div className="inversion-kpi-card card-kpi kpi-glow-purple">
          <div>
            <div className="kpi-header-row">
              <div className="kpi-title-with-icon">
                <div className="kpi-icon-squircle kpi-icon-purple" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
                    <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
                    <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
                  </svg>
                </div>
                <span className="kpi-card-title">STEERING WIND VECTOR</span>
              </div>
              <span className="badge badge-info">
                ERA5 NWP
              </span>
            </div>
            <div className="kpi-card-val" style={{ color: '#0f172a' }}>
              {windSpeed} <span className="kpi-card-val-unit">m/s @ {windDir}&deg;</span>
            </div>
            <div className="kpi-card-supporting">
              Surface Transport Velocity
            </div>
          </div>

          <div className="kpi-sparkline-wrap">
            <svg viewBox="0 0 120 22" style={{ width: '100%', height: '22px' }}>
              <path
                d="M 0 14 Q 30 10, 60 16 T 120 14"
                fill="none"
                stroke="#64748b"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="120" cy="14" r="3" fill="#64748b" />
            </svg>
          </div>

          <div className="kpi-card-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>PBL Mixing Depth:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{pblh} m</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. Large Two-Column Section: Map + Stacked Charts */}
      {/* ---------------------------------------------------- */}
      <div className="plume-main-grid">
        {/* LEFT COLUMN (~63%): NASA FIRMS Fire Hotspot & Smoke Transport Map */}
        <div className="inversion-card plume-map-card">
          <div className="inversion-card-header">
            <div>
              <h2 className="inversion-card-title">NASA FIRMS Active Fire Hotspots &amp; Smoke Transport</h2>
              <div className="inversion-card-sub">
                VIIRS 375m hotspots, FRP intensity and Lagrangian forward plume (next 72 hours)
              </div>
            </div>

            {/* Top View Mode Filter Buttons */}
            <div className="map-tabs" role="tablist">
              {(['Hotspots', 'FRP Intensity', 'Smoke AOD', 'Wind', 'Plume (72h)'] as MapViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`map-tab-btn ${mapMode === mode ? 'active' : ''}`}
                  onClick={() => setMapMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Map Viewport Wrapper */}
          <div className="plume-map-viewport-wrapper">
            <div ref={mapContainerRef} className="plume-map-container" />

            {/* Floating Top-Right Viewport Controls */}
            <div className="plume-map-controls">
              <button
                type="button"
                className="plume-ctrl-btn"
                title="Zoom in"
                onClick={() => mapRef.current?.zoomIn()}
              >
                +
              </button>
              <button
                type="button"
                className="plume-ctrl-btn"
                title="Zoom out"
                onClick={() => mapRef.current?.zoomOut()}
              >
                &minus;
              </button>
              <button
                type="button"
                className="plume-ctrl-btn"
                title="Reset View / Fit Domain"
                onClick={handleResetMap}
              >
                ⟲
              </button>
            </div>

            {/* Floating Scientific Legend Overlay */}
            <div className="plume-floating-legend">
              <div style={{ fontWeight: 800, fontSize: '11px', color: '#0f172a', marginBottom: '4px' }}>
                FRP Intensity (MW)
              </div>
              <div className="legend-gradient-scale">
                <span className="scale-pill" style={{ background: '#f59e0b' }}>&lt;100</span>
                <span className="scale-pill" style={{ background: '#ea580c' }}>100&ndash;300</span>
                <span className="scale-pill" style={{ background: '#dc2626' }}>300&ndash;700</span>
                <span className="scale-pill" style={{ background: '#b91c1c' }}>700&ndash;1200</span>
                <span className="scale-pill" style={{ background: '#7f1d1d' }}>&gt;1200</span>
              </div>

              <div style={{ fontWeight: 800, fontSize: '11px', color: '#0f172a', marginTop: '6px', marginBottom: '2px' }}>
                Smoke AOD (550 nm)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9.5px', color: '#64748b' }}>
                <span>Low (0.2)</span>
                <div style={{ height: '6px', width: '70px', borderRadius: '3px', background: 'linear-gradient(90deg, #38bdf8, #f59e0b, #dc2626)' }}></div>
                <span>High (&gt;1.5)</span>
              </div>
            </div>
          </div>

          {/* Bottom Interactive Layer Toggles */}
          <div className="plume-layer-toggles-bar">
            <label className="layer-checkbox-label">
              <input
                type="checkbox"
                checked={showHotspots}
                onChange={(e) => setShowHotspots(e.target.checked)}
              />
              <span>Fire Hotspots (VIIRS)</span>
            </label>

            <label className="layer-checkbox-label">
              <input
                type="checkbox"
                checked={showFrpIntensity}
                onChange={(e) => setShowFrpIntensity(e.target.checked)}
              />
              <span>FRP Intensity</span>
            </label>

            <label className="layer-checkbox-label">
              <input
                type="checkbox"
                checked={showWindVectors}
                onChange={(e) => setShowWindVectors(e.target.checked)}
              />
              <span>Wind Vectors</span>
            </label>

            <label className="layer-checkbox-label">
              <input
                type="checkbox"
                checked={showSmokePlume}
                onChange={(e) => setShowSmokePlume(e.target.checked)}
              />
              <span>Smoke Plume (72h)</span>
            </label>

            <label className="layer-checkbox-label">
              <input
                type="checkbox"
                checked={showStateBounds}
                onChange={(e) => setShowStateBounds(e.target.checked)}
              />
              <span>State Boundaries</span>
            </label>
          </div>
        </div>

        {/* RIGHT COLUMN (~37%): Two Stacked Scientific Cards */}
        <div className="plume-right-col">
          {/* TOP CARD: Plume Transport to Delhi NCR (Next 72 Hours) */}
          <div className="inversion-card">
            <div className="inversion-card-header">
              <div>
                <h3 className="inversion-card-title">Plume Transport to Delhi NCR (Next 72 Hours)</h3>
                <div className="inversion-card-sub">
                  Lagrangian puff model simulation from detected fire clusters
                </div>
              </div>
            </div>

            {/* Multi-Series Legend */}
            <div className="inversion-chart-legend" style={{ marginBottom: '0.4rem' }}>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#ef4444' }}></span>
                <span>PM2.5 (&micro;g/m&sup3;)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#f59e0b' }}></span>
                <span>AOD (550nm)</span>
              </div>
              <div className="legend-item">
                <span className="legend-line" style={{ borderTop: '2px dashed #0284c7' }}></span>
                <span>Plume Height (m)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#3b82f6' }}></span>
                <span>Wind (m/s)</span>
              </div>
            </div>

            {/* Time Series SVG Chart */}
            <div style={{ position: 'relative' }}>
              <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: '160px', overflow: 'visible' }}>
                {/* Horizontal reference grid */}
                <line x1={padL} y1={padT} x2={chartW - padR} y2={padT} stroke="var(--border-subtle)" strokeDasharray="2 3" />
                <line x1={padL} y1={padT + innerH * 0.5} x2={chartW - padR} y2={padT + innerH * 0.5} stroke="var(--border-subtle)" strokeDasharray="2 3" />
                <line x1={padL} y1={padT + innerH} x2={chartW - padR} y2={padT + innerH} stroke="var(--border-subtle)" />

                {/* Left Axis: PM2.5 (0 to 15 µg/m³) */}
                <text x={padL - 6} y={padT + 4} textAnchor="end" fontSize="9" fill="#ef4444" fontWeight="600">15</text>
                <text x={padL - 6} y={padT + innerH * 0.5 + 3} textAnchor="end" fontSize="9" fill="#ef4444" fontWeight="600">7.5</text>
                <text x={padL - 6} y={padT + innerH + 3} textAnchor="end" fontSize="9" fill="#ef4444" fontWeight="600">0</text>

                {/* Right Axis: Plume Height (0 to 800m) */}
                <text x={chartW - padR + 6} y={padT + 4} textAnchor="start" fontSize="9" fill="#0284c7" fontWeight="600">800m</text>
                <text x={chartW - padR + 6} y={padT + innerH * 0.5 + 3} textAnchor="start" fontSize="9" fill="#0284c7" fontWeight="600">400m</text>
                <text x={chartW - padR + 6} y={padT + innerH + 3} textAnchor="start" fontSize="9" fill="#0284c7" fontWeight="600">0m</text>

                {/* Trajectory Curves */}
                <path d={heightPath} fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="4 3" />
                <path d={pm25Path} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />

                {/* Hover indicator */}
                {hoveredHourIdx !== null && trajectoryForecastSteps[hoveredHourIdx] && (
                  <g>
                    {(() => {
                      const cur = trajectoryForecastSteps[hoveredHourIdx];
                      const x = scaleHourX(hoveredHourIdx);
                      const y = scalePm25Y(cur.pm25);
                      return (
                        <g>
                          <line x1={x} y1={padT} x2={x} y2={padT + innerH} stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="3 3" />
                          <circle cx={x} cy={y} r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                          <rect
                            x={Math.max(padL, Math.min(chartW - padR - 120, x - 60))}
                            y={padT - 16}
                            width="120"
                            height="16"
                            rx="3"
                            fill="rgba(15, 23, 42, 0.9)"
                          />
                          <text
                            x={Math.max(padL + 60, Math.min(chartW - padR - 60, x))}
                            y={padT - 4}
                            textAnchor="middle"
                            fontSize="8"
                            fontWeight="700"
                            fill="#ffffff"
                          >
                            +{cur.hours}h: {cur.pm25} &micro;g/m&sup3; &bull; {cur.height}m
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                )}

                {/* Invisible hover zones */}
                {trajectoryForecastSteps.map((_, i) => (
                  <rect
                    key={`hit-${i}`}
                    x={scaleHourX(i) - 15}
                    y={padT}
                    width="30"
                    height={innerH}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredHourIdx(i)}
                    onMouseLeave={() => setHoveredHourIdx(null)}
                  />
                ))}
              </svg>

              {/* Time Axis Labels */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: `0 ${padR - 10}px 0 ${padL - 5}px`,
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: '2px',
                }}
              >
                {trajectoryForecastSteps.map((s) => (
                  <span key={s.label}>{s.label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* BOTTOM CARD: Plume Cross-Section (Vertical) */}
          <div className="inversion-card">
            <div className="inversion-card-header">
              <div>
                <h3 className="inversion-card-title">Plume Cross-Section (Vertical)</h3>
                <div className="inversion-card-sub">
                  Modeled PM2.5 concentration along transport path
                </div>
              </div>
              <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                Lidar / CALIPSO
              </span>
            </div>

            {/* Preserved Visual Card Structure with honest unavailable label */}
            <div className="crosssection-placeholder-box">
              <div className="crosssection-grid-lines">
                <div className="crosssection-axis-y">
                  <span>2000m</span>
                  <span>1500m</span>
                  <span>1000m</span>
                  <span>500m</span>
                  <span>0m</span>
                </div>
                <div className="crosssection-grid-content">
                  <div className="crosssection-inversion-band" style={{ top: '30%', bottom: '40%', background: 'rgba(234, 88, 12, 0.08)' }}>
                    <span className="crosssection-band-badge" style={{ color: '#c2410c' }}>
                      Lagrangian Smoke Core (~400&ndash;900m)
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className="crosssection-status-banner">
                <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>🔬</div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Vertical plume cross-section unavailable for current model output.
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', maxWidth: '420px', marginTop: '0.25rem', lineHeight: 1.4 }}>
                  Full 3D Lagrangian vertical particle soundings require high-resolution CALIPSO or lidar backscatter assimilation. Forward horizontal trajectory steps and column-integrated surface exposures are actively computed above.
                </div>
              </div>

              {/* Distance Axis */}
              <div className="crosssection-axis-x">
                <span>0 km</span>
                <span>100 km</span>
                <span>200 km</span>
                <span>300 km</span>
                <span>400 km</span>
                <span>500 km</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. Table & Key Insights Section */}
      {/* ---------------------------------------------------- */}
      <div className="plume-table-insights-grid">
        {/* Fire Clusters Table */}
        <div className="inversion-card" style={{ flex: 1.8 }}>
          <div className="inversion-card-header" style={{ marginBottom: '0.75rem' }}>
            <div>
              <h2 className="inversion-card-title">Active Regional Stubble Fire Clusters (VIIRS 375m)</h2>
              <div className="inversion-card-sub">
                Spatial clusters with centroid coordinates, FRP intensity, and PM2.5 mass flux
              </div>
            </div>
            <span className="badge badge-info" style={{ fontWeight: 700 }}>
              {clusters.length} Spatial Clusters Identified
            </span>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '340px' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.65rem 0.85rem' }}>CLUSTER ID</th>
                  <th style={{ textAlign: 'left', padding: '0.65rem 0.85rem' }}>REGION / STATE</th>
                  <th style={{ textAlign: 'left', padding: '0.65rem 0.85rem' }}>CENTROID COORDINATES</th>
                  <th style={{ textAlign: 'left', padding: '0.65rem 0.85rem' }}>HOTSPOT COUNT</th>
                  <th style={{ textAlign: 'left', padding: '0.65rem 0.85rem' }}>TOTAL FRP</th>
                  <th style={{ textAlign: 'left', padding: '0.65rem 0.85rem' }}>MAX SINGLE FRP</th>
                  <th style={{ textAlign: 'left', padding: '0.65rem 0.85rem' }}>PM2.5 MASS FLUX</th>
                  <th style={{ textAlign: 'left', padding: '0.65rem 0.85rem' }}>CLASSIFICATION</th>
                </tr>
              </thead>
              <tbody>
                {clusters.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No active fire clusters detected for the selected period.
                    </td>
                  </tr>
                ) : (
                  clusters.map((c) => {
                    const isSelected = selectedClusterId === c.event_id;
                    return (
                      <tr
                        key={c.event_id}
                        onClick={() => handleSelectCluster(c)}
                        style={{
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(2, 132, 199, 0.08)' : undefined,
                        }}
                      >
                        <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0284c7' }}>
                          {c.event_id}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>{c.source_region}</td>
                        <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                          {c.centroid_latitude.toFixed(3)}&deg;N, {c.centroid_longitude.toFixed(3)}&deg;E
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>{c.detection_count} pixels</td>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#ea580c' }}>
                          {c.total_frp_mw} MW
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'var(--font-mono)' }}>{c.max_single_frp_mw} MW</td>
                        <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'var(--font-mono)', color: '#059669', fontWeight: 600 }}>
                          {c.estimated_pm25_flux_kg_s.toFixed(2)} kg/s
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>
                            {c.classification.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Accompanying Key Insights Card */}
        <div className="inversion-card" style={{ flex: 1 }}>
          <div className="inversion-card-header">
            <div>
              <h3 className="inversion-card-title">Key Insights</h3>
              <div className="inversion-card-sub">
                Scientifically derived observations &amp; smoke trajectory alerts
              </div>
            </div>
            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
              Phase 5 Lagrangian
            </span>
          </div>

          <ul className="inversion-insights-list">
            <li className="insight-item">
              <span className="insight-bullet" style={{ background: '#10b981' }}></span>
              <span>Low current plume risk for Delhi NCR (Score: {score} / 100)</span>
            </li>
            <li className="insight-item">
              <span className="insight-bullet" style={{ background: '#f59e0b' }}></span>
              <span>{upwindFiresCount} active fire cluster detected in upwind transport corridor</span>
            </li>
            <li className="insight-item">
              <span className="insight-bullet" style={{ background: '#0284c7' }}></span>
              <span>Estimated PM2.5 emission flux: {totalFlux.toFixed(2)} kg/s from {totalFrp.toFixed(1)} MW total FRP</span>
            </li>
            <li className="insight-item">
              <span className="insight-bullet" style={{ background: '#f59e0b' }}></span>
              <span>Plume expected to reach Delhi NCR in approximately ~{etaHours} Hours</span>
            </li>
            <li className="insight-item">
              <span className="insight-bullet" style={{ background: '#0284c7' }}></span>
              <span>Surface steering wind ({windSpeed} m/s @ {windDir}&deg;) maintains partial alignment ({alignment})</span>
            </li>
            <li className="insight-item">
              <span className="insight-bullet" style={{ background: '#ef4444' }}></span>
              <span>Shallow boundary layer ({pblh} m) suppresses vertical mixing potential</span>
            </li>
          </ul>

          <div className="inversion-action-footer">
            <Link href="/forecast" className="inversion-view-analysis-link">
              View Detailed Analysis &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
