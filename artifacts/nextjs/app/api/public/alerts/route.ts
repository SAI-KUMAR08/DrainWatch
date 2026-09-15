export const dynamic = 'force-dynamic';

import { ListPublicAlertsResponse, ListPublicReportsResponse } from '@workspace/api-zod';
import { getReports, toReportResponse, seedDemoReports } from '@/lib/drainwatch';

export async function GET() {
  return Response.json(
    ListPublicAlertsResponse.parse([
      {
        id: 'alert-hyd-monsoon',
        title: 'Monsoon readiness update',
        message: 'Avoid standing water near underpasses and report blocked drains before travelling.',
        severity: 'watch',
        issued_at: new Date().toISOString(),
      },
    ]),
  );
}

