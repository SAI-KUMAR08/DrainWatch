export const dynamic = 'force-dynamic';

import { GetCitizenReportParams, GetCitizenReportResponse } from '@workspace/api-zod';
import { requireRole } from '@/lib/auth';
import { getReport, toReportResponse } from '@/lib/drainwatch';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = requireRole(request, 'citizen');
  if ('error' in result) return result.error;

  const { id } = await params;
  const validated = GetCitizenReportParams.safeParse({ id });
  if (!validated.success) {
    return Response.json({ error: validated.error.message }, { status: 400 });
  }

  const report = await getReport(validated.data.id);
  if (!report || report.reporterEmail !== result.auth.email) {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }

  return Response.json(GetCitizenReportResponse.parse(toReportResponse(report)));
}
