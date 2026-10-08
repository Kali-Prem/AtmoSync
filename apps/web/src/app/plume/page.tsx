import {
  fetchFireClusters,
  fetchPlumeRisk,
  fetchActiveFires,
} from '@/lib/api';
import { PlumeDashboard } from '@/components';

export const dynamic = 'force-dynamic';

export default async function PlumePage() {
  const [clustersData, plumeRisk, activeFires] = await Promise.all([
    fetchFireClusters(),
    fetchPlumeRisk(),
    fetchActiveFires(300),
  ]);

  return (
    <PlumeDashboard
      initialClusters={clustersData}
      initialPlumeRisk={plumeRisk}
      initialActiveFires={activeFires}
    />
  );
}
