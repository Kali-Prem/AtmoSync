'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MonitoringStation, LatestObservationsResponse, StationObservationRecord } from '@/lib/api';

interface AirQualityMapProps {
  stations: MonitoringStation[];
  latestObs: LatestObservationsResponse | null;
}

type MetricType = 'PM2.5' | 'PM10' | 'NO2' | 'AQI';

// Web Mercator EPSG:3857 projection calculations
function lonToWorldX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * 256 * Math.pow(2, zoom);
}

function latToWorldY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    256 *
    Math.pow(2, zoom)
  );
}

// Major Delhi NCR geographic landmarks & surrounding district centers
const NCR_CITIES = [
  { name: 'Noida', state: 'UP', lat: 28.5355, lon: 77.391, isPrimary: false },
  { name: 'Ghaziabad', state: 'UP', lat: 28.6692, lon: 77.4538, isPrimary: false },
  { name: 'Gurugram', state: 'Haryana', lat: 28.4595, lon: 77.0266, isPrimary: false },
  { name: 'Faridabad', state: 'Haryana', lat: 28.4089, lon: 77.3178, isPrimary: false },
];

export default function AirQualityMap({ stations, latestObs }: AirQualityMapProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>('PM2.5');
  const [zoom, setZoom] = useState<number>(10);
  const [center, setCenter] = useState<{ lat: number; lon: number }>({
    lat: 28.6139,
    lon: 77.209,
  });

  // Drag-to-pan state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 520,
    height: 400,
  });

  const [hoveredStation, setHoveredStation] = useState<{
    station: MonitoringStation;
    obs?: StationObservationRecord;
    pixelX: number;
    pixelY: number;
  } | null>(null);

  // ResizeObserver to track container width & height dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const obsMap = useMemo(() => {
    const map = new Map<string, StationObservationRecord>();
    if (latestObs?.records) {
      for (const rec of latestObs.records) {
        map.set(rec.station_code, rec);
      }
    }
    return map;
  }, [latestObs]);

  const getMetricValue = (obs?: StationObservationRecord) => {
    if (!obs) return null;
    switch (activeMetric) {
      case 'PM2.5':
        return { val: obs.pm25, unit: 'µg/m³' };
      case 'PM10':
        return { val: obs.pm10, unit: 'µg/m³' };
      case 'NO2':
        return { val: obs.no2, unit: 'µg/m³' };
      case 'AQI': {
        const aqi = Math.round(obs.pm25 > 120 ? obs.pm25 * 2.2 : obs.pm25 * 1.5);
        return { val: aqi, unit: 'AQI' };
      }
    }
  };

  const getColor = (value: number | null) => {
    if (value === null) return '#94a3b8';
    if (activeMetric === 'PM2.5') {
      if (value <= 30) return '#059669'; // Good
      if (value <= 60) return '#65a30d'; // Satisfactory
      if (value <= 90) return '#d97706'; // Moderate
      if (value <= 120) return '#ea580c'; // Poor
      if (value <= 250) return '#dc2626'; // Very Poor
      return '#991b1b'; // Severe
    }
    if (activeMetric === 'PM10') {
      if (value <= 50) return '#059669';
      if (value <= 100) return '#65a30d';
      if (value <= 250) return '#d97706';
      if (value <= 350) return '#ea580c';
      if (value <= 430) return '#dc2626';
      return '#991b1b';
    }
    if (activeMetric === 'NO2') {
      if (value <= 40) return '#059669';
      if (value <= 80) return '#65a30d';
      if (value <= 180) return '#d97706';
      return '#dc2626';
    }
    // AQI
    if (value <= 50) return '#059669';
    if (value <= 100) return '#65a30d';
    if (value <= 200) return '#d97706';
    if (value <= 300) return '#ea580c';
    if (value <= 400) return '#dc2626';
    return '#991b1b';
  };

  // Convert (lat, lon) to container pixels relative to current center and zoom
  const projectCoords = useCallback(
    (lat: number, lon: number) => {
      const centerWorldX = lonToWorldX(center.lon, zoom);
      const centerWorldY = latToWorldY(center.lat, zoom);
      const targetWorldX = lonToWorldX(lon, zoom);
      const targetWorldY = latToWorldY(lat, zoom);

      const pixelX = dimensions.width / 2 + (targetWorldX - centerWorldX);
      const pixelY = dimensions.height / 2 + (targetWorldY - centerWorldY);
      return { pixelX, pixelY };
    },
    [center, zoom, dimensions]
  );

  // Compute visible Carto tiles grid
  const tiles = useMemo(() => {
    const centerWorldX = lonToWorldX(center.lon, zoom);
    const centerWorldY = latToWorldY(center.lat, zoom);

    const minX = centerWorldX - dimensions.width / 2;
    const maxX = centerWorldX + dimensions.width / 2;
    const minY = centerWorldY - dimensions.height / 2;
    const maxY = centerWorldY + dimensions.height / 2;

    const minTileX = Math.floor(minX / 256);
    const maxTileX = Math.floor(maxX / 256);
    const minTileY = Math.floor(minY / 256);
    const maxTileY = Math.floor(maxY / 256);

    const tileList: {
      key: string;
      url: string;
      left: number;
      top: number;
    }[] = [];

    const subdomains = ['a', 'b', 'c', 'd'];

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const url = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
        const left = tx * 256 - minX;
        const top = ty * 256 - minY;

        tileList.push({
          key: `${zoom}-${tx}-${ty}`,
          url,
          left,
          top,
        });
      }
    }
    return tileList;
  }, [center, zoom, dimensions]);

  // Pan interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // primary click only
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    // Convert pixel delta to lat/lon delta at current zoom
    const worldScale = 256 * Math.pow(2, zoom);
    const dLon = (-dx / worldScale) * 360;

    // Approximate latitude conversion for Delhi latitude
    const latRad = (center.lat * Math.PI) / 180;
    const dLat = (dy / worldScale) * 360 * Math.cos(latRad);

    setCenter((prev) => ({
      lat: Math.max(28.1, Math.min(29.2, prev.lat + dLat)),
      lon: Math.max(76.5, Math.min(77.9, prev.lon + dLon)),
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(12, z + 1));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(9, z - 1));
  };

  const handleReset = () => {
    setCenter({ lat: 28.6139, lon: 77.209 });
    setZoom(10);
  };

  return (
    <div className="map-card" aria-label="Delhi NCR Air Quality Map">
      {/* Header and Pollutant Selector Tabs */}
      <div className="card-title-group">
        <div>
          <h2 className="card-title">Delhi NCR Air Quality Map</h2>
          <div className="card-subtitle">Geographic CAAQMS station network &amp; ambient telemetry</div>
        </div>

        <div className="map-tabs" role="tablist" aria-label="Pollutant selection">
          {(['PM2.5', 'PM10', 'NO2', 'AQI'] as MetricType[]).map((metric) => (
            <button
              key={metric}
              type="button"
              role="tab"
              aria-selected={activeMetric === metric}
              className={`map-tab-btn ${activeMetric === metric ? 'active' : ''}`}
              onClick={() => setActiveMetric(metric)}
            >
              {metric === 'NO2' ? 'NO₂' : metric}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Map Viewport */}
      <div
        ref={containerRef}
        className="map-canvas-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          position: 'relative',
        }}
      >
        {/* Real Geographic CartoDB Tiles Layer */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            background: '#e2e8f0',
          }}
        >
          {tiles.map((tile) => (
            <img
              key={tile.key}
              src={tile.url}
              alt=""
              loading="eager"
              style={{
                position: 'absolute',
                left: `${tile.left}px`,
                top: `${tile.top}px`,
                width: '256px',
                height: '256px',
                display: 'block',
                opacity: 0.95,
                filter: 'contrast(1.03)',
              }}
            />
          ))}
        </div>

        {/* Soft Regional Airshed Atmosphere Overlay (Semi-transparent tint) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(2, 132, 199, 0.03) 0%, rgba(2, 132, 199, 0.08) 100%)',
          }}
        />

        {/* Surrounding NCR Regional Cities & Administrative Boundaries */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {NCR_CITIES.map((city) => {
            const { pixelX, pixelY } = projectCoords(city.lat, city.lon);
            if (
              pixelX < -50 ||
              pixelX > dimensions.width + 50 ||
              pixelY < -30 ||
              pixelY > dimensions.height + 30
            ) {
              return null;
            }

            return (
              <div
                key={city.name}
                style={{
                  position: 'absolute',
                  left: `${pixelX}px`,
                  top: `${pixelY}px`,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    fontSize: city.isPrimary ? '0.78rem' : '0.68rem',
                    fontWeight: city.isPrimary ? 800 : 700,
                    letterSpacing: city.isPrimary ? '0.08em' : '0.04em',
                    color: city.isPrimary ? '#0369a1' : '#475569',
                    textTransform: 'uppercase',
                    background: 'rgba(255, 255, 255, 0.78)',
                    backdropFilter: 'blur(4px)',
                    padding: city.isPrimary ? '0.15rem 0.5rem' : '0.1rem 0.4rem',
                    borderRadius: '4px',
                    border: city.isPrimary
                      ? '1px solid rgba(2, 132, 199, 0.3)'
                      : '1px solid rgba(203, 213, 225, 0.6)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {city.name} {city.state !== 'Central' && `(${city.state})`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Station Markers Overlay Layer */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
          {stations.map((stn) => {
            const { pixelX, pixelY } = projectCoords(stn.latitude, stn.longitude);
            if (
              pixelX < -40 ||
              pixelX > dimensions.width + 40 ||
              pixelY < -40 ||
              pixelY > dimensions.height + 40
            ) {
              return null;
            }

            const obs = obsMap.get(stn.station_code);
            const metricData = getMetricValue(obs);
            const color = getColor(metricData?.val ?? null);
            const isHovered = hoveredStation?.station.station_code === stn.station_code;

            return (
              <div
                key={stn.station_code}
                className="station-map-pin"
                style={{
                  position: 'absolute',
                  left: `${pixelX}px`,
                  top: `${pixelY}px`,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  zIndex: isHovered ? 25 : stn.is_default_anchor ? 20 : 15,
                }}
                onMouseEnter={() =>
                  setHoveredStation({
                    station: stn,
                    obs,
                    pixelX,
                    pixelY,
                  })
                }
                onMouseLeave={() => setHoveredStation(null)}
              >
                {/* Pulse Ring for Default Anchor Stations */}
                {stn.is_default_anchor && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: isHovered ? '32px' : '24px',
                      height: isHovered ? '32px' : '24px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      opacity: 0.28,
                      transform: 'translate(-50%, -50%)',
                      animation: 'pulse-marker 2.5s infinite ease-out',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Pin Circle */}
                <div
                  style={{
                    width: isHovered ? '16px' : '13px',
                    height: isHovered ? '16px' : '13px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: '2.5px solid #ffffff',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.18s ease',
                  }}
                />

                {/* Station Telemetry Value Callout Pill */}
                {metricData && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '-10px',
                      backgroundColor: '#ffffff',
                      border: `1.5px solid ${color}`,
                      borderRadius: '9999px',
                      padding: '0.1rem 0.4rem',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                    }}
                  >
                    {metricData.val}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Map Pan & Zoom Controls */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            zIndex: 35,
          }}
        >
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom In"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '1.1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            }}
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom Out"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '1.1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            }}
          >
            &minus;
          </button>
          <button
            type="button"
            onClick={handleReset}
            title="Reset to Delhi NCR Center"
            aria-label="Reset View"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--accent-cyan)',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            }}
          >
            &#x21bb;
          </button>
        </div>

        {/* Discreet Geographic Source Attribution */}
        <div
          style={{
            position: 'absolute',
            bottom: '4px',
            left: '6px',
            fontSize: '0.62rem',
            color: '#64748b',
            background: 'rgba(255, 255, 255, 0.8)',
            padding: '1px 5px',
            borderRadius: '3px',
            pointerEvents: 'none',
            zIndex: 30,
          }}
        >
          &copy; OpenStreetMap contributors
        </div>

        {/* Hover Tooltip Popover */}
        {hoveredStation && (
          <div
            style={{
              position: 'absolute',
              left: `${Math.min(dimensions.width - 200, Math.max(10, hoveredStation.pixelX - 80))}px`,
              top: `${Math.max(10, hoveredStation.pixelY - 95)}px`,
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-card)',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              boxShadow: 'var(--shadow-md)',
              pointerEvents: 'none',
              zIndex: 40,
              minWidth: '180px',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              {hoveredStation.station.name.split(',')[0]}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              {hoveredStation.station.station_code} &bull; {hoveredStation.station.provider}
            </div>
            {hoveredStation.obs ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '0.35rem',
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{activeMetric}:</span>
                <strong style={{ color: getColor(getMetricValue(hoveredStation.obs)?.val ?? null) }}>
                  {getMetricValue(hoveredStation.obs)?.val} {getMetricValue(hoveredStation.obs)?.unit}
                </strong>
              </div>
            ) : (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Continuous Telemetry Node</div>
            )}
          </div>
        )}
      </div>

      {/* Statutory NAQI Legend Bar & Deep Link */}
      <div className="map-legend">
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-color-dot" style={{ backgroundColor: '#059669' }}></span>
            <span>Good</span>
          </div>
          <div className="legend-item">
            <span className="legend-color-dot" style={{ backgroundColor: '#65a30d' }}></span>
            <span>Satisfactory</span>
          </div>
          <div className="legend-item">
            <span className="legend-color-dot" style={{ backgroundColor: '#d97706' }}></span>
            <span>Moderate</span>
          </div>
          <div className="legend-item">
            <span className="legend-color-dot" style={{ backgroundColor: '#ea580c' }}></span>
            <span>Poor</span>
          </div>
          <div className="legend-item">
            <span className="legend-color-dot" style={{ backgroundColor: '#dc2626' }}></span>
            <span>Very Poor</span>
          </div>
          <div className="legend-item">
            <span className="legend-color-dot" style={{ backgroundColor: '#991b1b' }}></span>
            <span>Severe</span>
          </div>
        </div>

        <Link
          href="/stations"
          style={{
            color: 'var(--accent-cyan)',
            fontSize: '0.78rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          View All Stations &rarr;
        </Link>
      </div>
    </div>
  );
}
