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
      {/* Subtle India Gate & Delhi Skyline Atmospheric Silhouette (5% visual effect, 95% clarity) */}
      <svg
        className="hero-backdrop-svg"
        viewBox="0 0 500 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="gateGrad" x1="250" y1="50" x2="250" y2="280" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0284c7" stopOpacity="0.45" />
            <stop stopColor="#2563eb" stopOpacity="0.08" />
          </linearGradient>
          <radialGradient id="sunGlow" cx="320" cy="90" r="120" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" stopOpacity="0.3" />
            <stop stopColor="#0284c7" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient atmospheric sun/haze glow */}
        <circle cx="320" cy="90" r="100" fill="url(#sunGlow)" />

        {/* Atmospheric inversion wave contours */}
        <path
          d="M0 240 C 120 220, 240 260, 500 230"
          stroke="#0284c7"
          strokeWidth="1.5"
          strokeOpacity="0.25"
          strokeDasharray="4 4"
        />
        <path
          d="M0 270 C 180 250, 320 280, 500 255"
          stroke="#0d9488"
          strokeWidth="1.2"
          strokeOpacity="0.2"
        />

        {/* India Gate Silhouette */}
        <g fill="url(#gateGrad)">
          {/* Main Base */}
          <rect x="220" y="220" width="160" height="15" rx="2" />
          <rect x="230" y="205" width="140" height="15" rx="2" />
          {/* Main Pillars */}
          <rect x="240" y="100" width="32" height="105" rx="1" />
          <rect x="328" y="100" width="32" height="105" rx="1" />
          {/* Central Arch */}
          <path d="M 272 165 Q 300 135 328 165 L 328 205 L 272 205 Z" fill="#ffffff" fillOpacity="0.7" />
          {/* Lintel & Attic */}
          <rect x="235" y="82" width="130" height="18" rx="2" />
          <rect x="245" y="66" width="110" height="16" rx="2" />
          {/* Top Cornice Dome Base */}
          <rect x="260" y="52" width="80" height="14" rx="2" />
          <path d="M 275 52 Q 300 38 325 52 Z" />
        </g>

        {/* Regional Airshed Wind Transport Vectors */}
        <g stroke="#0284c7" strokeWidth="1.2" strokeOpacity="0.3" strokeLinecap="round">
          <path d="M 120 110 Q 180 90 240 105" />
          <path d="M 160 140 Q 230 120 310 135" />
          <path d="M 90 80 Q 150 65 210 75" />
        </g>
      </svg>

      <div className="hero-content">
        {/* Status & Verification Badges */}
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

        {/* Hero Title */}
        <h1 className="hero-title">
          ATMOSYNC <span className="hero-title-accent">Air Pollution Command Center</span>
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle">
          AI-Powered Air Pollution–Weather Coupled Forecasting System for Delhi NCR (SIH-26082).
          Evaluated against 18,240 verified station-hour observations across winter 2023–2024.
        </p>
      </div>
    </section>
  );
}
