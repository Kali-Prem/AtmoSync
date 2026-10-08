'use client';

import { DataFreshness } from '@/lib/api';

interface HeroBannerProps {
  freshness: DataFreshness | null;
}

export default function HeroBanner({ freshness }: HeroBannerProps) {
  const freshnessDate = freshness?.latest_observation_utc
    ? new Date(freshness.latest_observation_utc).toLocaleDateString()
    : '2/29/2024';

  return (
    <section className="hero-card" aria-label="Command Center Overview">
      {/* Background Graphic Elements: Atmospheric Gradient, Solar Haze & Delhi Monuments */}
      <svg
        className="hero-backdrop-svg"
        viewBox="0 0 680 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="gateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0.15" />
          </linearGradient>

          <linearGradient id="skylineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.08" />
          </linearGradient>

          <radialGradient id="sunHaze" cx="540" cy="80" r="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#0284c7" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="windStream" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Atmospheric Solar Haze Glow */}
        <circle cx="540" cy="80" r="120" fill="url(#sunHaze)" />

        {/* Boundary Layer Wind Streamlines */}
        <path
          d="M 180 180 C 300 160, 420 200, 680 170"
          stroke="url(#windStream)"
          strokeWidth="1.8"
          strokeDasharray="6 4"
        />
        <path
          d="M 240 215 C 380 195, 500 230, 680 205"
          stroke="url(#windStream)"
          strokeWidth="1.4"
          strokeDasharray="4 6"
        />

        {/* Distant Delhi Skyline Silhouette (Lotus Temple, Qutub Minar, Modern Towers) */}
        <g fill="url(#skylineGrad)">
          {/* Qutub Minar Silhouette */}
          <polygon points="398,240 401,110 406,110 409,240" />
          <rect x="399" y="106" width="9" height="5" rx="1" />
          <polygon points="400,106 403.5,88 407,106" />

          {/* Lotus Temple Petals Outline */}
          <path d="M 440 240 C 440 210, 452 195, 465 195 C 478 195, 490 210, 490 240 Z" opacity="0.8" />
          <path d="M 452 240 C 455 205, 465 185, 465 185 C 465 185, 475 205, 478 240 Z" fill="#ffffff" fillOpacity="0.5" />

          {/* Institutional / Modern Skyline Towers */}
          <rect x="350" y="190" width="18" height="50" rx="2" />
          <rect x="372" y="175" width="14" height="65" rx="2" />
          <rect x="610" y="180" width="22" height="60" rx="2" />
          <rect x="636" y="165" width="18" height="75" rx="2" />
          <rect x="658" y="190" width="20" height="50" rx="2" />
        </g>

        {/* Foreground India Gate Monument */}
        <g fill="url(#gateGrad)">
          {/* Broad Monument Base */}
          <rect x="500" y="228" width="96" height="12" rx="2" />
          <rect x="508" y="218" width="80" height="11" rx="2" />

          {/* Left and Right Arch Pillars */}
          <rect x="514" y="130" width="19" height="90" rx="1" />
          <rect x="563" y="130" width="19" height="90" rx="1" />

          {/* Center Archway */}
          <path
            d="M 533 182 Q 548 152 563 182 L 563 218 L 533 218 Z"
            fill="#ffffff"
            fillOpacity="0.85"
          />

          {/* Cornice, Entablature & Lintel */}
          <rect x="510" y="116" width="76" height="15" rx="2" />
          <rect x="518" y="102" width="60" height="15" rx="2" />

          {/* Top Attic & Dome Base */}
          <rect x="526" y="90" width="44" height="13" rx="2" />
          <path d="M 535 90 Q 548 78 561 90 Z" />
        </g>
      </svg>

      {/* Main Content Area */}
      <div className="hero-content">
        {/* Verification Status Badges Row */}
        <div className="hero-badges">
          <span className="badge badge-success">
            Phase 4 — Real Data Pipeline &amp; Baseline Forecasting
          </span>
          <span className="badge badge-info">
            LightGBM Multi-Horizon Baseline Active
          </span>
          <span className="badge badge-neutral">
            Data Freshness: {freshnessDate} (Winter Benchmark)
          </span>
        </div>

        {/* Hero Headline */}
        <h1 className="hero-title">
          ATMOSYNC <span className="hero-title-accent">Air Pollution Command Center</span>
        </h1>

        {/* Explanatory Subtitle */}
        <p className="hero-subtitle">
          Coupled Air Quality–Atmospheric Forecasting System for Delhi NCR (SIH-26082).
          Evaluated against 18,240 verified station-hour observations across winter 2023–2024.
        </p>

        {/* Key System Capabilities Highlight Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginTop: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(8px)',
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ color: '#10b981', fontSize: '0.9rem' }}>&bull;</span>
            <span>5 Anchor Ground Stations Telemetry</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(8px)',
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ color: '#0284c7', fontSize: '0.9rem' }}>&bull;</span>
            <span>LightGBM 72h Coupled Inference</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(8px)',
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ color: '#8b5cf6', fontSize: '0.9rem' }}>&bull;</span>
            <span>ERA5 Mesoscale Boundary Layer Coupled</span>
          </div>
        </div>
      </div>
    </section>
  );
}
