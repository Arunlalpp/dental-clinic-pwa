// Edge-safe — no firebase-admin import here. middleware.ts runs on the Edge
// runtime, which can't load firebase-admin's Node-only dependencies
// (node:net, node:https, ...), so this file must stay free of that import
// chain. Full verification lives in verify-session.ts (Node-only, used by
// getCurrentProfile() and the session API route, never by middleware).

export const SESSION_COOKIE_NAME = "session";
// Session verification skips the revocation check (see verify-session.ts) to
// avoid a network round trip on every request. That trades away instant
// revocation for speed, so the cookie lifetime is kept short to bound how
// long a disabled/reset account's old session stays usable.
export const SESSION_EXPIRES_IN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/**
 * Cheap, unverified presence check — used by middleware. Real verification
 * happens server-side in verifySession() (verify-session.ts), called from
 * getCurrentProfile() on every request to the (app) route group.
 */
export function hasSessionCookie(cookieValue: string | undefined): boolean {
  return Boolean(cookieValue);
}
