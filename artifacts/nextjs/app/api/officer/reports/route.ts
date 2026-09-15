export const dynamic = 'force-dynamic';

import { ListOfficerReportsQueryParams, ListOfficerReportsResponse } from '@workspace/api-zod';
import { requireRole } from '@/lib/auth';
import { getReports, toReportResponse } from '@/lib/drainwatch';

export async function GET(request: Request) {
  const result = requireRole(request, 'officer');
  if ('error' in result) return result.error;

  const { searchParams } = new URL(request.url);
  const parsed = ListOfficerReportsQueryParams.safeParse({
    status: searchParams.get('status') ?? undefined,
    severity: searchParams.get('severity') ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const reports = await getReports({ ...parsed.data, limit: 100 });
  return Response.json(ListOfficerReportsResponse.parse(reports.map(toReportResponse)));
}

