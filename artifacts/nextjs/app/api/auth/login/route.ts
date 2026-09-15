export const dynamic = 'force-dynamic';

import { LoginBody, LoginResponse, CitizenLoginBody, CitizenLoginResponse, OfficerLoginBody, OfficerLoginResponse } from '@workspace/api-zod';
import { createSession } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = LoginBody.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Enter a valid email and password' }, { status: 400 });
  }

  if (parsed.data.email === 'resident@drainwatch.in' && parsed.data.password === 'report') {
    return Response.json(
      LoginResponse.parse({
        token: createSession({ role: 'citizen', email: parsed.data.email, name: 'Hyderabad resident' }),
        role: 'citizen',
        name: 'Hyderabad resident',
        email: parsed.data.email,
      }),
    );
  }

  if (parsed.data.email === 'control@drainwatch.in' && parsed.data.password === 'watchtower') {
    return Response.json(
      LoginResponse.parse({
        token: createSession({ role: 'officer', email: parsed.data.email, name: 'Municipal response desk' }),
        role: 'officer',
        name: 'Municipal response desk',
        email: parsed.data.email,
      }),
    );
  }

  return Response.json({ error: 'Invalid credentials' }, { status: 401 });
}

