export const dynamic = 'force-dynamic';

import { scrypt, timingSafeEqual } from 'node:crypto';
import { CitizenLoginBody, CitizenLoginResponse } from '@workspace/api-zod';
import { createSession } from '@/lib/auth';
import { db, citizensTable } from '@workspace/db';
import { eq } from 'drizzle-orm';

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
  const parsed = CitizenLoginBody.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Enter a valid email and password' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;

  // Look up registered citizen
  let citizens: typeof citizensTable.$inferSelect[] = [];
  try {
    citizens = await db
      .select()
      .from(citizensTable)
      .where(eq(citizensTable.email, email))
      .limit(1);
  } catch {
    // citizens table may not exist yet — fall through to demo credentials
  }

  if (citizens.length > 0) {
    const citizen = citizens[0];
    const ok = await verifyPassword(password, citizen.passwordHash);
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

  // Demo fallback — remove once first real user registers
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

  return Response.json({ error: 'No account found. Please register first.' }, { status: 401 });
}
