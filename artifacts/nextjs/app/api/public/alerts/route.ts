export const dynamic = 'force-dynamic';

import { ListPublicAlertsResponse, ListPublicReportsResponse } from '@workspace/api-zod';
import { getReports, toReportResponse, seedDemoReports } from '@/lib/drainwatch';

export async function GET() {
  return Response.json(
    ListPublicAlertsResponse.parse([
      {
        id: 'alert-hyd-imd-monsoon',
        title: 'IMD Orange Alert — Heavy rain expected',
        message: 'IMD has issued an orange alert for Hyderabad district. 30–50 mm rainfall forecast between 18:00–23:00 IST. Avoid underpasses and low-lying roads. Residents near Musi river corridor advised to stay alert.',
        severity: 'warning',
        issued_at: new Date().toISOString(),
      },
      {
        id: 'alert-hyd-nh65-closed',
        title: 'NH-65 Attapur Underpass closed',
        message: 'Attapur underpass on NH-65 closed to all traffic due to 80 cm flood water. Use Rajendra Nagar flyover as alternate route. GHMC pumps deployed — expect 3–4 hour clearance time.',
        severity: 'watch',
        issued_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'alert-hyd-airport-road',
        title: 'Airport Road sinkhole — Traffic diverted',
        message: 'Sinkhole on Shamshabad Airport Road at 4 km marker. Traffic diverted via NH-44. Allow additional 25–30 minutes travel time to RGIA. NHAI repair team on-site.',
        severity: 'watch',
        issued_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'alert-hyd-general',
        title: 'Monsoon safety reminder',
        message: 'Report blocked drains before travelling. Avoid walking near open manholes after dark. Use the DrainWatch app to flag hazards in real time so response teams can act faster.',
        severity: 'info',
        issued_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      },
    ]),
  );
}

