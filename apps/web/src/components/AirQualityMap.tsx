'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MonitoringStation, LatestObservationsResponse, StationObservationRecord } from '@/lib/api';

interface AirQualityMapProps {
  stations: MonitoringStation[];
  latestObs: LatestObservationsResponse | null;
}

type MetricType = 'PM2.5' | 'PM10' | 'NO2' | 'AQI';

export default function AirQualityMap({ stations, latestObs }: AirQualityMapProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>('PM2.5');
  const [hoveredStation, setHoveredStation] = useState<{
    station: MonitoringStation;
    obs?: StationObservationRecord;
    x: number;
    y: number;
  } | null>(null);

  const obsMap = useMemo(() => {
    const map = new Map<string, StationObservationRecord>();
    if (latestObs?.records) {
      for (const rec of latestObs.records) {
        map.set(rec.station_code, rec);
      }
    }
    return map;
  }, [latestObs]);

  // Transform geo coords (lon, lat) to SVG coordinates (width: 500, height: 360)
  const getCoordinates = (lat: number, lon: number) => {
    const minLon = 76.85;
    const maxLon = 77.38;
    const minLat = 28.45;
    const maxLat = 28.88;

    const x = Math.max(30, Math.min(470, ((lon - minLon) / (maxLon - minLon)) * 430 + 35));
    const y = Math.max(30, Math.min(330, 330 - ((lat - minLat) / (maxLat - minLat)) * 280));
    return { x, y };
  };

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
        // Approximate Indian NAQI index from PM2.5
        const aqi = Math.round(obs.pm25 > 120 ? (obs.pm25 * 2.2) : (obs.pm25 * 1.5));
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

  return (
    <div className="map-card" aria-label="Delhi NCR Air Quality Map">
      {/* Header and Metric Selection Tabs */}
      <div className="card-title-group">
        <div>
          <h2 className="card-title">Delhi NCR Air Quality Map</h2>
          <div className="card-subtitle">Real-time station network &amp; current pollution levels</div>
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

      {/* Map Canvas */}
      <div className="map-canvas-container">
        <svg
          viewBox="0 0 500 360"
          className="map-svg"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            {/* Soft grid pattern for mesoscale navigation */}
            <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
            </pattern>
            {/* Yamuna river gradient */}
            <linearGradient id="riverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.6" />
            </linearGradient>
            {/* Regional basin background */}
            <radialGradient id="ncrBasin" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.06" />
              <stop offset="75%" stopColor="#0284c7" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background Grid & Ambient Basin */}
          <rect width="500" height="360" fill="url(#mapGrid)" />
          <ellipse cx="250" cy="180" rx="220" ry="150" fill="url(#ncrBasin)" />

          {/* Delhi NCT Regional Airshed Boundary (Georeferenced SVG polygon) */}
          <path
            d="M 120 70 
               C 170 50, 240 45, 300 65 
               C 360 85, 410 120, 430 180 
               C 440 240, 390 300, 310 320 
               C 230 335, 150 310, 100 260 
               C 65 210, 80 120, 120 70 Z"
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />

          {/* Inner Urban Core Area Outline */}
          <path
            d="M 170 110 
               C 210 95, 270 95, 310 115 
               C 350 135, 370 180, 360 225 
               C 340 265, 280 275, 220 265 
               C 170 245, 145 190, 155 150 
               C 160 130, 165 120, 170 110 Z"
            fill="rgba(2, 132, 199, 0.025)"
            stroke="var(--accent-cyan)"
            strokeWidth="1"
            strokeOpacity="0.3"
          />

          {/* Yamuna River Corridor Meander */}
          <path
            d="M 310 20 
               Q 318 70, 308 120 
               T 325 180 
               Q 340 230, 365 270 
               T 395 340"
            fill="none"
            stroke="url(#riverGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <text x="335" y="145" fontSize="9" fill="#0284c7" fontWeight="600" opacity="0.6" letterSpacing="0.05em">
            Yamuna River
          </text>

          {/* Key Geographic Region Labels */}
          <text x="70" y="90" fontSize="10" fill="var(--text-muted)" fontWeight="600">Northwest</text>
          <text x="380" y="80" fontSize="10" fill="var(--text-muted)" fontWeight="600">Northeast</text>
          <text x="60" y="270" fontSize="10" fill="var(--text-muted)" fontWeight="600">Southwest / IGI</text>
          <text x="365" y="300" fontSize="10" fill="var(--text-muted)" fontWeight="600">Southeast</text>
          <text x="225" y="195" fontSize="10" fill="var(--text-muted)" fontWeight="700" letterSpacing="0.05em" opacity="0.7">
            DELHI NCT
          </text>

          {/* Station Markers & Telemetry Badges */}
          {stations.map((stn) => {
            const { x, y } = getCoordinates(stn.latitude, stn.longitude);
            const obs = obsMap.get(stn.station_code);
            const metricData = getMetricValue(obs);
            const color = getColor(metricData?.val ?? null);
            const isHovered = hoveredStation?.station.station_code === stn.station_code;

            return (
              <g
                key={stn.station_code}
                className="station-map-pin"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredStation({ station: stn, obs, x, y })}
                onMouseLeave={() => setHoveredStation(null)}
              >
                {/* Pulse Ring for Default Anchor Stations */}
                {stn.is_default_anchor && (
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 16 : 11}
                    fill={color}
                    fillOpacity="0.2"
                    stroke={color}
                    strokeWidth="1"
                  >
                    <animate
                      attributeName="r"
                      values="10;15;10"
                      dur="3s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="fill-opacity"
                      values="0.25;0.05;0.25"
                      dur="3s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Center Pin Node */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 7 : 5.5}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  filter="drop-shadow(0 1px 3px rgba(0,0,0,0.25))"
                />

                {/* Station Value Callout Badge */}
                {metricData && (
                  <g transform={`translate(${x + 9}, ${y - 12})`}>
                    <rect
                      x="0"
                      y="0"
                      width={String(metricData.val).length > 3 ? 42 : 36}
                      height="18"
                      rx="9"
                      fill="#ffffff"
                      stroke={color}
                      strokeWidth="1.5"
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.12))"
                    />
                    <text
                      x={String(metricData.val).length > 3 ? 21 : 18}
                      y="12.5"
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="700"
                      fill="#0f172a"
                      fontFamily="var(--font-heading)"
                    >
                      {metricData.val}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Popover */}
        {hoveredStation && (
          <div
            style={{
              position: 'absolute',
              left: `${Math.min(380, Math.max(20, hoveredStation.x - 60))}px`,
              top: `${Math.max(10, hoveredStation.y - 85)}px`,
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-card)',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              boxShadow: 'var(--shadow-md)',
              pointerEvents: 'none',
              zIndex: 30,
              minWidth: '180px',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              {hoveredStation.station.name.split(',')[0]}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              {hoveredStation.station.station_code} &bull; {hoveredStation.station.provider}
            </div>
            {hoveredStation.obs ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.35rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{activeMetric}:</span>
                <strong style={{ color: getColor(getMetricValue(hoveredStation.obs)?.val ?? null) }}>
                  {getMetricValue(hoveredStation.obs)?.val} {getMetricValue(hoveredStation.obs)?.unit}
                </strong>
              </div>
            ) : (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Continuous Telemetry Node</div>
            )}
          </div>
        )}
      </div>

      {/* Bottom AQI Legend & Link */}
      <div className="map-legend">
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-color-dot" style={{ backgroundColor: '#059669' }}></span>
            <span>Good</span>
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
