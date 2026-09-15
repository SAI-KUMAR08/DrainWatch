export const dynamic = 'force-dynamic';

import { UpdateOfficerReportStatusBody, UpdateOfficerReportStatusParams, UpdateOfficerReportStatusResponse } from '@workspace/api-zod';
import { requireRole } from '@/lib/auth';
import { toReportResponse, updateReportStatus } from '@/lib/drainwatch';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = requireRole(request, 'officer');
  if ('error' in result) return result.error;

  const { id } = await params;
  const validatedParams = UpdateOfficerReportStatusParams.safeParse({ id });
  const body = await request.json().catch(() => null);
  const validatedBody = UpdateOfficerReportStatusBody.safeParse(body);

  if (!validatedParams.success || !validatedBody.success) {
    return Response.json({ error: 'Invalid report status update' }, { status: 400 });
  }

  const updated = await updateReportStatus(
    validatedParams.data.id,
    validatedBody.data.status,
    result.auth.email,
  );
  if (!updated) {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }

  return Response.json(UpdateOfficerReportStatusResponse.parse(toReportResponse(updated)));
}
