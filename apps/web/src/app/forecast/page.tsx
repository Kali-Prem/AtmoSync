import {
  fetchStationForecast,
  fetchModelMetadata,
  fetchDataFreshness,
  fetchStationHistory,
  fetchStations,
  StationForecastResponse,
} from '@/lib/api';
import { ForecastDashboard } from '@/components';

export const dynamic = 'force-dynamic';

const ANCHOR_CODES = [
  'DL_ANAND_VIHAR',
  'DL_PUNJABI_BAGH',
  'DL_RK_PURAM',
  'DL_IGI_AIRPORT',
  'DL_BAWANA',
];

interface PageProps {
  searchParams?: {
    station?: string;
  };
}

export default async function ForecastPage({ searchParams }: PageProps) {
  const selectedStation = searchParams?.station || 'DL_ANAND_VIHAR';

  // Preload forecasts for anchor stations so client switching is instant
  const otherAnchorCodes = ANCHOR_CODES.filter((code) => code !== selectedStation);

  const [
    initialForecast,
    modelsMeta,
    freshness,
    initialHistory,
    stationsRegistry,
    ...otherAnchorForecasts
  ] = await Promise.all([
    fetchStationForecast(selectedStation),
    fetchModelMetadata(),
    fetchDataFreshness(),
    fetchStationHistory(selectedStation, 24),
    fetchStations(),
    ...otherAnchorCodes.map((code) => fetchStationForecast(code)),
  ]);

  const allStationForecasts: Record<string, StationForecastResponse> = {};
  if (initialForecast && initialForecast.status === 'SUCCESS') {
    allStationForecasts[initialForecast.station_code] = initialForecast;
  }
  otherAnchorForecasts.forEach((f) => {
    if (f && f.status === 'SUCCESS') {
      allStationForecasts[f.station_code] = f;
    }
  });

  return (
    <div className="container" style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.25rem 1.5rem' }}>
      <ForecastDashboard
        initialForecast={initialForecast}
        allStationForecasts={allStationForecasts}
        initialHistory={initialHistory}
        initialModelsMeta={modelsMeta}
        initialFreshness={freshness}
        stationsRegistry={stationsRegistry}
      />
    </div>
  );
}
