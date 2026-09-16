export const dynamic = 'force-dynamic';

import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createSession } from '@/lib/auth';
import { db } from '@workspace/db';
import { sql } from 'drizzle-orm';

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

async function verifyHash(password: string, stored: string): Promise<boolean> {
  try {
    const [salt, hash] = stored.split(':');
    const hashBuf = Buffer.from(hash, 'hex');
    const derived = await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
    });
    return timingSafeEqual(hashBuf, derived);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = VerifyBody.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: 'Please provide a valid email and 6-digit OTP.' }, { status: 400 });
    }

    const { email, otp } = parsed.data;
    const key = email.toLowerCase();

    // Ensure tables exist (all raw SQL to avoid any Drizzle schema mismatch)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pending_registrations (
        email TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        otp TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      )
    `).catch(() => {});

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS citizens (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `).catch(() => {});

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS citizens_email_idx ON citizens(email)
    `).catch(() => {});

    // Read pending registration
    const pendingResult = await db.execute(
      sql`SELECT name, password, otp, expires_at FROM pending_registrations WHERE email = ${key} LIMIT 1`
    );

    const pending = pendingResult.rows[0] as {
      name: string; password: string; otp: string; expires_at: string;
    } | undefined;

    if (!pending) {
      return Response.json(
        { error: 'No pending registration found. Please click "Register" again to get a new code.' },
        { status: 404 },
      );
    }

    if (Date.now() > new Date(pending.expires_at).getTime()) {
      await db.execute(sql`DELETE FROM pending_registrations WHERE email = ${key}`).catch(() => {});
      return Response.json(
        { error: 'Your verification code has expired. Please register again.' },
        { status: 410 },
      );
    }

    if (otp !== String(pending.otp)) {
      return Response.json({ error: 'Incorrect verification code. Please try again.' }, { status: 401 });
    }

    // OTP matched — remove pending row
    await db.execute(sql`DELETE FROM pending_registrations WHERE email = ${key}`).catch(() => {});

    // Check if citizen already exists
    const existingResult = await db.execute(
      sql`SELECT id FROM citizens WHERE email = ${key} LIMIT 1`
    );

    if (existingResult.rows.length === 0) {
      const passwordHash = await hashPassword(pending.password);
      const id = randomUUID();
      const name = String(pending.name);
      await db.execute(
        sql`INSERT INTO citizens (id, name, email, password_hash) VALUES (${id}, ${name}, ${key}, ${passwordHash})`
      );
    }

    const name = String(pending.name);
    const token = createSession({ role: 'citizen', email: key, name });

    return Response.json({ token, role: 'citizen', name, email: key });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[register/verify] Unhandled error:', msg);
    return Response.json(
      { error: 'Registration failed due to a server error. Please try again.', detail: msg },
      { status: 500 },
    );
  }
}
