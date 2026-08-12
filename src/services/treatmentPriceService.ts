import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { treatmentPriceFromDoc } from "@/lib/firebase/converters";
import type { AppointmentType, TreatmentPrice } from "@/lib/types";

// One doc per AppointmentType (9 total) — cheap to read as a whole
// collection, no composite index needed.
export async function listPrices(): Promise<TreatmentPrice[]> {
  const snap = await adminDb.collection("treatmentPrices").get();
  return snap.docs.map((d) => treatmentPriceFromDoc(d.id, d.data()));
}

export async function setDefaultFee(
  treatmentType: AppointmentType,
  fee: number,
): Promise<void> {
  await adminDb
    .collection("treatmentPrices")
    .doc(treatmentType)
    .set(
      { defaultFee: fee, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
}

// fee === null removes this dentist's override (falls back to default_fee).
export async function setDentistFee(
  treatmentType: AppointmentType,
  dentistId: string,
  fee: number | null,
): Promise<void> {
  await adminDb
    .collection("treatmentPrices")
    .doc(treatmentType)
    .set(
      {
        dentistFees: { [dentistId]: fee === null ? FieldValue.delete() : fee },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}
