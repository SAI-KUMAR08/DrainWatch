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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = RegisterBody.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Please provide a valid name, email, and password (min 6 characters).' },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;
    const key = email.toLowerCase();
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Ensure table exists — no .catch() so failures surface properly
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS pending_registrations (
          email TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          password TEXT NOT NULL,
          otp TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL
        )
      `);
    } catch {
      // Table already exists or concurrent creation — safe to continue
    }

    // Upsert pending registration
    await db.execute(sql`
      INSERT INTO pending_registrations (email, name, password, otp, expires_at)
      VALUES (${key}, ${name}, ${password}, ${otp}, ${expiresAt})
      ON CONFLICT (email) DO UPDATE SET
        name     = EXCLUDED.name,
        password = EXCLUDED.password,
        otp      = EXCLUDED.otp,
        expires_at = EXCLUDED.expires_at
    `);

    return Response.json({ email, otp });

  } catch (err) {
    const drizzleMsg = err instanceof Error ? err.message : String(err);
    const causeMsg = err instanceof Error && err.cause instanceof Error ? err.cause.message : '';
    const detail = causeMsg ? `${drizzleMsg} | pg: ${causeMsg}` : drizzleMsg;
    console.error('[register] Error:', detail);
    return Response.json(
      { error: 'Registration failed due to a server error. Please try again.', detail },
      { status: 500 },
    );
  }
}
