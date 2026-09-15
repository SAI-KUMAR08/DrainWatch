export const dynamic = 'force-dynamic';

import { ListOfficerAuditLogsResponse } from '@workspace/api-zod';
import { requireRole } from '@/lib/auth';
import { getAuditLogs } from '@/lib/drainwatch';

export async function GET(request: Request) {
  const result = requireRole(request, 'officer');
  if ('error' in result) return result.error;

  const logs = await getAuditLogs();
  return Response.json(
    ListOfficerAuditLogsResponse.parse(
      logs.map((log) => ({
        id: log.id,
        action: log.action,
        actor: log.actor,
        report_id: log.reportId,
        created_at: log.createdAt,
      })),
    ),
  );
}

