export const dynamic = 'force-dynamic';

import { z } from 'zod';
import { pendingRegistrations } from '../route';
import { createSession } from '@/lib/auth';

const VerifyBody = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

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

  // OTP matched — registration complete
  pendingRegistrations.delete(key);

  const token = createSession({ role: 'citizen', email: pending.email, name: pending.name });

  return Response.json({ token, role: 'citizen', name: pending.name, email: pending.email });
}
