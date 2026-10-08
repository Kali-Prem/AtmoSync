import {
  fetchStations,
  fetchLatestObservations,
  fetchAtmosphereCurrent,
  fetchInversionStatus,
  fetchDataFreshness,
  fetchStationHistory,
} from '@/lib/api';
import { AirQualityDashboard } from '@/components';

export const dynamic = 'force-dynamic';

export default async function AirQualityPage() {
  const [
    stations,
    latestObs,
    atmoData,
    inversion,
    freshness,
    initialHistory,
  ] = await Promise.all([
    fetchStations(),
    fetchLatestObservations(),
    fetchAtmosphereCurrent(),
    fetchInversionStatus(),
    fetchDataFreshness(),
    fetchStationHistory('DL_ANAND_VIHAR', 24),
  ]);

  return (
    <AirQualityDashboard
      stations={stations}
      latestObs={latestObs}
      atmoData={atmoData}
      inversion={inversion}
      freshness={freshness}
      initialHistory={initialHistory}
    />
  );
}
