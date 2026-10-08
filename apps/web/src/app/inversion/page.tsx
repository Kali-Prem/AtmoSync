import {
  fetchStations,
  fetchLatestObservations,
  fetchInversionStatus,
  fetchStationHistory,
} from '@/lib/api';
import { InversionDashboard } from '@/components';

export const dynamic = 'force-dynamic';

export default async function InversionPage() {
  const [stations, latestObs, inversion, initialHistory] = await Promise.all([
    fetchStations(),
    fetchLatestObservations(),
    fetchInversionStatus('DL_ANAND_VIHAR'),
    fetchStationHistory('DL_ANAND_VIHAR', 24),
  ]);

  return (
    <InversionDashboard
      initialInversion={inversion}
      stations={stations}
      latestObs={latestObs}
      initialHistory={initialHistory}
      selectedStationCode="DL_ANAND_VIHAR"
    />
  );
}
