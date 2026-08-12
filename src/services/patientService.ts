import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { patientFromDoc } from "@/lib/firebase/converters";
import { normalizePhone } from "@/lib/utils";
import type { Patient, PatientPreview } from "@/lib/types";

function toPreview(p: Patient): PatientPreview {
  return {
    ...p,
    last_visit: p.stats.last_visit,
    last_treatment: p.stats.last_treatment,
    total_visits: p.stats.total_visits,
    outstanding: p.stats.outstanding,
  };
}

export async function getPatient(id: string): Promise<Patient | null> {
  const snap = await adminDb.collection("patients").doc(id).get();
  if (!snap.exists) return null;
  return patientFromDoc(snap.id, snap.data()!);
}

export async function getPatientPreview(id: string): Promise<PatientPreview | null> {
  const patient = await getPatient(id);
  return patient ? toPreview(patient) : null;
}

/** Default (no query) listing — server-side counterpart of the client-only
 * searchPatients()'s empty-query branch, used for the patients page's
 * initial SSR fetch. */
export async function listRecentPatients(limitCount = 20): Promise<PatientPreview[]> {
  const snap = await adminDb
    .collection("patients")
    .orderBy("createdAt", "desc")
    .limit(limitCount)
    .get();
  return snap.docs.map((d) => toPreview(patientFromDoc(d.id, d.data())));
}

/** Stats are denormalized onto the patient doc (see recomputeStats), so
 * turning patients into previews is now a trivial map — no fan-out queries. */
export function enrichPreviews(patients: Patient[]): PatientPreview[] {
  return patients.map(toPreview);
}

export interface NewPatientInput {
  full_name: string;
  phone: string;
  email?: string | null;
  date_of_birth?: string | null;
  gender?: Patient["gender"];
  address?: string | null;
  medical_notes?: string | null;
  allergies?: string | null;
  emergency_contact?: string | null;
}

/**
 * Insert a patient inside a transaction that also reserves the
 * normalized-phone uniqueness slot (phoneIndex) and increments the shared
 * patient_number counter — the Firestore equivalent of the Postgres unique
 * constraint + sequence trigger.
 */
export async function createPatient(
  input: NewPatientInput,
): Promise<{ patient: Patient | null; duplicate: boolean }> {
  const normalized = normalizePhone(input.phone);
  if (!normalized) throw new Error("A valid phone number is required");

  const phoneRef = adminDb.collection("phoneIndex").doc(normalized);
  const counterRef = adminDb.collection("counters").doc("patients");
  const patientRef = adminDb.collection("patients").doc();

  const result = await adminDb.runTransaction(async (tx) => {
    const [phoneSnap, counterSnap] = await Promise.all([
      tx.get(phoneRef),
      tx.get(counterRef),
    ]);
    if (phoneSnap.exists) return { duplicate: true as const, id: null };

    const nextSeq = ((counterSnap.data()?.seq as number) ?? 0) + 1;
    const patientNumber = `P${String(nextSeq).padStart(6, "0")}`;
    const now = FieldValue.serverTimestamp();

    tx.set(counterRef, { seq: nextSeq });
    tx.set(phoneRef, { patientId: patientRef.id });
    tx.set(patientRef, {
      patientNumber,
      fullName: input.full_name,
      fullNameLower: input.full_name.toLowerCase(),
      phone: input.phone,
      normalizedPhone: normalized,
      email: input.email ?? null,
      emailLower: input.email ? input.email.toLowerCase() : null,
      dateOfBirth: input.date_of_birth ?? null,
      gender: input.gender ?? null,
      address: input.address ?? null,
      medicalNotes: input.medical_notes ?? null,
      allergies: input.allergies ?? null,
      emergencyContact: input.emergency_contact ?? null,
      createdAt: now,
      updatedAt: now,
      stats: {
        totalCost: 0,
        totalPaid: 0,
        outstanding: 0,
        lastVisitDate: null,
        lastTreatmentName: null,
        totalVisits: 0,
      },
    });
    return { duplicate: false as const, id: patientRef.id };
  });

  if (result.duplicate) return { patient: null, duplicate: true };
  const patient = await getPatient(result.id!);
  return { patient, duplicate: false };
}

/**
 * Recompute and persist patients/{id}.stats from treatments+payments+
 * appointments. Called inline by treatment/payment/appointment Server
 * Actions right after they write — this is the trigger-free replacement for
 * both the patient_balances SQL view and enrichPreviews()'s old query
 * fan-out (per the approved migration plan: no Cloud Functions).
 */
export async function recomputeStats(patientId: string): Promise<void> {
  const [treatmentsSnap, paymentsSnap, appointmentsSnap] = await Promise.all([
    adminDb.collection("treatments").where("patientId", "==", patientId).get(),
    adminDb.collection("payments").where("patientId", "==", patientId).get(),
    adminDb
      .collection("appointments")
      .where("patientId", "==", patientId)
      .where("status", "in", ["completed", "checked_in", "in_treatment"])
      .get(),
  ]);

  let totalCost = 0;
  let lastTreatmentName: string | null = null;
  let lastTreatmentMs = -1;
  for (const doc of treatmentsSnap.docs) {
    const d = doc.data();
    totalCost += Number(d.cost) || 0;
    const createdAt = d.createdAt as { toMillis?: () => number } | undefined;
    const ms = createdAt?.toMillis?.() ?? 0;
    if (ms >= lastTreatmentMs) {
      lastTreatmentMs = ms;
      lastTreatmentName = d.treatmentName as string;
    }
  }

  let totalPaid = 0;
  for (const doc of paymentsSnap.docs) {
    const d = doc.data();
    if (d.paymentStatus === "paid" || d.paymentStatus === "partial") {
      totalPaid += Number(d.amount) || 0;
    }
  }

  let lastVisitDate: string | null = null;
  for (const doc of appointmentsSnap.docs) {
    const d = doc.data().appointmentDate as string;
    if (!lastVisitDate || d > lastVisitDate) lastVisitDate = d;
  }

  await adminDb
    .collection("patients")
    .doc(patientId)
    .update({
      "stats.totalCost": totalCost,
      "stats.totalPaid": totalPaid,
      "stats.outstanding": totalCost - totalPaid,
      "stats.lastVisitDate": lastVisitDate,
      "stats.lastTreatmentName": lastTreatmentName,
      "stats.totalVisits": appointmentsSnap.size,
    });
}
