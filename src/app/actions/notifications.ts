"use server";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentProfile } from "@/lib/auth";

export async function registerFcmTokenAction(token: string): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };

  await adminDb
    .collection("profiles")
    .doc(profile.id)
    .update({ fcmTokens: FieldValue.arrayUnion(token) });
  return { ok: true };
}

export async function unregisterFcmTokenAction(token: string): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };

  await adminDb
    .collection("profiles")
    .doc(profile.id)
    .update({ fcmTokens: FieldValue.arrayRemove(token) });
  return { ok: true };
}
