import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { paymentFromDoc } from "@/lib/firebase/converters";
import { recomputeStats } from "@/services/patientService";
import type { Payment, PaymentMethod, PaymentStatus } from "@/lib/types";

export async function listByPatient(patientId: string): Promise<Payment[]> {
  const snap = await adminDb
    .collection("payments")
    .where("patientId", "==", patientId)
    .orderBy("paymentDate", "desc")
    .get();
  return snap.docs.map((d) => paymentFromDoc(d.id, d.data()));
}

export async function listRecent(limitCount = 20): Promise<Payment[]> {
  const snap = await adminDb
    .collection("payments")
    .orderBy("createdAt", "desc")
    .limit(limitCount)
    .get();
  return snap.docs.map((d) => paymentFromDoc(d.id, d.data()));
}

export interface NewPaymentInput {
  patient_id: string;
  appointment_id?: string | null;
  treatment_id?: string | null;
  amount: number;
  payment_method: PaymentMethod;
  payment_status?: PaymentStatus;
  transaction_reference?: string | null;
  payment_date?: string;
  notes?: string | null;
  created_by?: string | null;
}

export async function recordPayment(input: NewPaymentInput): Promise<Payment> {
  const ref = adminDb.collection("payments").doc();
  await ref.set({
    patientId: input.patient_id,
    appointmentId: input.appointment_id ?? null,
    treatmentId: input.treatment_id ?? null,
    amount: input.amount,
    paymentMethod: input.payment_method,
    paymentStatus: input.payment_status ?? "paid",
    transactionReference: input.transaction_reference ?? null,
    paymentDate: input.payment_date ?? new Date().toISOString().slice(0, 10),
    notes: input.notes ?? null,
    createdBy: input.created_by ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
  await recomputeStats(input.patient_id);
  const snap = await ref.get();
  return paymentFromDoc(snap.id, snap.data()!);
}
