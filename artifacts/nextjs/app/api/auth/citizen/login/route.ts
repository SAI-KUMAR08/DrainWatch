export const dynamic = 'force-dynamic';

import { scrypt, timingSafeEqual } from 'node:crypto';
import { CitizenLoginBody, CitizenLoginResponse } from '@workspace/api-zod';
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
  try {
    const body = await request.json().catch(() => null);
    const parsed = CitizenLoginBody.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Enter a valid email and password' }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const password = parsed.data.password;

    // Look up registered citizen via raw SQL (avoids any Drizzle schema mismatch)
    let citizen: { id: string; name: string; email: string; password_hash: string } | undefined;
    try {
      const result = await db.execute(
        sql`SELECT id, name, email, password_hash FROM citizens WHERE email = ${email} LIMIT 1`
      );
      citizen = result.rows[0] as typeof citizen;
    } catch (dbErr) {
      console.error('[citizen/login] DB lookup error:', dbErr);
    }

    if (citizen) {
      const ok = await verifyPassword(password, citizen.password_hash);
      if (!ok) {
        return Response.json({ error: 'Incorrect email or password.' }, { status: 401 });
      }
      return Response.json(
        CitizenLoginResponse.parse({
          token: createSession({ role: 'citizen', email: citizen.email, name: citizen.name }),
          role: 'citizen',
          name: citizen.name,
          email: citizen.email,
        }),
      );
    }

    // Demo fallback
    if (email === 'resident@drainwatch.in' && password === 'report') {
      return Response.json(
        CitizenLoginResponse.parse({
          token: createSession({ role: 'citizen', email, name: 'Hyderabad resident' }),
          role: 'citizen',
          name: 'Hyderabad resident',
          email,
        }),
      );
    }

    return Response.json({ error: 'No account found with that email. Please register first.' }, { status: 401 });

  } catch (err: any) {
    const drizzleMsg = err instanceof Error ? err.message : String(err);
    const causeMsg = err?.cause?.message || '';
    const detail = causeMsg ? `${drizzleMsg} | pg: ${causeMsg}` : drizzleMsg;
    console.error('[citizen/login] Unhandled error:', detail);
    return Response.json({ error: 'Login failed due to a server error. Please try again.', detail }, { status: 500 });
  }
}
