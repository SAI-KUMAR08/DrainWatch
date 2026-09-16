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
    const key = email.toLowerCase().trim();

    // Read pending registration
    const pendingResult = await db.execute(
      sql`SELECT name, password, otp, expires_at, (expires_at < NOW()) AS is_expired FROM pending_registrations WHERE email = ${key} LIMIT 1`
    );

    const pending = pendingResult.rows[0] as {
      name: string; password: string; otp: string; expires_at: string; is_expired?: boolean;
    } | undefined;

    if (!pending) {
      return Response.json(
        { error: 'No pending registration found for this email. Please register again to get a new code.' },
        { status: 404 },
      );
    }

    const isExpired = pending.is_expired ?? (Date.now() > new Date(pending.expires_at).getTime());
    if (isExpired) {
      await db.execute(sql`DELETE FROM pending_registrations WHERE email = ${key}`).catch(() => {});
      return Response.json(
        { error: 'Your verification code has expired. Please register again.' },
        { status: 410 },
      );
    }

    if (otp.trim() !== String(pending.otp).trim()) {
      return Response.json({ error: 'Incorrect verification code. Please try again.' }, { status: 401 });
    }

    // OTP matched — remove pending row
    await db.execute(sql`DELETE FROM pending_registrations WHERE email = ${key}`).catch(() => {});

    // Save or update citizen
    const name = String(pending.name);
    const passwordHash = await hashPassword(pending.password);

    const existingResult = await db.execute(
      sql`SELECT id FROM citizens WHERE email = ${key} LIMIT 1`
    );

    if (existingResult.rows.length === 0) {
      const id = randomUUID();
      await db.execute(
        sql`INSERT INTO citizens (id, name, email, password_hash) VALUES (${id}, ${name}, ${key}, ${passwordHash})`
      );
    } else {
      await db.execute(
        sql`UPDATE citizens SET name = ${name}, password_hash = ${passwordHash} WHERE email = ${key}`
      );
    }

    const token = createSession({ role: 'citizen', email: key, name });

    return Response.json({ token, role: 'citizen', name, email: key });

  } catch (err: any) {
    const drizzleMsg = err instanceof Error ? err.message : String(err);
    const causeMsg = err?.cause?.message || (err?.cause ? String(err.cause) : '');
    const pgDetail = err?.detail || err?.cause?.detail || '';
    const detailParts = [drizzleMsg, causeMsg ? `pg: ${causeMsg}` : '', pgDetail ? `detail: ${pgDetail}` : ''].filter(Boolean);
    const detail = detailParts.join(' | ');
    console.error('[register/verify] Unhandled error:', detail);
    return Response.json(
      { error: 'Registration failed due to a server error. Please try again.', detail },
      { status: 500 },
    );
  }
}
