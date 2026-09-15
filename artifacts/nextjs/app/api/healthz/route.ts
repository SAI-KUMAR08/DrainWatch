export const dynamic = 'force-dynamic';

import { HealthCheckResponse } from '@workspace/api-zod';

export async function GET() {
  return Response.json(HealthCheckResponse.parse({ status: 'ok' }));
}

