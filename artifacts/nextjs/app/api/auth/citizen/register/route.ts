export const dynamic = 'force-dynamic';

import { z } from 'zod';

const RegisterBody = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

type PendingRegistration = {
  name: string;
  email: string;
  password: string;
  otp: string;
  expiresAt: number;
};

// In-memory store for pending registrations (keyed by lowercase email)
// In production this would live in the database.
declare global {
  // eslint-disable-next-line no-var
  var __drainwatch_pending_registrations: Map<string, PendingRegistration> | undefined;
}
const pendingRegistrations: Map<string, PendingRegistration> =
  globalThis.__drainwatch_pending_registrations ??
  (globalThis.__drainwatch_pending_registrations = new Map());

export { pendingRegistrations };

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  pendingRegistrations.set(key, { name, email, password, otp, expiresAt });

  // The OTP is returned in the response body and displayed on-screen.
  // No email delivery is used — this is by design (screen-displayed OTP mode).
  return Response.json({ email, otp });
}
