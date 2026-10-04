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
  const canonicalOrder = ['DL_ANAND_VIHAR', 'DL_PUNJABI_BAGH', 'DL_RK_PURAM', 'DL_IGI_AIRPORT', 'DL_BAWANA'];
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
      // When searching: search across ALL stations (including hidden/experimental stations)
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

    // When NOT searching:
    // If showMore is true -> all stations
    // If showMore is false -> only the 5 default anchor stations
    if (showMore) {
      return sortedStations;
    }

    return sortedStations.filter((s) => s.is_default_anchor);
  }, [sortedStations, trimmedQuery, isSearchActive, showMore]);

  const defaultAnchorsCount = sortedStations.filter((s) => s.is_default_anchor).length;
  const additionalCount = sortedStations.length - defaultAnchorsCount;

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Table Section Header & Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Anchor Monitoring Stations — Real Ground Telemetry</h2>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {isSearchActive ? (
              <span>
                Search results: <strong>{displayedStations.length}</strong> matching station
                {displayedStations.length === 1 ? '' : 's'} across complete network
              </span>
            ) : showMore ? (
              <span>
                Showing complete network (<strong>{sortedStations.length}</strong> monitoring stations)
              </span>
            ) : (
              <span>
                Baseline view: <strong>{defaultAnchorsCount}</strong> default anchor stations (Winter 2023–2024 ground truth)
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Station Discovery Search Input */}
          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <input
              type="text"
              id="station-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stations (e.g. Anand, Alipur, DL_)..."
              style={{
                width: '100%',
                padding: '0.5rem 2rem 0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
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
                title="Clear search"
                style={{
                  position: 'absolute',
                  right: '0.55rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  lineHeight: 1,
                  padding: '0.2rem',
                }}
              >
                &times;
              </button>
            )}
          </div>

          <Link href="/forecast" style={{ color: 'var(--accent-cyan)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>
            View 72-Hour Predictions &rarr;
          </Link>
        </div>
      </div>

      {/* Real Observations Table */}
      <div className="glass-panel" style={{ overflowX: 'auto', padding: '0.5rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Station</th>
              <th>Latest PM2.5</th>
              <th>PM10</th>
              <th>NO2</th>
              <th>Temp</th>
              <th>Wind Speed</th>
              <th>PBL Height</th>
              <th>Trapping Index (ITSI)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {displayedStations.length > 0 ? (
              displayedStations.map((stn) => {
                const rec = obsMap.get(stn.station_code);
                const hasTelemetry = rec !== undefined;
                const isExperimental = stn.extra_metadata?.is_experimental === true;

                return (
                  <tr key={stn.station_code}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <span>{stn.name}</span>
                        {stn.is_default_anchor && (
                          <span
                            className="badge badge-info"
                            style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', textTransform: 'uppercase' }}
                          >
                            Anchor
                          </span>
                        )}
                        {isExperimental && (
                          <span
                            className="badge badge-neutral"
                            style={{
                              fontSize: '0.65rem',
                              padding: '0.1rem 0.4rem',
                              textTransform: 'uppercase',
                              borderColor: 'var(--border-active)',
                              color: 'var(--accent-cyan)',
                            }}
                          >
                            Experimental
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {stn.station_code} &bull; {stn.provider}
                      </div>
                    </td>

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
                        <td>{rec.temp_c} °C</td>
                        <td>{rec.wind_speed_ms} m/s</td>
                        <td>{rec.pblh_m} m</td>
                        <td>
                          <span className="badge badge-warning">{rec.itsi} / 100</span>
                        </td>
                        <td>
                          <Link
                            href={`/forecast?station=${rec.station_code}`}
                            style={{
                              color: 'var(--accent-cyan)',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              textDecoration: 'none',
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
                        <td>
                          <span
                            className="badge badge-neutral"
                            style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}
                            title="Continuous telemetry ingestion awaiting integration cycle"
                          >
                            No telemetry available
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--text-muted)',
                              fontStyle: 'normal',
                            }}
                          >
                            {isExperimental ? 'Demo Node' : 'Registry Only'}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            ) : isSearchActive ? (
              <tr>
                <td colSpan={9} style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1rem', marginBottom: '0.35rem' }}>
                    No stations found
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    No monitoring station matches &ldquo;<strong>{searchQuery}</strong>&rdquo;. Try searching by station name, code (e.g. DL_, Anand, Alipur), or area.
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      background: 'var(--bg-card-hover)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--accent-cyan)',
                      padding: '0.4rem 1rem',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Clear Search
                  </button>
                </td>
              </tr>
            ) : latestObs?.status === 'EMPTY' ? (
              <tr>
                <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No station telemetry records currently recorded in database. Awaiting telemetry ingestion cycle.
                </td>
              </tr>
            ) : !latestObs ? (
              <tr>
                <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-ruby, #ef4444)' }}>
                  Unable to connect to ATMOSYNC API. Please verify backend service health.
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No station telemetry records available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* "Show More Stations" Toggle Control */}
      {!isSearchActive && additionalCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem' }}>
          <button
            type="button"
            id="station-show-more-toggle-btn"
            onClick={() => setShowMore((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.4rem',
              borderRadius: '9999px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--accent-cyan)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-active)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.transform = 'translateY(0)';
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
