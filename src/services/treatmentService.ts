import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { treatmentFromDoc } from "@/lib/firebase/converters";
import { recomputeStats } from "@/services/patientService";
import type { AppointmentType, Treatment, TreatmentStatus } from "@/lib/types";

export async function listByPatient(patientId: string): Promise<Treatment[]> {
  const snap = await adminDb
    .collection("treatments")
    .where("patientId", "==", patientId)
    .get();
  const rows = snap.docs.map((d) => treatmentFromDoc(d.id, d.data()));
  // Postgres ordered by treatment_date desc nulls-last, then created_at desc —
  // Firestore can't express nulls-last with a second sort key in one query,
  // so replicate it client-side.
  return rows.sort((a, b) => {
    if (a.treatment_date && b.treatment_date) {
      const cmp = b.treatment_date.localeCompare(a.treatment_date);
      if (cmp !== 0) return cmp;
    } else if (a.treatment_date || b.treatment_date) {
      return a.treatment_date ? -1 : 1;
    }
    return b.created_at.localeCompare(a.created_at);
  });
}

export interface NewTreatmentInput {
  patient_id: string;
  appointment_id?: string | null;
  dentist_id?: string | null;
  treatment_type?: AppointmentType | null;
  treatment_name: string;
  tooth_number?: string | null;
  diagnosis?: string | null;
  status?: TreatmentStatus;
  notes?: string | null;
  treatment_date?: string | null;
  cost?: number;
  follow_up_date?: string | null;
}

export async function createTreatment(input: NewTreatmentInput): Promise<Treatment> {
  const ref = adminDb.collection("treatments").doc();
  const now = FieldValue.serverTimestamp();
  await ref.set({
    patientId: input.patient_id,
    appointmentId: input.appointment_id ?? null,
    dentistId: input.dentist_id ?? null,
    treatmentType: input.treatment_type ?? null,
    treatmentName: input.treatment_name,
    toothNumber: input.tooth_number ?? null,
    diagnosis: input.diagnosis ?? null,
    status: input.status ?? "planned",
    notes: input.notes ?? null,
    treatmentDate: input.treatment_date ?? null,
    cost: input.cost ?? 0,
    followUpDate: input.follow_up_date ?? null,
    createdAt: now,
    updatedAt: now,
  });
  await recomputeStats(input.patient_id);
  const snap = await ref.get();
  return treatmentFromDoc(snap.id, snap.data()!);
}

export async function updateTreatment(
  id: string,
  patch: Partial<NewTreatmentInput>,
): Promise<void> {
  const ref = adminDb.collection("treatments").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Treatment not found");
  const patientId = snap.data()!.patientId as string;

  const data: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (patch.appointment_id !== undefined) data.appointmentId = patch.appointment_id;
  if (patch.dentist_id !== undefined) data.dentistId = patch.dentist_id;
  if (patch.treatment_type !== undefined) data.treatmentType = patch.treatment_type;
  if (patch.treatment_name !== undefined) data.treatmentName = patch.treatment_name;
  if (patch.tooth_number !== undefined) data.toothNumber = patch.tooth_number;
  if (patch.diagnosis !== undefined) data.diagnosis = patch.diagnosis;
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.notes !== undefined) data.notes = patch.notes;
  if (patch.treatment_date !== undefined) data.treatmentDate = patch.treatment_date;
  if (patch.cost !== undefined) data.cost = patch.cost;
  if (patch.follow_up_date !== undefined) data.followUpDate = patch.follow_up_date;

  await ref.update(data);
  await recomputeStats(patientId);
}
