import { adminAuth } from "@/lib/firebase/admin";

export interface VerifiedSession {
  uid: string;
}

/** Full verification (signature + revocation) — Node-only, Admin SDK.
 * Never import this from src/middleware.ts (Edge runtime); see session.ts. */
export async function verifySession(
  cookieValue: string | undefined,
): Promise<VerifiedSession | null> {
  if (!cookieValue) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(cookieValue, true);
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}
