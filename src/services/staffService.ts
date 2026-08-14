import { adminDb } from "@/lib/firebase/admin";
import { profileFromDoc } from "@/lib/firebase/converters";
import type { Profile } from "@/lib/types";

/** All staff profiles, sorted by name in-app (dataset is small; avoids a Firestore index). */
export async function listStaffProfiles(): Promise<Profile[]> {
  const snap = await adminDb.collection("profiles").get();
  return snap.docs
    .map((d) => profileFromDoc(d.id, d.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getStaffProfile(id: string): Promise<Profile | null> {
  const snap = await adminDb.collection("profiles").doc(id).get();
  return snap.exists ? profileFromDoc(snap.id, snap.data()!) : null;
}
