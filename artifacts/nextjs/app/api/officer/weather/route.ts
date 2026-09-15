export const dynamic = 'force-dynamic';

import { GetOfficerWeatherResponse } from '@workspace/api-zod';
import { requireRole } from '@/lib/auth';

export async function GET(request: Request) {
  const result = requireRole(request, 'officer');
  if ('error' in result) return result.error;

  // Weather integration not yet connected — risk scoring uses available signals.
  return Response.json(
    GetOfficerWeatherResponse.parse({
      status: 'unavailable',
      rainfall_mm: null,
      source: null,
      observed_at: null,
    }),
  );
}

