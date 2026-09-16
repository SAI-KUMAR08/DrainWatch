export const dynamic = 'force-dynamic';

import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { pendingRegistrations } from '@/lib/pending-registrations';
import { createSession } from '@/lib/auth';
import { db, citizensTable } from '@workspace/db';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

const VerifyBody = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });
  return `${salt}:${hash.toString('hex')}`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = VerifyBody.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: 'Please provide a valid email and 6-digit OTP.' }, { status: 400 });
  }

  const { email, otp } = parsed.data;
  const key = email.toLowerCase();
  const pending = pendingRegistrations.get(key);

  if (!pending) {
    return Response.json(
      { error: 'No pending registration found for this email. Please register again.' },
      { status: 404 },
    );
  }

  if (Date.now() > pending.expiresAt) {
    pendingRegistrations.delete(key);
    return Response.json(
      { error: 'Your verification code has expired. Please register again.' },
      { status: 410 },
    );
  }

  if (otp !== pending.otp) {
    return Response.json({ error: 'Incorrect verification code. Please try again.' }, { status: 401 });
  }

  // OTP matched — create citizens table if needed, then save user
  pendingRegistrations.delete(key);

  try {
    await db.execute(
      sql`CREATE TABLE IF NOT EXISTS citizens (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS citizens_email_idx ON citizens(email)`,
    );
  } catch {
    // Table already exists — ignore
  }

  // Check email not already registered
  const existing = await db
    .select({ id: citizensTable.id })
    .from(citizensTable)
    .where(eq(citizensTable.email, key))
    .limit(1);

  if (existing.length === 0) {
    const passwordHash = await hashPassword(pending.password);
    await db.insert(citizensTable).values({
      id: randomUUID(),
      name: pending.name,
      email: key,
      passwordHash,
    });
  }

  const token = createSession({ role: 'citizen', email: key, name: pending.name });

  return Response.json({ token, role: 'citizen', name: pending.name, email: key });
}
