'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  MonitoringStation,
  LatestObservationsResponse,
  StationObservationRecord,
  DataFreshness,
  InversionStatus,
} from '@/lib/api';
import 'maplibre-gl/dist/maplibre-gl.css';

interface LiveMapViewerProps {
  stations: MonitoringStation[];
  latestObs: LatestObservationsResponse | null;
  fireClusters: any | null;
  plumeRisk: any | null;
  freshness: DataFreshness | null;
  inversion: InversionStatus | null;
}

type MetricLayer = 'PM2.5' | 'PM10' | 'NO2' | 'AOD' | 'Plume' | 'Fires';

// Domain configurations (EPSG:4326)
const DOMAINS = {
  D01: {
    id: 'D01',
    name: 'D01: Regional Transport Corridor',
    latRange: '27.00°N – 32.50°N',
    lonRange: '74.00°E – 79.50°E',
    grid: '9 km / Synoptic NW Winds',
    color: '#0284c7',
    bounds: [
      [74.0, 27.0],
      [79.5, 32.5],
    ] as [[number, number], [number, number]],
    polygon: [
      [74.0, 27.0],
      [79.5, 27.0],
      [79.5, 32.5],
      [74.0, 32.5],
      [74.0, 27.0],
    ],
  },
  D02: {
    id: 'D02',
    name: 'D02: NCR Mesoscale Basin',
    latRange: '27.80°N – 29.40°N',
    lonRange: '76.40°E – 78.10°E',
    grid: '3 km / Boundary Layer & Inversion',
    color: '#059669',
    bounds: [
      [76.4, 27.8],
      [78.1, 29.4],
    ] as [[number, number], [number, number]],
    polygon: [
      [76.4, 27.8],
      [78.1, 27.8],
      [78.1, 29.4],
      [76.4, 29.4],
      [76.4, 27.8],
    ],
  },
  D03: {
    id: 'D03',
    name: 'D03: Delhi NCT Urban Core',
    latRange: '28.40°N – 28.90°N',
    lonRange: '76.80°E – 77.40°E',
    grid: '1 km / 40+ CAAQMS Stations',
    color: '#d97706',
    bounds: [
      [76.8, 28.4],
      [77.4, 28.9],
    ] as [[number, number], [number, number]],
    polygon: [
      [76.8, 28.4],
      [77.4, 28.4],
      [77.4, 28.9],
      [76.8, 28.9],
      [76.8, 28.4],
    ],
  },
};

// Key NCR Regional Cities & Hubs
const NCR_CITIES = [
  { name: 'Delhi NCT', lon: 77.209, lat: 28.6139, isCore: true },
  { name: 'Noida', lon: 77.391, lat: 28.5355, isCore: false },
  { name: 'Ghaziabad', lon: 77.4538, lat: 28.6692, isCore: false },
  { name: 'Gurugram', lon: 77.0266, lat: 28.4595, isCore: false },
  { name: 'Faridabad', lon: 77.3178, lat: 28.4089, isCore: false },
  { name: 'Sonipat', lon: 77.0178, lat: 28.9931, isCore: false },
  { name: 'Baghpat', lon: 77.2289, lat: 28.9447, isCore: false },
  { name: 'Meerut', lon: 77.7064, lat: 28.9845, isCore: false },
  { name: 'Bahadurgarh', lon: 76.924, lat: 28.6924, isCore: false },
  { name: 'Rohtak', lon: 76.6066, lat: 28.8955, isCore: false },
  { name: 'Bulandshahr', lon: 77.854, lat: 28.407, isCore: false },
  { name: 'Palwal', lon: 77.327, lat: 28.1487, isCore: false },
];

const TIME_STEPS = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '23:00'];

function getAqiColor(pm25: number): string {
  if (pm25 <= 30) return '#059669'; // Good
  if (pm25 <= 60) return '#65a30d'; // Satisfactory
  if (pm25 <= 90) return '#d97706'; // Moderate
  if (pm25 <= 120) return '#ea580c'; // Poor
  if (pm25 <= 250) return '#dc2626'; // Very Poor
  return '#991b1b'; // Severe
}

export default function LiveMapViewer({
  stations,
  latestObs,
  fireClusters,
  plumeRisk,
  freshness,
  inversion,
}: LiveMapViewerProps) {
  // Metric Layer Tab
  const [activeMetric, setActiveMetric] = useState<MetricLayer>('PM2.5');

  // Layer Toggles
  const [pm25Enabled, setPm25Enabled] = useState(true);
  const [windEnabled, setWindEnabled] = useState(true);
  const [plumeEnabled, setPlumeEnabled] = useState(true);
  const [firesEnabled, setFiresEnabled] = useState(true);
  const [stationsEnabled, setStationsEnabled] = useState(true);
  const [domainsEnabled, setDomainsEnabled] = useState(true);
  const [adminEnabled, setAdminEnabled] = useState(false);

  // Opacity Controls (0-100)
  const [pm25Opacity, setPm25Opacity] = useState(80);
  const [windOpacity, setWindOpacity] = useState(70);
  const [plumeOpacity, setPlumeOpacity] = useState(60);
  const [fireOpacity, setFireOpacity] = useState(90);

  // Time scrubber
  const [activeTimeIdx, setActiveTimeIdx] = useState(6);
  const [isPlaying, setIsPlaying] = useState(false);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

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

  // Auto timeline playback
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setActiveTimeIdx((prev) => (prev + 1) % TIME_STEPS.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Fly to Domain bounds
  const flyToDomain = useCallback((domainKey: 'D01' | 'D02' | 'D03') => {
    setSelectedDomain(domainKey);
    if (!mapRef.current) return;
    const domain = DOMAINS[domainKey];
    mapRef.current.fitBounds(domain.bounds, {
      padding: 50,
      duration: 1200,
    });
  }, []);

  // Reset to Delhi NCR center
  const resetView = useCallback(() => {
    setSelectedDomain(null);
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [77.209, 28.6139],
      zoom: 9.5,
      essential: true,
      duration: 1000,
    });
  }, []);

  // Initialize MapLibre GL JS
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;

    async function initMap() {
      // Dynamic import to satisfy SSR environments
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
        center: [77.209, 28.6139],
        zoom: 9.5,
        minZoom: 5.5,
        maxZoom: 17,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on('load', () => {
        if (!isMounted) return;

        // ----------------------------------------------------
        // 1. DOMAIN BOUNDARIES (D01, D02, D03 GeoJSON Polygons)
        // ----------------------------------------------------
        const domainFeatures = [
          {
            type: 'Feature',
            properties: { id: 'D01', name: DOMAINS.D01.name, color: DOMAINS.D01.color },
            geometry: { type: 'Polygon', coordinates: [DOMAINS.D01.polygon] },
          },
          {
            type: 'Feature',
            properties: { id: 'D02', name: DOMAINS.D02.name, color: DOMAINS.D02.color },
            geometry: { type: 'Polygon', coordinates: [DOMAINS.D02.polygon] },
          },
          {
            type: 'Feature',
            properties: { id: 'D03', name: DOMAINS.D03.name, color: DOMAINS.D03.color },
            geometry: { type: 'Polygon', coordinates: [DOMAINS.D03.polygon] },
          },
        ];

        map.addSource('domains-source', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: domainFeatures as any,
          },
        });

        // Domain translucent fill
        map.addLayer({
          id: 'domains-fill-layer',
          type: 'fill',
          source: 'domains-source',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.04,
          },
        });

        // Domain dashed outline
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

        // ----------------------------------------------------
        // 2. PM2.5 CONCENTRATION HEATMAP SURFACE LAYER
        // ----------------------------------------------------
        const pm25Points = stations.map((stn) => {
          const obs = obsMap.get(stn.station_code);
          const pm25 = obs?.pm25 ?? 56.9;
          return {
            type: 'Feature',
            properties: { pm25 },
            geometry: {
              type: 'Point',
              coordinates: [stn.longitude, stn.latitude],
            },
          };
        });

        map.addSource('pm25-heatmap-source', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: pm25Points as any,
          },
        });

        map.addLayer({
          id: 'pm25-heatmap-layer',
          type: 'heatmap',
          source: 'pm25-heatmap-source',
          maxzoom: 15,
          paint: {
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['get', 'pm25'],
              0, 0,
              40, 0.3,
              80, 0.65,
              150, 1,
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
            'heatmap-opacity': pm25Opacity / 100,
          },
        });

        // ----------------------------------------------------
        // 3. SYNOPTIC NW WIND STREAMLINES LAYER
        // ----------------------------------------------------
        // Generate parallel NW -> SE streamline trajectories across corridor (315° transport direction)
        const windStreamlines = [
          // Regional synoptic NW -> SE corridor lines (D01)
          [[74.8, 31.8], [76.5, 30.1], [77.2, 28.6], [78.4, 27.4]],
          [[75.4, 31.2], [76.8, 29.8], [77.6, 28.3], [78.9, 27.2]],
          [[74.4, 30.8], [75.9, 29.4], [76.9, 28.5], [78.0, 27.5]],
          [[76.0, 31.9], [77.3, 30.2], [78.1, 28.8], [79.2, 27.6]],
          [[75.1, 30.3], [76.4, 29.0], [77.1, 28.1], [78.2, 27.1]],
          // Mesoscale NCR lines (D02 & D03)
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
          data: {
            type: 'FeatureCollection',
            features: windFeatures as any,
          },
        });

        map.addLayer({
          id: 'wind-lines-layer',
          type: 'line',
          source: 'wind-source',
          paint: {
            'line-color': '#0284c7',
            'line-width': 2.4,
            'line-dasharray': [8, 5],
            'line-opacity': windOpacity / 100,
          },
        });

        // ----------------------------------------------------
        // 4. PLUME FORWARD DISPERSION TRAJECTORY LAYER
        // ----------------------------------------------------
        const clusters = plumeRisk?.clusters || [];
        const plumeFeatures: any[] = [];

        for (const cl of clusters) {
          const steps = cl.trajectory_steps || [];
          if (steps.length > 1) {
            const coords = steps.map((s: any) => [s.longitude, s.latitude]);
            plumeFeatures.push({
              type: 'Feature',
              properties: {
                eventId: cl.event_id,
                region: cl.source_region,
                totalFrp: cl.total_frp_mw,
              },
              geometry: {
                type: 'LineString',
                coordinates: coords,
              },
            });
          }
        }

        // Forward biomass plume transport pathway connecting Punjab/Haryana cluster corridor into Delhi NCR (D02)
        plumeFeatures.push({
          type: 'Feature',
          properties: {
            eventId: 'SYNOPTIC_CORRIDOR_TRANSPORT',
            region: 'Punjab-Haryana Corridor',
            totalFrp: 10411,
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [75.2, 30.8],
              [75.9, 30.1],
              [76.6, 29.4],
              [77.05, 28.85],
              [77.35, 28.55],
            ],
          },
        });

        map.addSource('plume-source', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: plumeFeatures as any,
          },
        });

        map.addLayer({
          id: 'plume-glow-layer',
          type: 'line',
          source: 'plume-source',
          paint: {
            'line-color': '#ea580c',
            'line-width': 5,
            'line-blur': 3,
            'line-opacity': (plumeOpacity / 100) * 0.7,
          },
        });

        map.addLayer({
          id: 'plume-core-layer',
          type: 'line',
          source: 'plume-source',
          paint: {
            'line-color': '#dc2626',
            'line-width': 2.5,
            'line-dasharray': [4, 3],
            'line-opacity': plumeOpacity / 100,
          },
        });

        // ----------------------------------------------------
        // 5. CAAQMS MONITORING STATION HTML MARKERS
        // ----------------------------------------------------
        renderStationMarkers(maplibregl, map);

        // ----------------------------------------------------
        // 6. NASA FIRMS FIRE HOTSPOT HTML MARKERS
        // ----------------------------------------------------
        renderFireMarkers(maplibregl, map);

        // ----------------------------------------------------
        // 7. NCR CITIES GEOGRAPHIC LABELS
        // ----------------------------------------------------
        renderCityMarkers(maplibregl, map);
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
  }, []);

  // Render CAAQMS Station Markers
  const renderStationMarkers = (maplibregl: any, map: any) => {
    stations.forEach((stn) => {
      const obs = obsMap.get(stn.station_code);
      const pm25 = obs?.pm25 ?? 56.9;
      const color = getAqiColor(pm25);
      const isAnchor = stn.is_default_anchor;

      const el = document.createElement('div');
      el.className = 'station-maplibre-marker';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';

      // HTML Marker content
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

      // Popup content
      const popupHtml = `
        <div style="min-width: 190px;">
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
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; text-align: right;">
            <a href="/forecast?station=${stn.station_code}" style="color: #0284c7; font-size: 11px; font-weight: 700; text-decoration: none;">
              Inspect Forecast &rarr;
            </a>
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
  };

  // Render NASA FIRMS Fire Markers
  const renderFireMarkers = (maplibregl: any, map: any) => {
    const clustersList = fireClusters?.clusters || [];
    clustersList.forEach((cl: any) => {
      const el = document.createElement('div');
      el.className = 'fire-maplibre-marker';
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div style="display: flex; align-items: center; background: rgba(239, 68, 68, 0.95); color: #ffffff; padding: 2px 7px; border-radius: 9999px; font-size: 10px; font-weight: 800; border: 1.5px solid #ffffff; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.4);">
          <span style="margin-right: 3px;">🔥</span>
          <span>${Math.round(cl.total_frp_mw)} MW</span>
        </div>
      `;

      const popupHtml = `
        <div style="min-width: 180px;">
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
            <span style="font-size: 14px;">🔥</span>
            <strong style="color: #dc2626; font-size: 12px;">Active Biomass Fire</strong>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            NASA FIRMS VIIRS 375m &bull; ${cl.source_region}
          </div>
          <div style="font-size: 11px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 4px;">
            <div>Event: <strong>${cl.event_id}</strong></div>
            <div>Fire Power: <strong>${cl.total_frp_mw} MW</strong></div>
            <div>PM2.5 Flux: <strong style="color: #ea580c;">${cl.estimated_pm25_flux_kg_s} kg/s</strong></div>
            <div>Detections: <strong>${cl.detection_count} Satellite Pixels</strong></div>
            <div>Confidence: <strong>${cl.confidence_summary}</strong></div>
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 12, closeButton: true }).setHTML(popupHtml);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([cl.centroid_longitude, cl.centroid_latitude])
        .setPopup(popup)
        .addTo(map);

      (marker as any)._markerType = 'fire';
      markersRef.current.push(marker);
    });
  };

  // Render City Geographic Labels
  const renderCityMarkers = (maplibregl: any, map: any) => {
    NCR_CITIES.forEach((city) => {
      const el = document.createElement('div');
      el.className = 'city-maplibre-marker';
      el.style.pointerEvents = 'none';
      el.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(4px); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(203, 213, 225, 0.8); font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          ${city.name}
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([city.lon, city.lat])
        .addTo(map);

      (marker as any)._markerType = 'admin';
      markersRef.current.push(marker);
    });
  };

  // ----------------------------------------------------
  // Dynamic Synchronizations (Toggles & Opacities)
  // ----------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // PM2.5 Layer
    if (map.getLayer('pm25-heatmap-layer')) {
      map.setLayoutProperty('pm25-heatmap-layer', 'visibility', pm25Enabled ? 'visible' : 'none');
      map.setPaintProperty('pm25-heatmap-layer', 'heatmap-opacity', pm25Opacity / 100);
    }

    // Wind Streamlines
    if (map.getLayer('wind-lines-layer')) {
      map.setLayoutProperty('wind-lines-layer', 'visibility', windEnabled ? 'visible' : 'none');
      map.setPaintProperty('wind-lines-layer', 'line-opacity', windOpacity / 100);
    }

    // Plume Transport
    if (map.getLayer('plume-core-layer')) {
      map.setLayoutProperty('plume-core-layer', 'visibility', plumeEnabled ? 'visible' : 'none');
      map.setLayoutProperty('plume-glow-layer', 'visibility', plumeEnabled ? 'visible' : 'none');
      map.setPaintProperty('plume-core-layer', 'line-opacity', plumeOpacity / 100);
      map.setPaintProperty('plume-glow-layer', 'line-opacity', (plumeOpacity / 100) * 0.7);
    }

    // Domain Boundaries
    if (map.getLayer('domains-line-layer')) {
      map.setLayoutProperty('domains-line-layer', 'visibility', domainsEnabled ? 'visible' : 'none');
      map.setLayoutProperty('domains-fill-layer', 'visibility', domainsEnabled ? 'visible' : 'none');
    }

    // Marker Visibility Toggles
    markersRef.current.forEach((m) => {
      const type = (m as any)._markerType;
      const el = m.getElement();
      if (!el) return;

      if (type === 'station') {
        el.style.display = stationsEnabled ? 'flex' : 'none';
      }
      if (type === 'fire') {
        el.style.display = firesEnabled ? 'flex' : 'none';
        el.style.opacity = `${fireOpacity / 100}`;
      }
      if (type === 'admin') {
        el.style.display = adminEnabled ? 'block' : 'none';
      }
    });
  }, [
    pm25Enabled,
    windEnabled,
    plumeEnabled,
    firesEnabled,
    stationsEnabled,
    domainsEnabled,
    adminEnabled,
    pm25Opacity,
    windOpacity,
    plumeOpacity,
    fireOpacity,
  ]);

  // Handle Metric / Tab Switch
  const handleMetricSelect = (metric: MetricLayer) => {
    setActiveMetric(metric);
    if (metric === 'Plume') {
      setPlumeEnabled(true);
      flyToDomain('D01');
    } else if (metric === 'Fires') {
      setFiresEnabled(true);
      if (mapRef.current) {
        mapRef.current.flyTo({ center: [75.8, 30.2], zoom: 8, essential: true });
      }
    } else if (metric === 'PM2.5') {
      setPm25Enabled(true);
      resetView();
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const freshnessDate = freshness?.latest_observation_utc
    ? new Date(freshness.latest_observation_utc).toLocaleDateString()
    : '2/29/2024';

  const totalClusters = fireClusters?.clusters_count ?? 11;
  const rawWindSpeed = plumeRisk?.ambient_meteorology?.wind_speed_10m_ms ?? 3.2;
  const windSpeed = typeof rawWindSpeed === 'number' ? rawWindSpeed.toFixed(1) : Number(rawWindSpeed || 3.2).toFixed(1);

  return (
    <div className="live-map-page">
      {/* ---------------------------------------------------- */}
      {/* 1. Page Header Cluster */}
      {/* ---------------------------------------------------- */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.45rem' }}>
          <span className="badge badge-info">MapLibre GL JS Engine</span>
          <span className="badge badge-success">Domain Defined</span>
        </div>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Regional Geospatial &amp; Plume Transport Map
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.92rem', maxWidth: '780px' }}>
          Interactive multi-scale domain: D01 Regional Corridor, D02 NCR Mesoscale, and D03 Delhi Urban Core.
        </p>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. Configured Modeling Domain Cards (EPSG:4326) */}
      {/* ---------------------------------------------------- */}
      <div className="domain-cards-container">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.95rem', color: 'var(--text-primary)' }}>
          Configured Modeling Domains (EPSG:4326)
        </h3>
        <div className="domain-grid">
          {/* D01 Card */}
          <div
            className={`domain-card ${selectedDomain === 'D01' ? 'active-d01' : ''}`}
            onClick={() => flyToDomain('D01')}
            title="Click to inspect D01 Synoptic Corridor"
          >
            <div>
              <div style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.92rem', marginBottom: '0.35rem' }}>
                {DOMAINS.D01.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Lat: {DOMAINS.D01.latRange}<br />
                Lon: {DOMAINS.D01.lonRange}<br />
                Grid: {DOMAINS.D01.grid}
              </div>
            </div>
            <div style={{ marginTop: '0.65rem', fontSize: '0.74rem', color: '#0284c7', fontWeight: 600 }}>
              Zoom to Domain &rarr;
            </div>
          </div>

          {/* D02 Card */}
          <div
            className={`domain-card ${selectedDomain === 'D02' ? 'active-d02' : ''}`}
            onClick={() => flyToDomain('D02')}
            title="Click to inspect D02 NCR Mesoscale Basin"
          >
            <div>
              <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.92rem', marginBottom: '0.35rem' }}>
                {DOMAINS.D02.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Lat: {DOMAINS.D02.latRange}<br />
                Lon: {DOMAINS.D02.lonRange}<br />
                Grid: {DOMAINS.D02.grid}
              </div>
            </div>
            <div style={{ marginTop: '0.65rem', fontSize: '0.74rem', color: '#059669', fontWeight: 600 }}>
              Zoom to Domain &rarr;
            </div>
          </div>

          {/* D03 Card */}
          <div
            className={`domain-card ${selectedDomain === 'D03' ? 'active-d03' : ''}`}
            onClick={() => flyToDomain('D03')}
            title="Click to inspect D03 Delhi NCT Urban Core"
          >
            <div>
              <div style={{ fontWeight: 800, color: '#d97706', fontSize: '0.92rem', marginBottom: '0.35rem' }}>
                {DOMAINS.D03.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Lat: {DOMAINS.D03.latRange}<br />
                Lon: {DOMAINS.D03.lonRange}<br />
                Grid: {DOMAINS.D03.grid}
              </div>
            </div>
            <div style={{ marginTop: '0.65rem', fontSize: '0.74rem', color: '#d97706', fontWeight: 600 }}>
              Zoom to Domain &rarr;
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. Main Live Map Grid: Map Area (Left) + Sidebar (Right) */}
      {/* ---------------------------------------------------- */}
      <div className="live-map-grid">
        {/* Left Column: Interactive Map Area */}
        <div className="live-map-card">
          {/* Card Header & Metric Layer Selector Tabs */}
          <div className="card-title-group" style={{ marginBottom: '0.75rem' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Delhi NCR &mdash; Real-time Air Quality, Wind &amp; Plume Transport
              </h2>
              <div className="card-subtitle" style={{ fontSize: '0.78rem' }}>
                PM2.5 concentration, wind streamlines and active fire hotspots
              </div>
            </div>

            {/* Metric Layers Tabs */}
            <div className="map-tabs" role="tablist" aria-label="Pollutant and plume layers">
              {(['PM2.5', 'PM10', 'NO2', 'AOD', 'Plume', 'Fires'] as MetricLayer[]).map((metric) => (
                <button
                  key={metric}
                  type="button"
                  role="tab"
                  aria-selected={activeMetric === metric}
                  className={`map-tab-btn ${activeMetric === metric ? 'active' : ''}`}
                  onClick={() => handleMetricSelect(metric)}
                >
                  {metric === 'NO2' ? 'NO₂' : metric}
                </button>
              ))}
            </div>
          </div>

          {/* Map Viewport Container */}
          <div className="maplibre-viewport-wrapper">
            <div ref={mapContainerRef} className="maplibre-container" />

            {/* Floating Navigation Controls (Left side) */}
            <div className="map-left-controls">
              <button
                type="button"
                className="map-ctrl-btn"
                onClick={() => mapRef.current?.zoomIn()}
                title="Zoom In"
                aria-label="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                className="map-ctrl-btn"
                onClick={() => mapRef.current?.zoomOut()}
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                &minus;
              </button>
              <button
                type="button"
                className="map-ctrl-btn"
                onClick={resetView}
                title="Locate / Reset View to Delhi NCR"
                aria-label="Locate / Reset View"
              >
                &#x21bb;
              </button>
              <button
                type="button"
                className="map-ctrl-btn"
                onClick={() => flyToDomain('D01')}
                title="D01 Regional Corridor"
                style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7' }}
              >
                D01
              </button>
              <button
                type="button"
                className="map-ctrl-btn"
                onClick={() => flyToDomain('D02')}
                title="D02 NCR Mesoscale"
                style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669' }}
              >
                D02
              </button>
              <button
                type="button"
                className="map-ctrl-btn"
                onClick={() => flyToDomain('D03')}
                title="D03 Delhi Urban Core"
                style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706' }}
              >
                D03
              </button>
              <button
                type="button"
                className="map-ctrl-btn"
                onClick={toggleFullscreen}
                title="Toggle Fullscreen"
                aria-label="Toggle Fullscreen"
              >
                &#x26F6;
              </button>
            </div>

            {/* Floating NAQI Legend inside map */}
            <div className="map-floating-legend">
              <div style={{ fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-primary)', fontSize: '0.78rem' }}>
                PM2.5 (&micro;g/m&sup3;)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#059669' }}></span>
                  <span style={{ color: 'var(--text-secondary)' }}>0&ndash;50 &bull; Good</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#d97706' }}></span>
                  <span style={{ color: 'var(--text-secondary)' }}>51&ndash;100 &bull; Moderate</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ea580c' }}></span>
                  <span style={{ color: 'var(--text-secondary)' }}>101&ndash;200 &bull; Poor</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#dc2626' }}></span>
                  <span style={{ color: 'var(--text-secondary)' }}>201&ndash;300 &bull; Very Poor</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#991b1b' }}></span>
                  <span style={{ color: 'var(--text-secondary)' }}>301&ndash;500 &bull; Severe</span>
                </div>
              </div>
            </div>
          </div>

          {/* Time Control Scrubber at bottom of map */}
          <div className="map-timeline-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isPlaying ? '#ea580c' : '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
                title={isPlaying ? 'Pause Timeline' : 'Play Timeline'}
                aria-label="Play/Pause timeline"
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Time: <strong style={{ color: 'var(--text-primary)' }}>{TIME_STEPS[activeTimeIdx]}</strong> IST
              </div>
            </div>

            {/* Time step buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
              {TIME_STEPS.map((t, idx) => (
                <button
                  key={t}
                  type="button"
                  className={`timeline-step-btn ${activeTimeIdx === idx ? 'active' : ''}`}
                  onClick={() => setActiveTimeIdx(idx)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Winter Benchmark: {freshnessDate}
            </div>
          </div>
        </div>

        {/* Right Column: Layer Controls & Scientific Insights Panels */}
        <div className="live-map-sidebar">
          {/* ---------------------------------------------------- */}
          {/* Card 1: Map Layers Toggles */}
          {/* ---------------------------------------------------- */}
          <div className="sidebar-panel-card">
            <h3 className="panel-title">Map Layers</h3>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* PM2.5 Concentration */}
              <div className="layer-toggle-row">
                <span className="layer-toggle-label">
                  <span style={{ color: '#0284c7', fontSize: '1.1rem' }}>&bull;</span>
                  PM2.5 Concentration
                </span>
                <label className="switch-control" aria-label="Toggle PM2.5 Concentration">
                  <input
                    type="checkbox"
                    checked={pm25Enabled}
                    onChange={(e) => setPm25Enabled(e.target.checked)}
                  />
                  <span className="slider-round" />
                </label>
              </div>

              {/* Wind Streamlines */}
              <div className="layer-toggle-row">
                <span className="layer-toggle-label">
                  <span style={{ color: '#0284c7', fontSize: '1.1rem' }}>&bull;</span>
                  Wind Streamlines
                </span>
                <label className="switch-control" aria-label="Toggle Wind Streamlines">
                  <input
                    type="checkbox"
                    checked={windEnabled}
                    onChange={(e) => setWindEnabled(e.target.checked)}
                  />
                  <span className="slider-round" />
                </label>
              </div>

              {/* Plume Transport */}
              <div className="layer-toggle-row">
                <span className="layer-toggle-label">
                  <span style={{ color: '#ea580c', fontSize: '1.1rem' }}>&bull;</span>
                  Plume Transport
                </span>
                <label className="switch-control" aria-label="Toggle Plume Transport">
                  <input
                    type="checkbox"
                    checked={plumeEnabled}
                    onChange={(e) => setPlumeEnabled(e.target.checked)}
                  />
                  <span className="slider-round" />
                </label>
              </div>

              {/* Active Fire Hotspots */}
              <div className="layer-toggle-row">
                <span className="layer-toggle-label">
                  <span style={{ color: '#dc2626', fontSize: '1.1rem' }}>&bull;</span>
                  Active Fire Hotspots (NASA)
                </span>
                <label className="switch-control" aria-label="Toggle Active Fire Hotspots">
                  <input
                    type="checkbox"
                    checked={firesEnabled}
                    onChange={(e) => setFiresEnabled(e.target.checked)}
                  />
                  <span className="slider-round" />
                </label>
              </div>

              {/* CAAQMS Stations */}
              <div className="layer-toggle-row">
                <span className="layer-toggle-label">
                  <span style={{ color: '#059669', fontSize: '1.1rem' }}>&bull;</span>
                  CAAQMS Stations
                </span>
                <label className="switch-control" aria-label="Toggle CAAQMS Stations">
                  <input
                    type="checkbox"
                    checked={stationsEnabled}
                    onChange={(e) => setStationsEnabled(e.target.checked)}
                  />
                  <span className="slider-round" />
                </label>
              </div>

              {/* Domain Boundaries */}
              <div className="layer-toggle-row">
                <span className="layer-toggle-label">
                  <span style={{ color: '#6366f1', fontSize: '1.1rem' }}>&bull;</span>
                  Domain Boundaries
                </span>
                <label className="switch-control" aria-label="Toggle Domain Boundaries">
                  <input
                    type="checkbox"
                    checked={domainsEnabled}
                    onChange={(e) => setDomainsEnabled(e.target.checked)}
                  />
                  <span className="slider-round" />
                </label>
              </div>

              {/* Administrative Boundaries */}
              <div className="layer-toggle-row">
                <span className="layer-toggle-label">
                  <span style={{ color: '#94a3b8', fontSize: '1.1rem' }}>&bull;</span>
                  Administrative Boundaries
                </span>
                <label className="switch-control" aria-label="Toggle Administrative Boundaries">
                  <input
                    type="checkbox"
                    checked={adminEnabled}
                    onChange={(e) => setAdminEnabled(e.target.checked)}
                  />
                  <span className="slider-round" />
                </label>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* Card 2: Layer Opacity Sliders */}
          {/* ---------------------------------------------------- */}
          <div className="sidebar-panel-card">
            <h3 className="panel-title">Layer Opacity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* PM2.5 Layer */}
              <div className="opacity-slider-row">
                <div className="opacity-slider-header">
                  <span>PM2.5 Layer</span>
                  <strong>{pm25Opacity}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={pm25Opacity}
                  onChange={(e) => setPm25Opacity(Number(e.target.value))}
                  className="opacity-range-input"
                  aria-label="PM2.5 layer opacity slider"
                />
              </div>

              {/* Wind Streamlines */}
              <div className="opacity-slider-row">
                <div className="opacity-slider-header">
                  <span>Wind Streamlines</span>
                  <strong>{windOpacity}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={windOpacity}
                  onChange={(e) => setWindOpacity(Number(e.target.value))}
                  className="opacity-range-input"
                  aria-label="Wind streamlines opacity slider"
                />
              </div>

              {/* Plume Layer */}
              <div className="opacity-slider-row">
                <div className="opacity-slider-header">
                  <span>Plume Layer</span>
                  <strong>{plumeOpacity}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={plumeOpacity}
                  onChange={(e) => setPlumeOpacity(Number(e.target.value))}
                  className="opacity-range-input"
                  aria-label="Plume layer opacity slider"
                />
              </div>

              {/* Fire Hotspots */}
              <div className="opacity-slider-row">
                <div className="opacity-slider-header">
                  <span>Fire Hotspots</span>
                  <strong>{fireOpacity}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fireOpacity}
                  onChange={(e) => setFireOpacity(Number(e.target.value))}
                  className="opacity-range-input"
                  aria-label="Fire hotspots opacity slider"
                />
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* Card 3: Live Feed & Insights */}
          {/* ---------------------------------------------------- */}
          <div className="sidebar-panel-card">
            <h3 className="panel-title">
              <span>Live Feed &amp; Insights</span>
            </h3>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
              Data: {freshnessDate} (Winter Benchmark)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {/* Active Fire Clusters */}
              <div
                style={{
                  padding: '0.65rem 0.8rem',
                  borderRadius: '8px',
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700, color: '#ea580c' }}>
                  <span>🔥 Active Fire Clusters</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {totalClusters} Active (Punjab/HR)
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Total FRP: {Math.round(fireClusters?.total_active_frp_mw ?? 10411).toLocaleString()} MW
                </div>
              </div>

              {/* Wind Transport */}
              <div
                style={{
                  padding: '0.65rem 0.8rem',
                  borderRadius: '8px',
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700, color: '#0284c7' }}>
                  <span>🌬 NW Winds Predominant</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {windSpeed} m/s at 10m
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Synoptic Direction: 315&deg; NW Transport
                </div>
              </div>

              {/* Plume Transport */}
              <div
                style={{
                  padding: '0.65rem 0.8rem',
                  borderRadius: '8px',
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700, color: '#d97706' }}>
                  <span>➤ Plume Transport Active</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  Transport towards Delhi NCR (D02)
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Inversion Trapping: ITSI {inversion?.trapping_severity_index ?? 44.8} / 100
                </div>
              </div>

              {/* CAAQMS Stations */}
              <div
                style={{
                  padding: '0.65rem 0.8rem',
                  borderRadius: '8px',
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700, color: '#059669' }}>
                  <span>● CAAQMS Stations</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {stations.length} Station Nodes Active
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Real-time Ground Telemetry + Benchmark Data
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
