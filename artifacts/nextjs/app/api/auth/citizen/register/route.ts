export const dynamic = 'force-dynamic';

import { z } from 'zod';
import { db } from '@workspace/db';
import { sql } from 'drizzle-orm';

const RegisterBody = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function ensurePendingTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pending_registrations (
      email TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = RegisterBody.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: 'Please provide a valid name, email address, and a password of at least 6 characters.' },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;
  const key = email.toLowerCase();
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  try {
    await ensurePendingTable();
  } catch { /* ignore */ }

  // Upsert pending registration into DB (replaces any previous attempt)
  await db.execute(sql`
    INSERT INTO pending_registrations (email, name, password, otp, expires_at)
    VALUES (${key}, ${name}, ${password}, ${otp}, ${expiresAt.toISOString()})
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      password = EXCLUDED.password,
      otp = EXCLUDED.otp,
      expires_at = EXCLUDED.expires_at
  `);

  // The OTP is returned in the response body and displayed on-screen.
  return Response.json({ email, otp });
}
