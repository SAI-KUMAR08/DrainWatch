export const dynamic = 'force-dynamic';

import { ListCitizenReportsResponse, CreateCitizenReportBody, CreateCitizenReportResponse } from '@workspace/api-zod';
import { requireRole } from '@/lib/auth';
import { db, reportsTable } from '@workspace/db';
import { desc, eq, sql } from 'drizzle-orm';
import { toReportResponse, insertCitizenReport } from '@/lib/drainwatch';

export async function GET(request: Request) {
  const result = requireRole(request, 'citizen');
  if ('error' in result) return result.error;

  const email = result.auth.email.toLowerCase().trim();
  const reports = await db
    .select()
    .from(reportsTable)
    .where(
      email === 'resident@drainwatch.in'
        ? sql`(${reportsTable.reporterEmail} = ${email} OR ${reportsTable.isDemo} = true)`
        : sql`lower(${reportsTable.reporterEmail}) = ${email}`
    )
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

  const photoUrl = typeof body === 'object' && body !== null && 'photo_url' in body && typeof (body as any).photo_url === 'string' ? (body as any).photo_url : null;
  const report = await insertCitizenReport({
    ...parsed.data,
    reporter_email: result.auth.email,
    photo_url: photoUrl,
  });

  return Response.json(CreateCitizenReportResponse.parse(toReportResponse(report!)), { status: 201 });
}

