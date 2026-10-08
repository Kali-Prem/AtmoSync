'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MonitoringStation,
  LatestObservationsResponse,
  StationObservationRecord,
  DEFAULT_ANCHOR_STATIONS,
  DEFAULT_ANCHOR_OBSERVATIONS,
} from '@/lib/api';

interface StationTelemetryTableProps {
  stations: MonitoringStation[];
  latestObs: LatestObservationsResponse | null;
}

function getAqiStatus(pm25: number): { label: string; color: string; bg: string } {
  if (pm25 <= 30) return { label: 'Good', color: '#059669', bg: '#d1fae5' };
  if (pm25 <= 60) return { label: 'Satisfactory', color: '#4d7c0f', bg: '#ecfccb' };
  if (pm25 <= 90) return { label: 'Moderate', color: '#b45309', bg: '#fef3c7' };
  if (pm25 <= 120) return { label: 'Poor', color: '#c2410c', bg: '#ffedd5' };
  if (pm25 <= 250) return { label: 'Very Poor', color: '#b91c1c', bg: '#fee2e2' };
  return { label: 'Severe', color: '#881337', bg: '#ffe4e6' };
}

export default function StationTelemetryTable({
  stations: initialStations,
  latestObs: initialLatestObs,
}: StationTelemetryTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [stations, setStations] = useState<MonitoringStation[]>(
    initialStations && initialStations.length > 0 ? initialStations : DEFAULT_ANCHOR_STATIONS
  );
  const [latestObs, setLatestObs] = useState<LatestObservationsResponse | null>(
    initialLatestObs && initialLatestObs.records && initialLatestObs.records.length > 0
      ? initialLatestObs
      : { status: 'SUCCESS', stations_count: DEFAULT_ANCHOR_OBSERVATIONS.length, records: DEFAULT_ANCHOR_OBSERVATIONS }
  );

  // Client-side hydration safeguard: if initially empty or missing, fetch immediately
  useEffect(() => {
    if (!initialStations || initialStations.length === 0) {
      fetch('/api/v1/locations/stations')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setStations(data);
          }
        })
        .catch(() => {});
    }
    if (!initialLatestObs || !initialLatestObs.records || initialLatestObs.records.length === 0) {
      fetch('/api/v1/observations/latest')
        .then((r) => r.json())
        .then((data) => {
          if (data && data.records && data.records.length > 0) {
            setLatestObs(data);
          }
        })
        .catch(() => {});
    }
  }, [initialStations, initialLatestObs]);

  // Index latest observations by station code for O(1) lookup
  const obsMap = useMemo(() => {
    const map = new Map<string, StationObservationRecord>();
    const recs = latestObs?.records || DEFAULT_ANCHOR_OBSERVATIONS;
    for (const rec of recs) {
      map.set(rec.station_code, rec);
    }
    return map;
  }, [latestObs]);

  // Standard ordered stations: 5 Default Anchors first in canonical order, followed by other active monitors
  const canonicalOrder = ['DL_ANAND_VIHAR', 'DL_BAWANA', 'DL_IGI_AIRPORT', 'DL_PUNJABI_BAGH', 'DL_RK_PURAM'];
  const sortedStations = useMemo(() => {
    const list = stations.length > 0 ? stations : DEFAULT_ANCHOR_STATIONS;
    return [...list].sort((a, b) => {
      const idxA = canonicalOrder.indexOf(a.station_code);
      const idxB = canonicalOrder.indexOf(b.station_code);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      if (a.is_default_anchor && !b.is_default_anchor) return -1;
      if (!a.is_default_anchor && b.is_default_anchor) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [stations]);

  // Search and Visibility Filter Pipeline
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const isSearchActive = trimmedQuery.length > 0;

  const displayedStations = useMemo(() => {
    if (isSearchActive) {
      // When searching: search across ALL stations (including experimental/hidden)
      return sortedStations.filter((stn) => {
        const nameMatch = stn.name.toLowerCase().includes(trimmedQuery);
        const codeMatch = stn.station_code.toLowerCase().includes(trimmedQuery);
        const locMatch = stn.location_id ? stn.location_id.toLowerCase().includes(trimmedQuery) : false;
        const providerMatch = stn.provider ? stn.provider.toLowerCase().includes(trimmedQuery) : false;
        const typeMatch = stn.extra_metadata?.station_type
          ? String(stn.extra_metadata.station_type).toLowerCase().includes(trimmedQuery)
          : false;
        return nameMatch || codeMatch || locMatch || providerMatch || typeMatch;
      });
    }

    // Default: 5 anchor stations, or all when showMore is true
    if (showMore) {
      return sortedStations;
    }

    const anchors = sortedStations.filter((s) => s.is_default_anchor);
    return anchors.length > 0 ? anchors : DEFAULT_ANCHOR_STATIONS;
  }, [sortedStations, trimmedQuery, isSearchActive, showMore]);

  const defaultAnchorsCount = sortedStations.filter((s) => s.is_default_anchor).length || 5;
  const additionalCount = Math.max(0, sortedStations.length - defaultAnchorsCount);

  return (
    <div className="table-card" aria-label="Anchor Monitoring Stations Ground Telemetry">
      {/* Header and Controls */}
      <div className="card-title-group" style={{ marginBottom: '0.75rem' }}>
        <div>
          <h2 className="card-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            Anchor Monitoring Stations &mdash; Real Ground Telemetry
          </h2>
          <div className="card-subtitle" style={{ fontSize: '0.75rem' }}>
            Live station data from Delhi NCR CAAQMS network (Winter 2023&ndash;2024 Benchmark)
          </div>
        </div>

        {/* Search Field */}
        <div style={{ position: 'relative', width: '250px', maxWidth: '100%' }}>
          <input
            type="text"
            id="station-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stations (e.g., Anand, DL_, Bawana...)"
            style={{
              width: '100%',
              padding: '0.4rem 1.8rem 0.4rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card-hover)',
              color: 'var(--text-primary)',
              fontSize: '0.78rem',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
          />
          {isSearchActive && (
            <button
              type="button"
              id="station-search-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear station search"
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '1rem',
                lineHeight: 1,
                padding: '0.15rem',
              }}
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Observation Table with Exact Reference Columns */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '28px', textAlign: 'center' }}>#</th>
              <th>STATION</th>
              <th>PM2.5</th>
              <th>PM10</th>
              <th>NO₂</th>
              <th>TEMP</th>
              <th>WIND</th>
              <th>PBLH</th>
              <th>ITSI</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {displayedStations.length > 0 ? (
              displayedStations.map((stn, index) => {
                const rec = obsMap.get(stn.station_code);
                const hasTelemetry = rec !== undefined;
                const isExperimental = stn.extra_metadata?.is_experimental === true;
                const aqiInfo = rec ? getAqiStatus(rec.pm25) : null;

                return (
                  <tr key={stn.station_code}>
                    {/* # Index Column */}
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>
                      {index + 1}
                    </td>

                    {/* STATION Name & Code */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {stn.name.split(',')[0]}
                        </span>
                        {stn.is_default_anchor && (
                          <span
                            className="badge badge-info"
                            style={{ fontSize: '0.6rem', padding: '0.08rem 0.3rem' }}
                          >
                            Anchor
                          </span>
                        )}
                        {isExperimental && (
                          <span
                            className="badge badge-neutral"
                            style={{
                              fontSize: '0.6rem',
                              padding: '0.08rem 0.3rem',
                              borderColor: 'var(--accent-cyan)',
                              color: 'var(--accent-cyan)',
                            }}
                          >
                            Experimental
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        {stn.station_code} &bull; {stn.provider}
                      </div>
                    </td>

                    {/* Real Telemetry Data */}
                    {hasTelemetry ? (
                      <>
                        {/* PM2.5 */}
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.18rem 0.5rem',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              background: aqiInfo?.bg,
                              color: aqiInfo?.color,
                            }}
                          >
                            {rec.pm25} µg/m³
                          </span>
                        </td>

                        {/* PM10 */}
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.18rem 0.45rem',
                              borderRadius: '6px',
                              fontWeight: 600,
                              fontSize: '0.76rem',
                              background: 'var(--bg-card-hover)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {rec.pm10} µg/m³
                          </span>
                        </td>

                        {/* NO2 */}
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.18rem 0.45rem',
                              borderRadius: '6px',
                              fontWeight: 600,
                              fontSize: '0.76rem',
                              background: 'var(--bg-card-hover)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {rec.no2} µg/m³
                          </span>
                        </td>

                        {/* TEMP */}
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {rec.temp_c}&deg;C
                        </td>

                        {/* WIND */}
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {rec.wind_speed_ms} m/s
                        </td>

                        {/* PBLH */}
                        <td style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                          {Math.round(rec.pblh_m)} m
                        </td>

                        {/* ITSI */}
                        <td>
                          <span
                            className="badge badge-warning"
                            style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
                          >
                            {rec.itsi} / 100
                          </span>
                        </td>

                        {/* STATUS */}
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.15rem 0.55rem',
                              borderRadius: '9999px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              background: aqiInfo?.bg,
                              color: aqiInfo?.color,
                              border: `1px solid ${aqiInfo?.color}40`,
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em',
                            }}
                          >
                            {aqiInfo?.label}
                          </span>
                        </td>

                        {/* ACTION */}
                        <td>
                          <Link
                            href={`/forecast?station=${stn.station_code}`}
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              background: 'var(--bg-card-hover)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--accent-cyan)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            Forecast &rarr;
                          </Link>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ color: 'var(--text-muted)' }}>&mdash;</td>
                        <td style={{ color: 'var(--text-muted)' }}>&mdash;</td>
                        <td style={{ color: 'var(--text-muted)' }}>&mdash;</td>
                        <td style={{ color: 'var(--text-muted)' }}>&mdash;</td>
                        <td style={{ color: 'var(--text-muted)' }}>&mdash;</td>
                        <td style={{ color: 'var(--text-muted)' }}>&mdash;</td>
                        <td style={{ color: 'var(--text-muted)' }}>&mdash;</td>
                        <td>
                          <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                            {isExperimental ? 'Standby' : 'Registry'}
                          </span>
                        </td>
                        <td>
                          <Link
                            href={`/forecast?station=${stn.station_code}`}
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: '0.75rem',
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            View &rarr;
                          </Link>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            ) : isSearchActive ? (
              <tr>
                <td colSpan={11} style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                    No stations found
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                    No station matches &ldquo;<strong>{searchQuery}</strong>&rdquo;. Try searching by name (e.g. Anand, Alipur, Bawana) or code (DL_).
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      background: 'var(--bg-card-hover)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--accent-cyan)',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Clear Search
                  </button>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* "Show More Stations" Toggle Button */}
      {!isSearchActive && additionalCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '0.75rem' }}>
          {showMore && (
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '0.35rem' }}>
              Additional Stations (Experimental) &bull; {additionalCount} more stations available
            </div>
          )}
          <button
            type="button"
            id="station-show-more-toggle-btn"
            onClick={() => setShowMore((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 1.15rem',
              borderRadius: '9999px',
              background: 'var(--bg-card-hover)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--accent-cyan)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-xs)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{showMore ? '▲' : '▼'}</span>
            <span>
              {showMore
                ? 'Show Fewer Stations'
                : `Show More Stations (+${additionalCount} Additional Monitors)`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
