export const dynamic = 'force-dynamic';

import { ListCitizenReportsResponse, CreateCitizenReportBody, CreateCitizenReportResponse } from '@workspace/api-zod';
import { requireRole } from '@/lib/auth';
import { db, reportsTable } from '@workspace/db';
import { desc, eq } from 'drizzle-orm';
import { toReportResponse, insertCitizenReport } from '@/lib/drainwatch';

export async function GET(request: Request) {
  const result = requireRole(request, 'citizen');
  if ('error' in result) return result.error;

  const reports = await db
    .select()
    .from(reportsTable)
    .where(eq(reportsTable.reporterEmail, result.auth.email))
    .orderBy(desc(reportsTable.createdAt));

  return Response.json(ListCitizenReportsResponse.parse(reports.map(toReportResponse)));
}

export async function POST(request: Request) {
  const result = requireRole(request, 'citizen');
  if ('error' in result) return result.error;

  const body = await request.json().catch(() => null);
  const parsed = CreateCitizenReportBody.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const report = await insertCitizenReport({
    ...parsed.data,
    reporter_email: result.auth.email,
  });

  return Response.json(CreateCitizenReportResponse.parse(toReportResponse(report!)), { status: 201 });
}

