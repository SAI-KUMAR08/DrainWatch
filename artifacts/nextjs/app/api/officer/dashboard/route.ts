export const dynamic = 'force-dynamic';

import { GetOfficerDashboardResponse } from '@workspace/api-zod';
import { requireRole } from '@/lib/auth';
import { getDashboardStats } from '@/lib/drainwatch';

export async function GET(request: Request) {
  const result = requireRole(request, 'officer');
  if ('error' in result) return result.error;
  return Response.json(GetOfficerDashboardResponse.parse(await getDashboardStats()));
}

