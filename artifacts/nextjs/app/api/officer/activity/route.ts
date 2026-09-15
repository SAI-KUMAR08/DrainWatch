export const dynamic = 'force-dynamic';

import { ListOfficerActivityResponse } from '@workspace/api-zod';
import { requireRole } from '@/lib/auth';
import { db, reportsTable } from '@workspace/db';
import { desc } from 'drizzle-orm';
import { hazardName } from '@/lib/utils';

export async function GET(request: Request) {
  const result = requireRole(request, 'officer');
  if ('error' in result) return result.error;

  const reports = await db.select().from(reportsTable).orderBy(desc(reportsTable.updatedAt)).limit(20);
  return Response.json(
    ListOfficerActivityResponse.parse(
      reports.map((report) => ({
        id: `activity-${report.id}`,
        text: `${report.hazardType.replaceAll('_', ' ')} at ${report.locationName}`,
        severity: report.severity,
        status: report.status,
        created_at: report.updatedAt,
      })),
    ),
  );
}

