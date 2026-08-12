import { adminDb } from "@/lib/firebase/admin";

export interface DentistOption {
  id: string;
  name: string;
}

/**
 * Active dentists for the booking flow. dentists.profileName is denormalized
 * at write time (see provisionStaffUserAction / staff actions), so this is a
 * single-collection read — Firestore has no join for the old
 * dentists(profile:profiles(name)) nested select.
 */
export async function listActiveDentists(): Promise<DentistOption[]> {
  const snap = await adminDb.collection("dentists").where("active", "==", true).get();
  return snap.docs.map((d) => ({
    id: d.id,
    name: (d.data().profileName as string) ?? "Dentist",
  }));
}
