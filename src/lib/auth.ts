import { cookies } from "next/headers";
import { adminDb } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/session";
import { verifySession } from "@/lib/firebase/verify-session";
import { profileFromDoc } from "@/lib/firebase/converters";
import type { Profile } from "@/lib/types";

/** The signed-in staff member's profile, or null. Use in server components. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return null;

  const snap = await adminDb.collection("profiles").doc(session.uid).get();
  if (!snap.exists) return null;
  return profileFromDoc(snap.id, snap.data()!);
}
