import {
  fetchStations,
  fetchLatestObservations,
  fetchFireClusters,
  fetchPlumeRisk,
  fetchDataFreshness,
  fetchInversionStatus,
} from '@/lib/api';
import { LiveMapViewer } from '@/components';

export const dynamic = 'force-dynamic';

export default async function MapPage() {
  const [
    stations,
    latestObs,
    fireClusters,
    plumeRisk,
    freshness,
    inversion,
  ] = await Promise.all([
    fetchStations(),
    fetchLatestObservations(),
    fetchFireClusters(),
    fetchPlumeRisk(),
    fetchDataFreshness(),
    fetchInversionStatus(),
  ]);

  return (
    <LiveMapViewer
      stations={stations}
      latestObs={latestObs}
      fireClusters={fireClusters}
      plumeRisk={plumeRisk}
      freshness={freshness}
      inversion={inversion}
    />
  );
}
