'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MonitoringStation, LatestObservationsResponse, StationObservationRecord } from '@/lib/api';

interface StationTelemetryTableProps {
  stations: MonitoringStation[];
  latestObs: LatestObservationsResponse | null;
}

export default function StationTelemetryTable({ stations, latestObs }: StationTelemetryTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMore, setShowMore] = useState(false);

  // Index latest observations by station code for O(1) lookup
  const obsMap = useMemo(() => {
    const map = new Map<string, StationObservationRecord>();
    if (latestObs?.records) {
      for (const rec of latestObs.records) {
        map.set(rec.station_code, rec);
      }
    }
    return map;
  }, [latestObs]);

  // Standard ordered stations: 5 Default Anchors first in canonical order, followed by other active monitors
  const canonicalOrder = ['DL_ANAND_VIHAR', 'DL_BAWANA', 'DL_IGI_AIRPORT', 'DL_PUNJABI_BAGH', 'DL_RK_PURAM'];
  const sortedStations = useMemo(() => {
    return [...stations].sort((a, b) => {
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

    return sortedStations.filter((s) => s.is_default_anchor);
  }, [sortedStations, trimmedQuery, isSearchActive, showMore]);

  const defaultAnchorsCount = sortedStations.filter((s) => s.is_default_anchor).length;
  const additionalCount = sortedStations.length - defaultAnchorsCount;

  return (
    <div className="table-card" aria-label="Anchor Monitoring Stations Ground Telemetry">
      {/* Header and Controls */}
      <div className="card-title-group">
        <div>
          <h2 className="card-title">Anchor Monitoring Stations — Real Ground Telemetry</h2>
          <div className="card-subtitle">Live station data from Delhi NCR CAAQMS network</div>
        </div>

        {/* Search Field */}
        <div style={{ position: 'relative', width: '260px', maxWidth: '100%' }}>
          <input
            type="text"
            id="station-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stations (e.g., Anand, DL_, Bawana...)"
            style={{
              width: '100%',
              padding: '0.45rem 1.8rem 0.45rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card-hover)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              outline: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
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
              <th style={{ width: '32px', textAlign: 'center' }}>#</th>
              <th>STATION</th>
              <th>LATEST PM2.5</th>
              <th>PM10</th>
              <th>NO₂</th>
              <th>TEMP</th>
              <th>WIND</th>
              <th>PBLH</th>
              <th>ITSI /100</th>
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

                return (
                  <tr key={stn.station_code}>
                    {/* Index Column */}
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {index + 1}
                    </td>

                    {/* Station Name & Code */}
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span>{stn.name.split(',')[0]}</span>
                        {stn.is_default_anchor && (
                          <span
                            className="badge badge-info"
                            style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}
                          >
                            Anchor
                          </span>
                        )}
                        {isExperimental && (
                          <span
                            className="badge badge-neutral"
                            style={{
                              fontSize: '0.62rem',
                              padding: '0.1rem 0.35rem',
                              borderColor: 'var(--accent-cyan)',
                              color: 'var(--accent-cyan)',
                            }}
                          >
                            Experimental
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        {stn.station_code} &bull; {stn.provider}
                      </div>
                    </td>

                    {/* Real Telemetry Data */}
                    {hasTelemetry ? (
                      <>
                        <td
                          style={{
                            fontWeight: 700,
                            color:
                              rec.pm25 > 120
                                ? 'var(--naqi-very-poor)'
                                : rec.pm25 > 60
                                ? 'var(--naqi-moderate)'
                                : 'var(--naqi-good)',
                          }}
                        >
                          {rec.pm25} µg/m³
                        </td>
                        <td>{rec.pm10} µg/m³</td>
                        <td>{rec.no2} µg/m³</td>
                        <td>{rec.temp_c}&deg;C</td>
                        <td>{rec.wind_speed_ms} m/s</td>
                        <td>{rec.pblh_m} m</td>
                        <td>
                          <span className="badge badge-warning">{rec.itsi} / 100</span>
                        </td>
                        <td>
                          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                            Online
                          </span>
                        </td>
                        <td>
                          <Link
                            href={`/forecast?station=${stn.station_code}`}
                            style={{
                              color: 'var(--accent-cyan)',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
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
                              fontSize: '0.78rem',
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
                <td colSpan={11} style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                    No stations found
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.85rem' }}>
                    No station matches &ldquo;<strong>{searchQuery}</strong>&rdquo;. Try searching by name (e.g. Anand, Alipur, Bawana) or code (DL_).
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      background: 'var(--bg-card-hover)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--accent-cyan)',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Clear Search
                  </button>
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={11} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Awaiting station observations...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* "Show More Stations" Toggle Button */}
      {!isSearchActive && additionalCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '1rem' }}>
          {showMore && (
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '0.5rem' }}>
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
              gap: '0.45rem',
              padding: '0.45rem 1.25rem',
              borderRadius: '9999px',
              background: 'var(--bg-card-hover)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--accent-cyan)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-xs)',
              transition: 'all 0.2s ease',
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
