import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { prescriptionFromDoc } from "@/lib/firebase/converters";
import type { Medicine, Prescription } from "@/lib/types";

export async function listByPatient(patientId: string): Promise<Prescription[]> {
    const snap = await adminDb
        .collection("prescriptions")
        .where("patientId", "==", patientId)
        .orderBy("createdAt", "desc")
        .get();
    return snap.docs.map((d) => prescriptionFromDoc(d.id, d.data()));
}

export interface NewPrescriptionInput {
    patient_id: string;
    treatment_id?: string | null;
    appointment_id?: string | null;
    dentist_id?: string | null;
    dentist_name?: string | null;
    medicines: Medicine[];
    notes?: string | null;
    created_by?: string | null;
}

export async function createPrescription(input: NewPrescriptionInput): Promise<string> {
    const ref = adminDb.collection("prescriptions").doc();
    await ref.set({
        patientId: input.patient_id,
        treatmentId: input.treatment_id ?? null,
        appointmentId: input.appointment_id ?? null,
        dentistId: input.dentist_id ?? null,
        dentistName: input.dentist_name ?? null,
        medicines: input.medicines,
        notes: input.notes ?? null,
        createdBy: input.created_by ?? null,
        createdAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
}
