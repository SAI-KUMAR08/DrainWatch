export const dynamic = 'force-dynamic';

import { ListPublicReportsResponse } from '@workspace/api-zod';
import { getReports, toReportResponse, seedDemoReports } from '@/lib/drainwatch';

export async function GET() {
  await seedDemoReports();
  const reports = await getReports({ limit: 100 });
  return Response.json(
    ListPublicReportsResponse.parse(
      reports.map((report) => ({ ...toReportResponse(report), description: report.description })),
    ),
  );
}

