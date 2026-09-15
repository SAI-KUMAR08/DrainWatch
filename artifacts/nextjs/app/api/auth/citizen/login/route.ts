export const dynamic = 'force-dynamic';

import { CitizenLoginBody, CitizenLoginResponse } from '@workspace/api-zod';
import { createSession } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = CitizenLoginBody.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Enter a valid email and password' }, { status: 400 });
  }
  if (parsed.data.email !== 'resident@drainwatch.in' || parsed.data.password !== 'report') {
    return Response.json({ error: 'Invalid citizen credentials' }, { status: 401 });
  }
  return Response.json(
    CitizenLoginResponse.parse({
      token: createSession({ role: 'citizen', email: parsed.data.email, name: 'Hyderabad resident' }),
      role: 'citizen',
      name: 'Hyderabad resident',
      email: parsed.data.email,
    }),
  );
}

