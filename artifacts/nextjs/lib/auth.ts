// Auth helpers for API route handlers — same HMAC-SHA256 logic as the Express middleware.
import { createHmac, timingSafeEqual } from 'node:crypto';

export type PortalRole = 'citizen' | 'officer';

export type AuthContext = {
  role: PortalRole;
  email: string;
  name: string;
};

const secret = () => process.env.SESSION_SECRET ?? 'drainwatch-development-secret';

function encode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function createSession(context: AuthContext) {
  const payload = encode(JSON.stringify({ ...context, issuedAt: Date.now() }));
  const signature = createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function getAuthContext(authHeader: string | null): AuthContext | null {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length);
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(decode(payload)) as AuthContext & { issuedAt?: number };
    if (
      (parsed.role !== 'citizen' && parsed.role !== 'officer') ||
      typeof parsed.email !== 'string' ||
      typeof parsed.name !== 'string'
    ) {
      return null;
    }
    return { role: parsed.role, email: parsed.email, name: parsed.name };
  } catch {
    return null;
  }
}

/** Requires a matching role or returns a 401/403 NextResponse. Returns the AuthContext on success. */
export function requireRole(
  request: Request,
  role: PortalRole,
): { auth: AuthContext } | { error: Response } {
  const auth = getAuthContext(request.headers.get('authorization'));
  if (!auth) {
    return {
      error: Response.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }
  if (auth.role !== role) {
    return {
      error: Response.json({ error: `${role} role required` }, { status: 403 }),
    };
  }
  return { auth };
}
