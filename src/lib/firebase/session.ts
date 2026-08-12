// Edge-safe — no firebase-admin import here. middleware.ts runs on the Edge
// runtime, which can't load firebase-admin's Node-only dependencies
// (node:net, node:https, ...), so this file must stay free of that import
// chain. Full verification lives in verify-session.ts (Node-only, used by
// getCurrentProfile() and the session API route, never by middleware).

export const SESSION_COOKIE_NAME = "session";
export const SESSION_EXPIRES_IN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/**
 * Cheap, unverified presence check — used by middleware. Real verification
 * happens server-side in verifySession() (verify-session.ts), called from
 * getCurrentProfile() on every request to the (app) route group.
 */
export function hasSessionCookie(cookieValue: string | undefined): boolean {
  return Boolean(cookieValue);
}
