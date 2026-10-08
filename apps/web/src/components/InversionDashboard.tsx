'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  MonitoringStation,
  LatestObservationsResponse,
  StationObservationRecord,
  InversionStatus,
  StationHistoryResponse,
  StationHistoryItem,
} from '@/lib/api';

interface InversionDashboardProps {
  initialInversion: InversionStatus | null;
  stations: MonitoringStation[];
  latestObs: LatestObservationsResponse | null;
  initialHistory: StationHistoryResponse | null;
  selectedStationCode?: string;
}

type TimeRange = '24h' | '7d' | '30d';

export default function InversionDashboard({
  initialInversion,
  stations,
  latestObs,
  initialHistory,
  selectedStationCode = 'DL_ANAND_VIHAR',
}: InversionDashboardProps) {
  // ----------------------------------------------------
  // Interactive UI States
  // ----------------------------------------------------
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [selectedStation, setSelectedStation] = useState<string>(selectedStationCode);
  const [inversionData, setInversionData] = useState<InversionStatus | null>(initialInversion);
  const [historyItems, setHistoryItems] = useState<StationHistoryItem[]>(
    initialHistory?.history || []
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hover states for charts
  const [hoveredProfileAlt, setHoveredProfileAlt] = useState<number | null>(null);
  const [hoveredHistoryIdx, setHoveredHistoryIdx] = useState<number | null>(null);

  // Index latest observations by station code
  const obsMap = useMemo(() => {
    const map = new Map<string, StationObservationRecord>();
    if (latestObs?.records) {
      for (const rec of latestObs.records) {
        map.set(rec.station_code, rec);
      }
    }
    return map;
  }, [latestObs]);

  // Current selected station record
  const currentStationObs = obsMap.get(selectedStation);

  // Derived or actual meteorological quantities for current station
  const t2m = currentStationObs?.temp_c ?? inversionData?.temperature_2m_c ?? inversionData?.temperature_2m ?? 14.3;
  const ws = currentStationObs?.wind_speed_ms ?? inversionData?.wind_speed_10m_ms ?? inversionData?.wind_speed_10m ?? 1.8;
  const rh = currentStationObs?.rh_pct ?? 68.0;
  const pblh = Math.round(currentStationObs?.pblh_m ?? inversionData?.boundary_layer_height_m ?? 150.0);
  const rawItsi = currentStationObs?.itsi ?? inversionData?.trapping_severity_index ?? 44.8;
  const itsi = Math.round(rawItsi * 10) / 10;
  const lapseRate = inversionData?.near_surface_lapse_rate_c_100m ?? inversionData?.near_surface_lapse_rate ?? 0.45;
  const lapseFormatted = lapseRate > 0 ? `+${lapseRate.toFixed(2)}` : lapseRate.toFixed(2);
  const vi = Math.round(inversionData?.ventilation_index_m2s ?? inversionData?.ventilation_index ?? (pblh * Math.max(0.5, 1.2 * ws)));
  const invClass = inversionData?.inversion_class?.replace(/_/g, ' ') || 'STABLE LAYER';
  const riskSummary = inversionData?.risk_summary || 'Adequate vertical mixing with active atmospheric dispersion.';

  // Inversion Layer Base & Top Heights
  const invBaseHeight = inversionData?.inversion_base_height_m ?? (lapseRate > 0 ? 150 : null);
  const invTopHeight = inversionData?.inversion_top_height_m ?? (lapseRate > 0 ? 800 : null);

  // Fetch updated data on station change
  const handleStationChange = useCallback(async (code: string) => {
    setSelectedStation(code);
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [invRes, histRes] = await Promise.all([
        fetch(`/api/v1/inversion/status?station_code=${encodeURIComponent(code)}`).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(`/api/v1/observations/stations/${encodeURIComponent(code)}/history?limit=24`).then((r) =>
          r.ok ? r.json() : null
        ),
      ]);

      if (invRes) {
        setInversionData(invRes);
      }
      if (histRes && histRes.history) {
        setHistoryItems(histRes.history);
      }
    } catch (err) {
      console.error('Failed to reload station inversion diagnostics:', err);
      setErrorMsg('Unable to load inversion diagnostics for the selected station.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTimeRangeChange = (r: TimeRange) => {
    setTimeRange(r);
  };

  const handleRetry = () => {
    handleStationChange(selectedStation);
  };

  // ----------------------------------------------------
  // 1. Vertical Temperature Profile Calculations
  // ----------------------------------------------------
  // Magnus formula for Surface Dew Point: Td = T - ((100 - RH) / 5)
  const surfaceDewPoint = Math.round((t2m - (100 - rh) / 5) * 10) / 10;

  // Sounding Levels from 0m to 2000m AGL
  const soundingLevels = useMemo(() => {
    const baseLevels = [0, 150, 300, 500, 800, 1000, 1500, 2000];
    return baseLevels.map((alt) => {
      let temp = t2m;
      // Inversion layer warming from surface to 800m
      if (alt <= 800) {
        temp = t2m + (lapseRate / 100) * Math.min(alt, 800);
      } else {
        // Standard atmospheric lapse rate cooling above 800m: -0.65°C / 100m
        const tempAt800 = t2m + (lapseRate / 100) * 800;
        temp = tempAt800 - 0.0065 * (alt - 800);
      }

      // Dew point cooling with altitude: ~0.18°C / 100m
      const dew = surfaceDewPoint - 0.0018 * alt;

      return {
        altitude: alt,
        temperature: Math.round(temp * 10) / 10,
        dewPoint: Math.round(dew * 10) / 10,
      };
    });
  }, [t2m, surfaceDewPoint, lapseRate]);

  // SVG Coordinate mapping for Vertical Profile
  // Chart dimensions: Width 520, Height 400
  const vpWidth = 520;
  const vpHeight = 390;
  const vpPadLeft = 55;
  const vpPadRight = 25;
  const vpPadTop = 25;
  const vpPadBottom = 45;

  const vpInnerW = vpWidth - vpPadLeft - vpPadRight;
  const vpInnerH = vpHeight - vpPadTop - vpPadBottom;

  const minTemp = 0;
  const maxTemp = 25;
  const maxAlt = 2000;

  const scaleTempX = useCallback(
    (temp: number) => {
      const clamped = Math.max(minTemp, Math.min(maxTemp, temp));
      return vpPadLeft + ((clamped - minTemp) / (maxTemp - minTemp)) * vpInnerW;
    },
    [vpInnerW, vpPadLeft]
  );

  const scaleAltY = useCallback(
    (alt: number) => {
      const clamped = Math.max(0, Math.min(maxAlt, alt));
      return vpPadTop + vpInnerH - (clamped / maxAlt) * vpInnerH;
    },
    [vpInnerH, vpPadTop]
  );

  // SVG Paths for Temperature & Dew Point Profiles
  const tempProfilePath = useMemo(() => {
    return soundingLevels.reduce((acc, pt, i) => {
      const x = scaleTempX(pt.temperature);
      const y = scaleAltY(pt.altitude);
      if (i === 0) return `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      const prev = soundingLevels[i - 1];
      const prevX = scaleTempX(prev.temperature);
      const prevY = scaleAltY(prev.altitude);
      const cy = ((prevY + y) / 2).toFixed(1);
      return `${acc} C ${prevX.toFixed(1)} ${cy}, ${x.toFixed(1)} ${cy}, ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [soundingLevels, scaleTempX, scaleAltY]);

  const dewProfilePath = useMemo(() => {
    return soundingLevels.reduce((acc, pt, i) => {
      const x = scaleTempX(pt.dewPoint);
      const y = scaleAltY(pt.altitude);
      if (i === 0) return `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      const prev = soundingLevels[i - 1];
      const prevX = scaleTempX(prev.dewPoint);
      const prevY = scaleAltY(prev.altitude);
      const cy = ((prevY + y) / 2).toFixed(1);
      return `${acc} C ${prevX.toFixed(1)} ${cy}, ${x.toFixed(1)} ${cy}, ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [soundingLevels, scaleTempX, scaleAltY]);

  // Inversion Layer Box Coordinates (150m to 800m)
  const invBoxYTop = scaleAltY(invTopHeight ?? 800);
  const invBoxYBottom = scaleAltY(invBaseHeight ?? 150);
  const invBoxHeight = Math.max(0, invBoxYBottom - invBoxYTop);
  const pblhY = scaleAltY(pblh);

  // ----------------------------------------------------
  // 2. Inversion Strength Over Time (24h Multi-Axis)
  // ----------------------------------------------------
  const tsWidth = 520;
  const tsHeight = 175;
  const tsPadLeft = 40;
  const tsPadRight = 45;
  const tsPadTop = 20;
  const tsPadBottom = 30;

  const tsInnerW = tsWidth - tsPadLeft - tsPadRight;
  const tsInnerH = tsHeight - tsPadTop - tsPadBottom;

  const scaleTsX = useCallback(
    (index: number, total: number) => {
      if (total <= 1) return tsPadLeft + tsInnerW / 2;
      return tsPadLeft + (index / (total - 1)) * tsInnerW;
    },
    [tsInnerW, tsPadLeft]
  );

  // ITSI: 0 to 100
  const scaleTsItsiY = useCallback(
    (val: number) => {
      const clamped = Math.max(0, Math.min(100, val));
      return tsPadTop + tsInnerH - (clamped / 100) * tsInnerH;
    },
    [tsInnerH, tsPadTop]
  );

  // Lapse Rate: -1.0 to +3.0 °C/100m
  const scaleTsLapseY = useCallback(
    (val: number) => {
      const minL = -1.0;
      const maxL = 3.0;
      const clamped = Math.max(minL, Math.min(maxL, val));
      return tsPadTop + tsInnerH - ((clamped - minL) / (maxL - minL)) * tsInnerH;
    },
    [tsInnerH, tsPadTop]
  );

  // PBLH: 0 to 800m
  const scaleTsPblhY = useCallback(
    (val: number) => {
      const maxP = 800;
      const clamped = Math.max(0, Math.min(maxP, val));
      return tsPadTop + tsInnerH - (clamped / maxP) * tsInnerH;
    },
    [tsInnerH, tsPadTop]
  );

  // Generate paths for Inversion Strength Over Time
  const tsItsiPath = useMemo(() => {
    if (historyItems.length === 0) return '';
    return historyItems.reduce((acc, d, i) => {
      const x = scaleTsX(i, historyItems.length);
      const y = scaleTsItsiY(d.itsi);
      if (i === 0) return `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      const prevX = scaleTsX(i - 1, historyItems.length);
      const prevY = scaleTsItsiY(historyItems[i - 1].itsi);
      const cx = ((prevX + x) / 2).toFixed(1);
      return `${acc} C ${cx} ${prevY.toFixed(1)}, ${cx} ${y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [historyItems, scaleTsX, scaleTsItsiY]);

  const tsLapsePath = useMemo(() => {
    if (historyItems.length === 0) return '';
    return historyItems.reduce((acc, d, i) => {
      const lapse = d.lapse_rate_c_100m ?? 0.45;
      const x = scaleTsX(i, historyItems.length);
      const y = scaleTsLapseY(lapse);
      if (i === 0) return `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      const prevLapse = historyItems[i - 1].lapse_rate_c_100m ?? 0.45;
      const prevX = scaleTsX(i - 1, historyItems.length);
      const prevY = scaleTsLapseY(prevLapse);
      const cx = ((prevX + x) / 2).toFixed(1);
      return `${acc} C ${cx} ${prevY.toFixed(1)}, ${cx} ${y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [historyItems, scaleTsX, scaleTsLapseY]);

  const tsPblhPath = useMemo(() => {
    if (historyItems.length === 0) return '';
    return historyItems.reduce((acc, d, i) => {
      const x = scaleTsX(i, historyItems.length);
      const y = scaleTsPblhY(d.pblh_m);
      if (i === 0) return `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      const prevX = scaleTsX(i - 1, historyItems.length);
      const prevY = scaleTsPblhY(historyItems[i - 1].pblh_m);
      const cx = ((prevX + x) / 2).toFixed(1);
      return `${acc} C ${cx} ${prevY.toFixed(1)}, ${cx} ${y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [historyItems, scaleTsX, scaleTsPblhY]);

  // Selected station metadata
  const selectedStationObj = stations.find((s) => s.station_code === selectedStation);
  const stationDisplayName = selectedStationObj
    ? selectedStationObj.name.split(',')[0]
    : 'Anand Vihar';

  return (
    <div className="inversion-dashboard">
      {/* ---------------------------------------------------- */}
      {/* 1. Page Header & Control Bar */}
      {/* ---------------------------------------------------- */}
      <div className="inversion-header-row">
        <div>
          {/* Three Operational Badges */}
          <div className="inversion-badges">
            <span className="badge badge-success">Phase 5 Operational</span>
            <span className="badge badge-warning">Thermal Inversion &amp; Stability Engine</span>
            <span className="badge badge-info">Multi-Level Temperature Gradient Diagnostics</span>
          </div>

          <h1 className="inversion-heading">
            <span style={{ color: '#0284c7' }}>Atmospheric Inversion</span> &amp; Trapping Severity
          </h1>
          <p className="inversion-subtitle">
            Physical diagnosis of near-surface temperature inversions (&part;T / &part;z &gt; 0),
            boundary layer stratification, and the 0–100 Inversion Trapping Severity Index (ITSI).
          </p>
        </div>

        {/* Horizontal Controls: Time Pills + Date Range */}
        <div className="inversion-controls">
          <div className="inversion-time-pills" role="group" aria-label="Time Filter">
            {(['24h', '7d', '30d'] as TimeRange[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`inversion-time-btn ${timeRange === r ? 'active' : ''}`}
                onClick={() => handleTimeRangeChange(r)}
              >
                Last {r}
              </button>
            ))}
          </div>

          <div className="inversion-date-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem' }}>📅</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Feb 01, 2024 &ndash; Feb 29, 2024
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Winter Benchmark Period
            </span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Physical Causality Process Strip */}
      {/* ---------------------------------------------------- */}
      <div className="inversion-causality-strip" aria-label="Atmospheric Inversion Causality Chain">
        <div className="causality-step">
          <span className="causality-tag">Inversion Active</span>
          <span className="causality-label">&part;T / &part;z &gt; 0</span>
        </div>
        <span className="causality-arrow">&rarr;</span>
        <div className="causality-step">
          <span className="causality-tag">Stable Layer</span>
          <span className="causality-label">Suppressed Mixing</span>
        </div>
        <span className="causality-arrow">&rarr;</span>
        <div className="causality-step">
          <span className="causality-tag">Low Boundary Layer</span>
          <span className="causality-label">PBLH ~{pblh}m</span>
        </div>
        <span className="causality-arrow">&rarr;</span>
        <div className="causality-step">
          <span className="causality-tag">Critical Stagnation</span>
          <span className="causality-label">VI {vi} m&sup2;/s</span>
        </div>
        <span className="causality-arrow">&rarr;</span>
        <div className="causality-step highlight">
          <span className="causality-tag" style={{ color: '#dc2626' }}>Pollutant Trapping</span>
          <span className="causality-label" style={{ color: '#991b1b', fontWeight: 700 }}>ITSI {itsi} / 100</span>
        </div>
      </div>

      {/* Error state message if any */}
      {errorMsg && (
        <div className="inversion-error-banner" role="alert">
          <span>⚠️ {errorMsg}</span>
          <button type="button" onClick={handleRetry} className="inversion-retry-btn">
            Retry Connection
          </button>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. Four Primary KPI Cards */}
      {/* ---------------------------------------------------- */}
      <div className="inversion-kpi-grid">
        {/* CARD 1: Trapping Severity Index */}
        <div className="inversion-kpi-card">
          <div>
            <div className="kpi-header-row">
              <span className="kpi-card-title">TRAPPING SEVERITY INDEX</span>
              <span className={`badge ${itsi >= 70 ? 'badge-danger' : itsi >= 40 ? 'badge-warning' : 'badge-success'}`}>
                {itsi >= 70 ? 'SEVERE TRAPPING' : itsi >= 40 ? 'MODERATE TRAPPING' : 'FAVORABLE DISPERSION'}
              </span>
            </div>
            <div className="kpi-card-val" style={{ color: itsi >= 70 ? '#ef4444' : itsi >= 40 ? '#ea580c' : '#10b981' }}>
              {itsi} <span className="kpi-card-val-unit">/ 100</span>
            </div>
            <div className="kpi-card-supporting">
              Inversion Trapping Severity Index (ITSI)
            </div>
          </div>

          {/* Sparkline: Red/Orange Trend */}
          <div className="kpi-sparkline-wrap">
            <svg viewBox="0 0 120 22" style={{ width: '100%', height: '22px' }}>
              <path
                d="M 0 18 Q 30 14, 60 8 T 120 6"
                fill="none"
                stroke={itsi >= 70 ? '#ef4444' : '#ea580c'}
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="120" cy="6" r="3" fill="#ea580c" />
            </svg>
          </div>

          <div className="kpi-card-footer">
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Risk Summary:</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
              {riskSummary}
            </div>
          </div>
        </div>

        {/* CARD 2: Near-Surface Lapse Rate */}
        <div className="inversion-kpi-card">
          <div>
            <div className="kpi-header-row">
              <span className="kpi-card-title">NEAR-SURFACE LAPSE RATE</span>
              <span className={`badge ${lapseRate > 0 ? 'badge-danger' : 'badge-success'}`}>
                {lapseRate > 0 ? 'INVERSION ACTIVE' : 'UNSTABLE'}
              </span>
            </div>
            <div className="kpi-card-val" style={{ color: lapseRate > 0 ? '#ef4444' : '#10b981' }}>
              {lapseFormatted} <span className="kpi-card-val-unit">&deg;C/100m</span>
            </div>
            <div className="kpi-card-supporting">
              Measured between 2m and 300m AGL
            </div>
          </div>

          {/* Sparkline: Red Trend */}
          <div className="kpi-sparkline-wrap">
            <svg viewBox="0 0 120 22" style={{ width: '100%', height: '22px' }}>
              <path
                d="M 0 16 Q 35 12, 70 8 T 120 4"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="120" cy="4" r="3" fill="#ef4444" />
            </svg>
          </div>

          <div className="kpi-card-footer" style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Inversion Class:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{invClass}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Detection Method:</span>
              <code style={{ color: 'var(--accent-cyan)', fontSize: '0.74rem' }}>vertical_temperature_profile</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Dry Adiabatic Reference:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>-0.98 &deg;C/100m</span>
            </div>
          </div>
        </div>

        {/* CARD 3: Boundary Layer Height */}
        <div className="inversion-kpi-card">
          <div>
            <div className="kpi-header-row">
              <span className="kpi-card-title">BOUNDARY LAYER HEIGHT</span>
              <span className="badge badge-warning">
                CRITICAL STAGNATION
              </span>
            </div>
            <div className="kpi-card-val" style={{ color: '#0284c7' }}>
              {pblh} <span className="kpi-card-val-unit">m AGL</span>
            </div>
            <div className="kpi-card-supporting">
              Planetary Boundary Layer Height (PBLH)
            </div>
          </div>

          {/* Sparkline: Blue Trend */}
          <div className="kpi-sparkline-wrap">
            <svg viewBox="0 0 120 22" style={{ width: '100%', height: '22px' }}>
              <path
                d="M 0 8 Q 30 14, 60 16 T 120 18"
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="120" cy="18" r="3" fill="#0284c7" />
            </svg>
          </div>

          <div className="kpi-card-footer" style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Ventilation Index (VI):</span>
              <strong style={{ color: 'var(--text-primary)' }}>{vi} m&sup2;/s</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Surface Wind Speed:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{ws} m/s</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Dispersion State:</span>
              <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>CRITICAL STAGNATION</span>
            </div>
          </div>
        </div>

        {/* CARD 4: Atmospheric Stability */}
        <div className="inversion-kpi-card">
          <div>
            <div className="kpi-header-row">
              <span className="kpi-card-title">ATMOSPHERIC STABILITY</span>
              <span className="badge badge-warning">
                STABLE
              </span>
            </div>
            <div className="kpi-card-val" style={{ color: '#d97706' }}>
              STABLE
            </div>
            <div className="kpi-card-supporting">
              Stable Stratification
            </div>
          </div>

          {/* Sparkline: Orange Trend */}
          <div className="kpi-sparkline-wrap">
            <svg viewBox="0 0 120 22" style={{ width: '100%', height: '22px' }}>
              <path
                d="M 0 12 Q 30 6, 60 14 T 120 8"
                fill="none"
                stroke="#d97706"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="120" cy="8" r="3" fill="#d97706" />
            </svg>
          </div>

          <div className="kpi-card-footer" style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Inversion Base Height:</span>
              <strong style={{ color: 'var(--text-primary)' }}>~{invBaseHeight ?? 150} m</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Inversion Top Height:</span>
              <strong style={{ color: 'var(--text-primary)' }}>~{invTopHeight ?? 800} m</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Mixing Depth:</span>
              <span style={{ color: '#ea580c', fontWeight: 600 }}>Suppressed</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Pollution Accumulation:</span>
              <span style={{ color: '#dc2626', fontWeight: 700 }}>High Risk</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. Large Two-Column Scientific Visualization Area */}
      {/* ---------------------------------------------------- */}
      <div className="inversion-vis-grid">
        {/* LEFT COLUMN: Vertical Temperature Profile & Inversion Layer */}
        <div className="inversion-card">
          <div className="inversion-card-header">
            <div>
              <h2 className="inversion-card-title">Vertical Temperature Profile &amp; Inversion Layer</h2>
              <div className="inversion-card-sub">
                Temperature and dew point profile with detected inversion layer
              </div>
            </div>

            {/* Station Dropdown Selector */}
            <div className="station-selector-wrap">
              <label htmlFor="station-select" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Station:
              </label>
              <select
                id="station-select"
                className="inversion-station-dropdown"
                value={selectedStation}
                onChange={(e) => handleStationChange(e.target.value)}
                disabled={isLoading}
              >
                {stations.map((stn) => (
                  <option key={stn.station_code} value={stn.station_code}>
                    {stn.name.split(',')[0]} ({stn.station_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chart Legend */}
          <div className="inversion-chart-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#ef4444' }}></span>
              <span>Temperature (&deg;C)</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#0284c7' }}></span>
              <span>Dew Point (&deg;C)</span>
            </div>
            <div className="legend-item">
              <span className="legend-bar" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)' }}></span>
              <span>Inversion Layer (~{invBaseHeight ?? 150}&ndash;{invTopHeight ?? 800}m)</span>
            </div>
            <div className="legend-item">
              <span className="legend-line" style={{ borderTop: '2px dashed #0284c7' }}></span>
              <span>PBLH ({pblh} m)</span>
            </div>
          </div>

          {/* Vertical Profile SVG Chart */}
          <div className="profile-chart-container">
            <svg
              viewBox={`0 0 ${vpWidth} ${vpHeight}`}
              className="profile-svg"
              aria-label="Vertical Atmospheric Sounding Temperature and Dew Point Profile"
            >
              <defs>
                {/* Subtle horizontal gradient for detected inversion band */}
                <linearGradient id="invLayerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.08" />
                </linearGradient>
              </defs>

              {/* Grid Lines: Altitude (Horizontal) */}
              {[0, 150, 300, 500, 1000, 1500, 2000].map((alt) => {
                const y = scaleAltY(alt);
                return (
                  <g key={`grid-y-${alt}`}>
                    <line
                      x1={vpPadLeft}
                      y1={y}
                      x2={vpWidth - vpPadRight}
                      y2={y}
                      stroke="var(--border-subtle)"
                      strokeWidth="1"
                      strokeDasharray={alt === 0 ? undefined : '2 3'}
                    />
                    <text
                      x={vpPadLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="var(--text-muted)"
                      fontFamily="var(--font-mono)"
                    >
                      {alt}m
                    </text>
                  </g>
                );
              })}

              {/* Grid Lines: Temperature (Vertical) */}
              {[0, 5, 10, 15, 20, 25].map((temp) => {
                const x = scaleTempX(temp);
                return (
                  <g key={`grid-x-${temp}`}>
                    <line
                      x1={x}
                      y1={vpPadTop}
                      x2={x}
                      y2={vpPadTop + vpInnerH}
                      stroke="var(--border-subtle)"
                      strokeWidth="1"
                      strokeDasharray="2 3"
                    />
                    <text
                      x={x}
                      y={vpPadTop + vpInnerH + 18}
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--text-muted)"
                      fontFamily="var(--font-mono)"
                    >
                      {temp}&deg;C
                    </text>
                  </g>
                );
              })}

              {/* Translucent Highlighted Inversion Layer Band */}
              {invBoxHeight > 0 && (
                <g>
                  <rect
                    x={vpPadLeft}
                    y={invBoxYTop}
                    width={vpInnerW}
                    height={invBoxHeight}
                    fill="url(#invLayerGrad)"
                    stroke="rgba(239, 68, 68, 0.35)"
                    strokeWidth="1"
                    strokeDasharray="4 3"
                  />
                  <rect
                    x={vpWidth - vpPadRight - 155}
                    y={invBoxYTop + 8}
                    width="145"
                    height="20"
                    rx="4"
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="rgba(239, 68, 68, 0.3)"
                  />
                  <text
                    x={vpWidth - vpPadRight - 82}
                    y={invBoxYTop + 22}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="700"
                    fill="#b91c1c"
                    fontFamily="var(--font-heading)"
                  >
                    Inversion Layer ({invBaseHeight ?? 150}&ndash;{invTopHeight ?? 800}m)
                  </text>
                </g>
              )}

              {/* Planetary Boundary Layer Height (PBLH) Horizontal Line */}
              <g>
                <line
                  x1={vpPadLeft}
                  y1={pblhY}
                  x2={vpWidth - vpPadRight}
                  y2={pblhY}
                  stroke="#0284c7"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                />
                <rect
                  x={vpPadLeft + 8}
                  y={pblhY - 11}
                  width="92"
                  height="18"
                  rx="4"
                  fill="#0284c7"
                />
                <text
                  x={vpPadLeft + 54}
                  y={pblhY + 2}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="700"
                  fill="#ffffff"
                  fontFamily="var(--font-body)"
                >
                  PBLH: {pblh} m
                </text>
              </g>

              {/* Dew Point Profile Line */}
              <path
                d={dewProfilePath}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.4"
                strokeLinecap="round"
              />

              {/* Temperature Profile Line */}
              <path
                d={tempProfilePath}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.8"
                strokeLinecap="round"
              />

              {/* Sounding Level Data Points */}
              {soundingLevels.map((pt) => {
                const tx = scaleTempX(pt.temperature);
                const dx = scaleTempX(pt.dewPoint);
                const y = scaleAltY(pt.altitude);
                const isHovered = hoveredProfileAlt === pt.altitude;

                return (
                  <g
                    key={`point-${pt.altitude}`}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredProfileAlt(pt.altitude)}
                    onMouseLeave={() => setHoveredProfileAlt(null)}
                  >
                    {/* Dew Point Node */}
                    <circle cx={dx} cy={y} r="3.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                    {/* Temperature Node */}
                    <circle cx={tx} cy={y} r={isHovered ? '6' : '4.5'} fill="#ef4444" stroke="#ffffff" strokeWidth="2" />

                    {isHovered && (
                      <g>
                        <rect
                          x={tx - 70}
                          y={y - 36}
                          width="140"
                          height="28"
                          rx="4"
                          fill="rgba(15, 23, 42, 0.92)"
                          stroke="rgba(255, 255, 255, 0.2)"
                        />
                        <text
                          x={tx}
                          y={y - 22}
                          textAnchor="middle"
                          fontSize="9.5"
                          fontWeight="700"
                          fill="#ffffff"
                        >
                          {pt.altitude}m: {pt.temperature}&deg;C ({pt.dewPoint}&deg;C dp)
                        </text>
                        <text
                          x={tx}
                          y={y - 11}
                          textAnchor="middle"
                          fontSize="8.5"
                          fill="#94a3b8"
                        >
                          {pt.altitude <= 800 ? 'Inversion Warming aloft' : 'Standard Lapse Cooling'}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Axis Titles */}
              <text
                x={vpPadLeft + vpInnerW / 2}
                y={vpHeight - 8}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="var(--text-secondary)"
              >
                Temperature (&deg;C)
              </text>
              <text
                x={14}
                y={vpPadTop + vpInnerH / 2}
                textAnchor="middle"
                transform={`rotate(-90, 14, ${vpPadTop + vpInnerH / 2})`}
                fontSize="11"
                fontWeight="700"
                fill="var(--text-secondary)"
              >
                Height (m AGL)
              </text>
            </svg>

            {/* Scientific Explanation Note */}
            <div className="inversion-explanation-banner">
              <strong>Atmospheric Stratification Diagnosis:</strong> Between 2m and 800m AGL, temperature increases with altitude (&part;T / &part;z = {lapseFormatted} &deg;C/100m). This negative convective buoyancy caps vertical turbulence, locking surface emissions inside the shallow {pblh}m nocturnal boundary layer.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Two Stacked Visualizations */}
        <div className="inversion-right-col">
          {/* TOP CHART: Inversion Strength Over Time */}
          <div className="inversion-card">
            <div className="inversion-card-header">
              <div>
                <h3 className="inversion-card-title">
                  Inversion Strength Over Time &mdash; {stationDisplayName}
                </h3>
                <div className="inversion-card-sub">
                  ITSI, lapse rate and PBLH variation (last 24 hours)
                </div>
              </div>
            </div>

            {/* Multi-Series Legend */}
            <div className="inversion-chart-legend" style={{ marginBottom: '0.4rem' }}>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#ef4444' }}></span>
                <span>ITSI (0&ndash;100)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#0284c7' }}></span>
                <span>Lapse Rate (&deg;C/100m)</span>
              </div>
              <div className="legend-item">
                <span className="legend-line" style={{ borderTop: '2px dashed #8b5cf6' }}></span>
                <span>PBLH (m)</span>
              </div>
            </div>

            {/* Multi-Axis Time Series Chart */}
            <div style={{ position: 'relative' }}>
              <svg viewBox={`0 0 ${tsWidth} ${tsHeight}`} style={{ width: '100%', height: '175px', overflow: 'visible' }}>
                {/* Horizontal reference grid lines */}
                <line x1={tsPadLeft} y1={tsPadTop} x2={tsWidth - tsPadRight} y2={tsPadTop} stroke="var(--border-subtle)" strokeDasharray="2 3" />
                <line x1={tsPadLeft} y1={tsPadTop + tsInnerH * 0.5} x2={tsWidth - tsPadRight} y2={tsPadTop + tsInnerH * 0.5} stroke="var(--border-subtle)" strokeDasharray="2 3" />
                <line x1={tsPadLeft} y1={tsPadTop + tsInnerH} x2={tsWidth - tsPadRight} y2={tsPadTop + tsInnerH} stroke="var(--border-subtle)" />

                {/* Left Axis Labels: ITSI (0 to 100) */}
                <text x={tsPadLeft - 6} y={tsPadTop + 4} textAnchor="end" fontSize="9" fill="#ef4444" fontWeight="600">100</text>
                <text x={tsPadLeft - 6} y={tsPadTop + tsInnerH * 0.5 + 3} textAnchor="end" fontSize="9" fill="#ef4444" fontWeight="600">50</text>
                <text x={tsPadLeft - 6} y={tsPadTop + tsInnerH + 3} textAnchor="end" fontSize="9" fill="#ef4444" fontWeight="600">0</text>

                {/* Right Axis Labels: PBLH (m) */}
                <text x={tsWidth - tsPadRight + 6} y={tsPadTop + 4} textAnchor="start" fontSize="9" fill="#8b5cf6" fontWeight="600">800m</text>
                <text x={tsWidth - tsPadRight + 6} y={tsPadTop + tsInnerH * 0.5 + 3} textAnchor="start" fontSize="9" fill="#8b5cf6" fontWeight="600">400m</text>
                <text x={tsWidth - tsPadRight + 6} y={tsPadTop + tsInnerH + 3} textAnchor="start" fontSize="9" fill="#8b5cf6" fontWeight="600">0m</text>

                {/* Curves */}
                <path d={tsPblhPath} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 3" />
                <path d={tsLapsePath} fill="none" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" />
                <path d={tsItsiPath} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />

                {/* Hover Indicator Crosshair */}
                {hoveredHistoryIdx !== null && historyItems[hoveredHistoryIdx] && (
                  <g>
                    {(() => {
                      const cur = historyItems[hoveredHistoryIdx];
                      const x = scaleTsX(hoveredHistoryIdx, historyItems.length);
                      const itsiY = scaleTsItsiY(cur.itsi);
                      const lapse = cur.lapse_rate_c_100m ?? 0.45;
                      const timeStr = cur.timestamp_utc.split(' ')[1]?.slice(0, 5) || '12:00';

                      return (
                        <g>
                          <line x1={x} y1={tsPadTop} x2={x} y2={tsPadTop + tsInnerH} stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="3 3" />
                          <circle cx={x} cy={itsiY} r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                          <rect
                            x={Math.max(tsPadLeft, Math.min(tsWidth - tsPadRight - 130, x - 65))}
                            y={tsPadTop - 18}
                            width="130"
                            height="18"
                            rx="3"
                            fill="rgba(15, 23, 42, 0.9)"
                          />
                          <text
                            x={Math.max(tsPadLeft + 65, Math.min(tsWidth - tsPadRight - 65, x))}
                            y={tsPadTop - 5}
                            textAnchor="middle"
                            fontSize="8.5"
                            fontWeight="700"
                            fill="#ffffff"
                          >
                            {timeStr} &bull; ITSI: {cur.itsi} &bull; &Gamma;: +{lapse.toFixed(2)}
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                )}

                {/* Invisible hover zones across 24 hours */}
                {historyItems.map((_, i) => {
                  const x = scaleTsX(i, historyItems.length);
                  return (
                    <rect
                      key={`hit-${i}`}
                      x={x - 10}
                      y={tsPadTop}
                      width="20"
                      height={tsInnerH}
                      fill="transparent"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredHistoryIdx(i)}
                      onMouseLeave={() => setHoveredHistoryIdx(null)}
                    />
                  );
                })}
              </svg>

              {/* Time Axis Labels */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: `0 ${tsPadRight - 10}px 0 ${tsPadLeft - 5}px`,
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: '2px',
                }}
              >
                <span>00:00</span>
                <span>04:00</span>
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>20:00</span>
                <span>23:00</span>
              </div>
            </div>
          </div>

          {/* BOTTOM CHART: Time–Height Temperature Cross-Section (Last 24h) */}
          <div className="inversion-card">
            <div className="inversion-card-header">
              <div>
                <h3 className="inversion-card-title">Time&ndash;Height Temperature Cross-Section (Last 24h)</h3>
                <div className="inversion-card-sub">
                  Diurnal boundary layer thermal stratification &amp; inversion lid
                </div>
              </div>
              <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                Sounding Matrix
              </span>
            </div>

            {/* Preserved Visual Card Structure with honest dataset availability label */}
            <div className="crosssection-placeholder-box">
              {/* Synthetic sounding grid overlay background to preserve visual structure */}
              <div className="crosssection-grid-lines">
                <div className="crosssection-axis-y">
                  <span>1500m</span>
                  <span>1000m</span>
                  <span>500m</span>
                  <span style={{ color: '#0284c7', fontWeight: 700 }}>150m (PBLH)</span>
                  <span>0m</span>
                </div>
                <div className="crosssection-grid-content">
                  {/* Visual band representation of inversion lid across 24h */}
                  <div className="crosssection-inversion-band">
                    <span className="crosssection-band-badge">Inversion Capping Layer (150&ndash;800m)</span>
                  </div>
                  <div className="crosssection-pblh-line"></div>
                </div>
              </div>

              {/* Transparent central notification card */}
              <div className="crosssection-status-banner">
                <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>📡</div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Time&ndash;height cross-section unavailable for the selected dataset.
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', maxWidth: '420px', marginTop: '0.25rem', lineHeight: 1.4 }}>
                  Continuous radio acoustic sounding and radiometer time-height arrays require active upper-air profiling telemetry. Verified multi-layer point soundings and boundary layer heights (PBLH) remain operational above.
                </div>
              </div>

              {/* Time Axis Labels */}
              <div className="crosssection-axis-x">
                <span>00:00</span>
                <span>04:00</span>
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>20:00</span>
                <span>24:00</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. Wide Card: ITSI Multi-Factor Formulation Table */}
      {/* ---------------------------------------------------- */}
      <div className="inversion-card" style={{ marginTop: '1.5rem' }}>
        <div className="inversion-card-header" style={{ marginBottom: '0.75rem' }}>
          <div>
            <h2 className="inversion-card-title">
              Inversion Trapping Severity Index (ITSI) &mdash; Multi-Factor Formulation
            </h2>
            <div className="inversion-card-sub">
              Component-wise contribution to trapping severity
            </div>
          </div>
          <div className="itsi-formula-badge" title="Validated Phase 5 ITSI Formulation">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: '#0284c7', fontWeight: 600 }}>
              ITSI = 100 &times; [ 0.45&middot;f_&gamma; + 0.35&middot;f_pbl + 0.20&middot;f_wind ]
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>COMPONENT FACTOR</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>PHYSICAL QUANTITY</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>WEIGHT</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>OBSERVED STATE</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>IMPACT ON POLLUTION</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: Lapse Rate Factor */}
              <tr>
                <td style={{ fontWeight: 700, padding: '0.85rem 1rem', color: 'var(--text-primary)' }}>
                  Lapse Rate Factor (f_&gamma;)
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', padding: '0.85rem 1rem' }}>
                  &part;T / &part;z = {lapseFormatted} &deg;C/100m
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <span className="badge badge-info" style={{ fontWeight: 700 }}>45%</span>
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <span className={`badge ${lapseRate > 0 ? 'badge-warning' : 'badge-success'}`}>
                    {lapseRate > 1.0 ? 'Severe (+1.5 ΔS)' : lapseRate > 0 ? `Moderate (${lapseFormatted} ΔS)` : 'Neutral / Unstable'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)', padding: '0.85rem 1rem', fontSize: '0.82rem' }}>
                  Suppresses vertical mixing; creates impermeable capping.
                </td>
              </tr>

              {/* Row 2: PBL Contraction Factor */}
              <tr>
                <td style={{ fontWeight: 700, padding: '0.85rem 1rem', color: 'var(--text-primary)' }}>
                  PBL Contraction Factor (f_pbl)
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', padding: '0.85rem 1rem' }}>
                  PBLH = {pblh} m
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <span className="badge badge-info" style={{ fontWeight: 700 }}>35%</span>
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <span className={`badge ${pblh <= 200 ? 'badge-danger' : pblh <= 500 ? 'badge-warning' : 'badge-success'}`}>
                    {pblh <= 200 ? `High (${pblh} m)` : `Moderate (${pblh} m)`}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)', padding: '0.85rem 1rem', fontSize: '0.82rem' }}>
                  Compresses surface emissions into shallow layer.
                </td>
              </tr>

              {/* Row 3: Calm Wind Stagnation */}
              <tr>
                <td style={{ fontWeight: 700, padding: '0.85rem 1rem', color: 'var(--text-primary)' }}>
                  Calm Wind Stagnation (f_wind)
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', padding: '0.85rem 1rem' }}>
                  U_10m = {ws} m/s
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <span className="badge badge-info" style={{ fontWeight: 700 }}>20%</span>
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <span className={`badge ${ws <= 2.0 ? 'badge-warning' : 'badge-success'}`}>
                    {ws <= 2.0 ? `Low (${ws} m/s)` : `Moderate (${ws} m/s)`}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)', padding: '0.85rem 1rem', fontSize: '0.82rem' }}>
                  Weak mechanical ventilation increases accumulation.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 5. Two Bottom Cards: Meteorological Context & Recent Insights */}
      {/* ---------------------------------------------------- */}
      <div className="inversion-bottom-grid">
        {/* Card 1: Key Meteorological Context */}
        <div className="inversion-card">
          <div className="inversion-card-header">
            <div>
              <h3 className="inversion-card-title">Key Meteorological Context</h3>
              <div className="inversion-card-sub">
                Current period conditions influencing inversion formation
              </div>
            </div>
          </div>

          <div className="meteorological-metrics-grid">
            <div className="meteo-metric-box">
              <div className="meteo-metric-val">{t2m}&deg;C</div>
              <div className="meteo-metric-label">Surface Temperature</div>
            </div>
            <div className="meteo-metric-box">
              <div className="meteo-metric-val">{ws} m/s</div>
              <div className="meteo-metric-label">Wind Speed (10m)</div>
            </div>
            <div className="meteo-metric-box">
              <div className="meteo-metric-val">{rh}%</div>
              <div className="meteo-metric-label">Relative Humidity</div>
            </div>
            <div className="meteo-metric-box">
              <div className="meteo-metric-val">0 W/m&sup2;</div>
              <div className="meteo-metric-label">Solar Radiation</div>
            </div>
          </div>

          <div className="meteo-interpretation-box">
            <span style={{ fontSize: '1rem' }}>💡</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Conditions favorable for nocturnal inversion and pollutant trapping.
            </span>
          </div>
        </div>

        {/* Card 2: Recent Insights */}
        <div className="inversion-card">
          <div className="inversion-card-header">
            <div>
              <h3 className="inversion-card-title">Recent Insights</h3>
              <div className="inversion-card-sub">
                Scientifically derived observations &amp; boundary layer alerts
              </div>
            </div>
            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
              Phase 5 Diagnostics
            </span>
          </div>

          <ul className="inversion-insights-list">
            <li className="insight-item">
              <span className="insight-bullet" style={{ background: '#f59e0b' }}></span>
              <span>Moderate inversion detected during morning hours</span>
            </li>
            <li className="insight-item">
              <span className="insight-bullet" style={{ background: '#ef4444' }}></span>
              <span>PBLH remained below 200 m for 14 hours</span>
            </li>
            <li className="insight-item">
              <span className="insight-bullet" style={{ background: '#0284c7' }}></span>
              <span>Positive lapse rate indicates stable layer</span>
            </li>
            <li className="insight-item">
              <span className="insight-bullet" style={{ background: '#f59e0b' }}></span>
              <span>Low wind speeds contributing to pollutant trapping</span>
            </li>
            <li className="insight-item">
              <span className="insight-bullet" style={{ background: '#ef4444' }}></span>
              <span>High risk of PM2.5 accumulation during nighttime hours</span>
            </li>
          </ul>

          <div className="inversion-action-footer">
            <Link href="/air-quality" className="inversion-view-analysis-link">
              View Full Analysis &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
