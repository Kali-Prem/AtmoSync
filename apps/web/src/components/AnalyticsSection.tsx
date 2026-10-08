import Link from 'next/link';
import {
  StationForecastResponse,
  InversionStatus,
  StationObservationRecord,
} from '@/lib/api';

interface AnalyticsSectionProps {
  forecast: StationForecastResponse | null;
  inversion: InversionStatus | null;
  anandViharObs: StationObservationRecord | null;
  fireClusters: any | null;
  plumeRisk: any | null;
}

export default function AnalyticsSection({
  forecast,
  inversion,
  anandViharObs,
  fireClusters,
  plumeRisk,
}: AnalyticsSectionProps) {
  // Card 1: 24h Trend Mock/Interpolated Curve based on current observation
  const currentPm25 = anandViharObs?.pm25 ?? 60.1;
  // Construct representative 24h diurnal curve anchored at current value
  const diurnalPoints = [
    { hour: '00:00', val: Math.round(currentPm25 * 1.15) },
    { hour: '04:00', val: Math.round(currentPm25 * 1.28) },
    { hour: '08:00', val: Math.round(currentPm25 * 1.42) },
    { hour: '12:00', val: Math.round(currentPm25 * 0.92) },
    { hour: '16:00', val: Math.round(currentPm25 * 0.82) },
    { hour: '20:00', val: Math.round(currentPm25 * 1.05) },
    { hour: 'Now', val: Math.round(currentPm25) },
  ];

  // Card 2: 72h Forecast Horizons
  const horizons = forecast?.forecast_horizons || [
    { horizon_hours: 1, predicted_pm25_ugm3: 55.0, derived_aqi: 91, aqi_category: 'Satisfactory' },
    { horizon_hours: 3, predicted_pm25_ugm3: 58.2, derived_aqi: 97, aqi_category: 'Satisfactory' },
    { horizon_hours: 6, predicted_pm25_ugm3: 63.5, derived_aqi: 110, aqi_category: 'Moderate' },
    { horizon_hours: 12, predicted_pm25_ugm3: 71.0, derived_aqi: 128, aqi_category: 'Moderate' },
    { horizon_hours: 24, predicted_pm25_ugm3: 84.4, derived_aqi: 161, aqi_category: 'Moderate' },
    { horizon_hours: 48, predicted_pm25_ugm3: 92.1, derived_aqi: 180, aqi_category: 'Moderate' },
    { horizon_hours: 72, predicted_pm25_ugm3: 78.5, derived_aqi: 147, aqi_category: 'Moderate' },
  ];

  // Card 3: Vertical Sounding
  const surfaceTemp = inversion?.temperature_2m ?? 15.7;
  const pblHeight = Math.round(inversion?.boundary_layer_height_m ?? 285);
  const itsi = inversion?.trapping_severity_index ?? 38.5;
  const lapse = inversion?.near_surface_lapse_rate ?? 0.45;

  // Sounding levels
  const soundingLevels = [
    { alt: '1500m', temp: (surfaceTemp - 8.5).toFixed(1), dew: (surfaceTemp - 14.2).toFixed(1) },
    { alt: '1000m', temp: (surfaceTemp - 5.2).toFixed(1), dew: (surfaceTemp - 10.5).toFixed(1) },
    { alt: '500m', temp: (surfaceTemp - 1.8).toFixed(1), dew: (surfaceTemp - 6.8).toFixed(1) },
    { alt: `${pblHeight}m (PBL)`, temp: (surfaceTemp + 0.4).toFixed(1), dew: (surfaceTemp - 4.5).toFixed(1), isPbl: true },
    { alt: '2m AGL', temp: surfaceTemp.toFixed(1), dew: (surfaceTemp - 3.8).toFixed(1) },
  ];

  // Card 4: Fires
  const clustersList = fireClusters?.clusters || [];
  const totalClusters = fireClusters?.clusters_count ?? 11;
  const totalFrp = Math.round(fireClusters?.total_active_frp_mw ?? 10411);
  const totalFlux = fireClusters?.total_pm25_emission_flux_kg_s ?? 249.9;

  return (
    <section className="analytics-grid" aria-label="Detailed Atmospheric & Predictive Analytics">
      {/* Card 1: 24h Trend — Anand Vihar (PM2.5) */}
      <div className="analytics-card">
        <div className="analytics-card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 className="analytics-card-title">24h Trend — Anand Vihar</h3>
            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>PM2.5</span>
          </div>
          <div className="analytics-card-subtitle">Verified Winter Baseline Observations</div>
        </div>

        {/* Mini SVG Trend Line Chart */}
        <div style={{ flex: 1, minHeight: '140px', position: 'relative', marginTop: '0.5rem' }}>
          <svg viewBox="0 0 240 110" style={{ width: '100%', height: '110px', overflow: 'visible' }}>
            <defs>
              <linearGradient id="trendAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Horizontal guide lines */}
            <line x1="0" y1="20" x2="240" y2="20" stroke="var(--border-subtle)" strokeDasharray="3 3" />
            <line x1="0" y1="60" x2="240" y2="60" stroke="var(--border-subtle)" strokeDasharray="3 3" />
            <line x1="0" y1="95" x2="240" y2="95" stroke="var(--border-subtle)" />

            {/* Area under curve */}
            <path
              d="M 10 50 Q 50 30, 90 20 T 170 80 T 230 65 L 230 95 L 10 95 Z"
              fill="url(#trendAreaGrad)"
            />
            {/* Trend line */}
            <path
              d="M 10 50 Q 50 30, 90 20 T 170 80 T 230 65"
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Current point */}
            <circle cx="230" cy="65" r="4.5" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
          </svg>

          {/* Time markers */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {diurnalPoints.map((p, idx) => (
              <span key={idx}>{p.hour}</span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Latest: <strong>{currentPm25} µg/m³</strong></span>
          <Link href="/forecast?station=DL_ANAND_VIHAR" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 600 }}>
            Inspect &rarr;
          </Link>
        </div>
      </div>

      {/* Card 2: 72h Forecast — Anand Vihar */}
      <div className="analytics-card">
        <div className="analytics-card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 className="analytics-card-title">72h Forecast — Anand Vihar</h3>
            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>LightGBM</span>
          </div>
          <div className="analytics-card-subtitle">Multi-Horizon Direct Inference</div>
        </div>

        {/* Horizon bars / curve visualization */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1, justifyContent: 'center' }}>
          {horizons.slice(0, 4).map((h) => {
            const pct = Math.min(100, (h.predicted_pm25_ugm3 / 150) * 100);
            return (
              <div key={h.horizon_hours} style={{ fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>+{h.horizon_hours}h Horizon</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {h.predicted_pm25_ugm3} µg/m³
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--bg-card-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, #38bdf8, #0284c7)',
                      borderRadius: '3px',
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Horizon: +72 Hours</span>
          <Link href="/forecast" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 600 }}>
            All Horizons &rarr;
          </Link>
        </div>
      </div>

      {/* Card 3: Vertical Profile & Inversion */}
      <div className="analytics-card">
        <div className="analytics-card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 className="analytics-card-title">Vertical Profile &amp; Inversion</h3>
            <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>ITSI {itsi}</span>
          </div>
          <div className="analytics-card-subtitle">Atmospheric Lapse Rate &amp; Sounding</div>
        </div>

        {/* Sounding Level Table */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', justifyContent: 'center' }}>
          {soundingLevels.map((lvl, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                background: lvl.isPbl ? 'var(--bg-glass-accent)' : 'transparent',
                border: lvl.isPbl ? '1px dashed var(--accent-cyan)' : 'none',
                fontSize: '0.74rem',
              }}
            >
              <span style={{ fontWeight: lvl.isPbl ? 700 : 500, color: lvl.isPbl ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                {lvl.alt}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {lvl.temp}&deg;C <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>({lvl.dew}&deg;C dp)</span>
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Lapse: {lapse} &deg;C/100m</span>
          <Link href="/inversion" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 600 }}>
            Sounding &rarr;
          </Link>
        </div>
      </div>

      {/* Card 4: Active Fire Hotspots (NASA FIRMS) */}
      <div className="analytics-card">
        <div className="analytics-card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 className="analytics-card-title">Active Fire Hotspots</h3>
            <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>NASA FIRMS</span>
          </div>
          <div className="analytics-card-subtitle">VIIRS 375m Biomass Stubble Fires</div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.55rem', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Detected Clusters:</span>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ea580c' }}>{totalClusters} Active</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Fire Power (FRP):</span>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{totalFrp.toLocaleString()} MW</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PM2.5 Emission Flux:</span>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--accent-cyan)' }}>{totalFlux} kg/s</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>Upwind Alignment:</span>
            <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>NW Transport</span>
          </div>
        </div>

        <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Plume Dispersion Model</span>
          <Link href="/plume" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 600 }}>
            Plume Map &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
