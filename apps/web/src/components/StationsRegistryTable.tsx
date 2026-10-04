'use client';

import { useMemo, useState } from 'react';
import { MonitoringStation } from '@/lib/api';

interface StationsRegistryTableProps {
  stations: MonitoringStation[];
}

export default function StationsRegistryTable({ stations }: StationsRegistryTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const isSearchActive = trimmedQuery.length > 0;

  const filteredStations = useMemo(() => {
    if (!isSearchActive) return stations;
    return stations.filter((stn) => {
      const codeMatch = stn.station_code.toLowerCase().includes(trimmedQuery);
      const nameMatch = stn.name.toLowerCase().includes(trimmedQuery);
      const providerMatch = stn.provider.toLowerCase().includes(trimmedQuery);
      const locMatch = stn.location_id ? stn.location_id.toLowerCase().includes(trimmedQuery) : false;
      const typeMatch = stn.extra_metadata?.station_type
        ? String(stn.extra_metadata.station_type).toLowerCase().includes(trimmedQuery)
        : false;
      return codeMatch || nameMatch || providerMatch || locMatch || typeMatch;
    });
  }, [stations, trimmedQuery, isSearchActive]);

  return (
    <div>
      {/* Search Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          {isSearchActive ? (
            <span>
              Showing <strong>{filteredStations.length}</strong> of <strong>{stations.length}</strong> stations
            </span>
          ) : (
            <span>
              Showing all <strong>{stations.length}</strong> registered monitoring stations
            </span>
          )}
        </div>

        {/* Search Field */}
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <input
            type="text"
            id="registry-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search registry (e.g. Alipur, DPCC, DL_)..."
            style={{
              width: '100%',
              padding: '0.55rem 2rem 0.55rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
          />
          {isSearchActive && (
            <button
              type="button"
              id="registry-search-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear registry search"
              title="Clear search"
              style={{
                position: 'absolute',
                right: '0.6rem',
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
      </div>

      {filteredStations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#128269;</div>
          <div className="empty-title">No Stations Found</div>
          <div className="empty-desc">
            No monitoring station matched &ldquo;<strong>{searchQuery}</strong>&rdquo;. Try searching by station code (e.g. <code>DL_</code>), provider (e.g. <code>DPCC</code>), or station name.
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{
              marginTop: '1rem',
              background: 'var(--bg-card-hover)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--accent-cyan)',
              padding: '0.45rem 1.1rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflowX: 'auto', padding: '0.5rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Station Code</th>
                <th>Station Name</th>
                <th>Classification</th>
                <th>Provider</th>
                <th>Coordinates</th>
                <th>Elevation</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStations.map((stn) => {
                const isAnchor = stn.is_default_anchor === true;
                const isExp = stn.extra_metadata?.is_experimental === true;

                return (
                  <tr key={stn.id || stn.station_code}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {stn.station_code}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <div>{stn.name}</div>
                      {stn.extra_metadata?.station_type && (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                          {stn.extra_metadata.station_type}
                        </div>
                      )}
                    </td>
                    <td>
                      {isAnchor ? (
                        <span className="badge badge-info" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                          Default Anchor
                        </span>
                      ) : isExp ? (
                        <span
                          className="badge badge-neutral"
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.15rem 0.45rem',
                            color: 'var(--accent-cyan)',
                            borderColor: 'var(--border-active)',
                          }}
                        >
                          Experimental
                        </span>
                      ) : (
                        <span className="badge badge-neutral" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                          Standard CAAQMS
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info">{stn.provider}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                      {stn.latitude != null ? stn.latitude.toFixed(4) : '—'}°N, {stn.longitude != null ? stn.longitude.toFixed(4) : '—'}°E
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {stn.elevation_m} m ASL
                    </td>
                    <td>
                      <span className="badge badge-success">{stn.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
