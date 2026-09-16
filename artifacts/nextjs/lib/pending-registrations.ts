// Shared in-memory store for pending citizen registrations.
// Keyed by lowercase email. In production this would live in the database.

export type PendingRegistration = {
  name: string;
  email: string;
  password: string;
  otp: string;
  expiresAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __drainwatch_pending_registrations: Map<string, PendingRegistration> | undefined;
}

export const pendingRegistrations: Map<string, PendingRegistration> =
  globalThis.__drainwatch_pending_registrations ??
  (globalThis.__drainwatch_pending_registrations = new Map());
