import {
  fetchHealth,
  fetchInversionStatus,
  fetchLatestObservations,
  fetchDataFreshness,
  fetchStations,
  fetchStationForecast,
  fetchFireClusters,
  fetchPlumeRisk,
  fetchStationHistory,
} from '@/lib/api';
import {
  HeroBanner,
  KpiCards,
  AirQualityMap,
  StationTelemetryTable,
  AnalyticsSection,
} from '@/components';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [
    health,
    inversion,
    latestObs,
    freshness,
    stations,
    forecast,
    fireClusters,
    plumeRisk,
    stationHistory,
  ] = await Promise.all([
    fetchHealth(),
    fetchInversionStatus(),
    fetchLatestObservations(),
    fetchDataFreshness(),
    fetchStations(),
    fetchStationForecast('DL_ANAND_VIHAR'),
    fetchFireClusters(),
    fetchPlumeRisk(),
    fetchStationHistory('DL_ANAND_VIHAR', 24),
  ]);

  const anandViharObs =
    latestObs?.records?.find((r) => r.station_code === 'DL_ANAND_VIHAR') || null;

  return (
    <div style={{ maxWidth: '100%' }}>
      {/* 1. Main Hero / Command Center */}
      <HeroBanner freshness={freshness} />

      {/* 2. Glassmorphic KPI Cards (4 cards) */}
      <KpiCards inversion={inversion} health={health} />

      {/* 3. Main Content — Two Column Layout (Delhi NCR Map + Anchor Stations Table) */}
      <div className="mid-grid">
        <AirQualityMap stations={stations} latestObs={latestObs} />
        <StationTelemetryTable stations={stations} latestObs={latestObs} />
      </div>

      {/* 4. Lower Analytics Section (4 Cards Grid) */}
      <AnalyticsSection
        forecast={forecast}
        inversion={inversion}
        anandViharObs={anandViharObs}
        fireClusters={fireClusters}
        plumeRisk={plumeRisk}
        stationHistory={stationHistory}
      />
    </div>
  );
}
