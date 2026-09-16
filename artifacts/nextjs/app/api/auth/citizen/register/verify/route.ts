export const dynamic = 'force-dynamic';

import { scrypt, randomBytes } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
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

// Ensure tables exist (safe no-op if already present)
async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pending_registrations (
      email TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS citizens (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS citizens_email_idx ON citizens(email)
  `);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = VerifyBody.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: 'Please provide a valid email and 6-digit OTP.' }, { status: 400 });
  }

  const { email, otp } = parsed.data;
  const key = email.toLowerCase();

  try {
    await ensureTables();
  } catch { /* ignore */ }

  // Read pending registration from DB
  const rows = await db.execute(
    sql`SELECT name, password, otp, expires_at FROM pending_registrations WHERE email = ${key} LIMIT 1`
  );

  const pending = rows.rows[0] as { name: string; password: string; otp: string; expires_at: string } | undefined;

  if (!pending) {
    return Response.json(
      { error: 'No pending registration found. Please start registration again.' },
      { status: 404 },
    );
  }

  if (Date.now() > new Date(pending.expires_at).getTime()) {
    await db.execute(sql`DELETE FROM pending_registrations WHERE email = ${key}`);
    return Response.json(
      { error: 'Your verification code has expired. Please register again.' },
      { status: 410 },
    );
  }

  if (otp !== pending.otp) {
    return Response.json({ error: 'Incorrect verification code. Please try again.' }, { status: 401 });
  }

  // OTP matched — clean up pending row
  await db.execute(sql`DELETE FROM pending_registrations WHERE email = ${key}`);

  // Save citizen if not already exists
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

  const name = pending.name;
  const token = createSession({ role: 'citizen', email: key, name });

  return Response.json({ token, role: 'citizen', name, email: key });
}
