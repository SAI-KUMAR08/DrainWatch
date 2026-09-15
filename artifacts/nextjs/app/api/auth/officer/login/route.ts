export const dynamic = 'force-dynamic';

import { OfficerLoginBody, OfficerLoginResponse } from '@workspace/api-zod';
import { createSession } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = OfficerLoginBody.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Enter a valid email and password' }, { status: 400 });
  }
  if (parsed.data.email !== 'control@drainwatch.in' || parsed.data.password !== 'watchtower') {
    return Response.json({ error: 'Invalid officer credentials' }, { status: 401 });
  }
  return Response.json(
    OfficerLoginResponse.parse({
      token: createSession({ role: 'officer', email: parsed.data.email, name: 'Municipal response desk' }),
      role: 'officer',
      name: 'Municipal response desk',
      email: parsed.data.email,
    }),
  );
}

