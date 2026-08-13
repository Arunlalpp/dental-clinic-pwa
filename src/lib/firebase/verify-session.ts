import { adminAuth } from "@/lib/firebase/admin";

export interface VerifiedSession {
  uid: string;
}

/**
 * Signature-only verification — Node-only, Admin SDK. Deliberately skips the
 * checkRevoked flag: that check costs a network round trip to Firebase on
 * every single request (this runs on every navigation via getCurrentProfile),
 * which dominated the sign-in-to-dashboard delay. The cookie's short lifetime
 * (see SESSION_EXPIRES_IN_MS) bounds the resulting exposure instead.
 * Never import this from src/middleware.ts (Edge runtime); see session.ts. */
export async function verifySession(
  cookieValue: string | undefined,
): Promise<VerifiedSession | null> {
  if (!cookieValue) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(cookieValue, false);
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}
