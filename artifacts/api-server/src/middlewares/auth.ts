import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

export type PortalRole = "citizen" | "officer";

export type AuthContext = {
  role: PortalRole;
  email: string;
  name: string;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

const secret = () => process.env.SESSION_SECRET ?? "drainwatch-development-secret";

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createSession(context: AuthContext) {
  const payload = encode(JSON.stringify({ ...context, issuedAt: Date.now() }));
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function getAuthContext(request: Request): AuthContext | null {
  const value = request.headers.authorization;
  if (!value?.startsWith("Bearer ")) return null;

  const token = value.slice("Bearer ".length);
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
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
      (parsed.role !== "citizen" && parsed.role !== "officer") ||
      typeof parsed.email !== "string" ||
      typeof parsed.name !== "string"
    ) {
      return null;
    }
    return { role: parsed.role, email: parsed.email, name: parsed.name };
  } catch {
    return null;
  }
}

export function requireRole(role: PortalRole): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    const context = getAuthContext(request);
    if (!context) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    if (context.role !== role) {
      response.status(403).json({ error: `${role} role required` });
      return;
    }
    request.auth = context;
    next();
  };
}