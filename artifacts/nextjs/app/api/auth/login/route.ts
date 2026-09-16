export const dynamic = 'force-dynamic';

import { scrypt, timingSafeEqual } from 'node:crypto';
import { LoginBody, LoginResponse } from '@workspace/api-zod';
import { createSession } from '@/lib/auth';
import { db } from '@workspace/db';
import { sql } from 'drizzle-orm';

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [salt, hash] = stored.split(':');
    const hashBuffer = Buffer.from(hash, 'hex');
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
    });
    return timingSafeEqual(hashBuffer, derivedKey);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = LoginBody.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Enter a valid email and password' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const password = parsed.data.password;

  // 1. Check registered citizen in DB
  try {
    const result = await db.execute(
      sql`SELECT id, name, email, password_hash FROM citizens WHERE email = ${email} LIMIT 1`
    );
    const citizen = result.rows[0] as { id: string; name: string; email: string; password_hash: string } | undefined;
    if (citizen) {
      const ok = await verifyPassword(password, citizen.password_hash);
      if (ok) {
        return Response.json(
          LoginResponse.parse({
            token: createSession({ role: 'citizen', email: citizen.email, name: citizen.name }),
            role: 'citizen',
            name: citizen.name,
            email: citizen.email,
          }),
        );
      }
    }
  } catch (dbErr) {
    console.error('[auth/login] DB lookup error:', dbErr);
  }

  // 2. Demo citizen fallback
  if (email === 'resident@drainwatch.in' && password === 'report') {
    return Response.json(
      LoginResponse.parse({
        token: createSession({ role: 'citizen', email, name: 'Hyderabad resident' }),
        role: 'citizen',
        name: 'Hyderabad resident',
        email,
      }),
    );
  }

  // 3. Demo officer fallback
  if (email === 'control@drainwatch.in' && password === 'watchtower') {
    return Response.json(
      LoginResponse.parse({
        token: createSession({ role: 'officer', email, name: 'Municipal response desk' }),
        role: 'officer',
        name: 'Municipal response desk',
        email,
      }),
    );
  }

  return Response.json({ error: 'Invalid credentials' }, { status: 401 });
}

