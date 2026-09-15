export const dynamic = 'force-dynamic';

import { GetOfficerReportParams, GetOfficerReportResponse } from '@workspace/api-zod';
import { requireRole } from '@/lib/auth';
import { getReport, toReportResponse } from '@/lib/drainwatch';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = requireRole(request, 'officer');
  if ('error' in result) return result.error;

  const { id } = await params;
  const validated = GetOfficerReportParams.safeParse({ id });
  if (!validated.success) {
    return Response.json({ error: validated.error.message }, { status: 400 });
  }

  const report = await getReport(validated.data.id);
  if (!report) {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }

  return Response.json(GetOfficerReportResponse.parse(toReportResponse(report)));
}
