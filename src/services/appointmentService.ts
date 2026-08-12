import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { appointmentFromDoc } from "@/lib/firebase/converters";
import { recomputeStats } from "@/services/patientService";
import type { Appointment, AppointmentStatus, AppointmentType } from "@/lib/types";

/** Server-side counterpart of appointmentService.client.ts's listByDate —
 * used by dashboard/appointments pages' initial SSR fetch; ScheduleView's
 * client-side refetch uses the client SDK version instead. */
export async function listByDate(date: string): Promise<Appointment[]> {
  const snap = await adminDb
    .collection("appointments")
    .where("appointmentDate", "==", date)
    .orderBy("startTime", "asc")
    .get();
  return snap.docs.map((d) => appointmentFromDoc(d.id, d.data()));
}

export async function listByPatient(patientId: string): Promise<Appointment[]> {
  const snap = await adminDb
    .collection("appointments")
    .where("patientId", "==", patientId)
    .orderBy("appointmentDate", "desc")
    .orderBy("startTime", "desc")
    .get();
  return snap.docs.map((d) => appointmentFromDoc(d.id, d.data()));
}

export interface NewAppointmentInput {
  patient_id: string;
  dentist_id: string;
  appointment_date: string;
  start_time: string;
  appointment_type: AppointmentType;
  reason?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

function slotId(dentistId: string, date: string, time: string) {
  return `${dentistId}_${date}_${time}`;
}

// A slot is only considered "locked" while its appointment is in one of
// these statuses — cancelled/no_show free it up for rebooking (this is a
// deliberate bug fix vs. the old Postgres constraint, which blocked the slot
// regardless of status; see the migration plan's Flag F).
const LOCKING_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "checked_in",
  "in_treatment",
  "completed",
];

/**
 * Insert an appointment inside a transaction that also claims the
 * dentist/date/time slot-lock doc — the Firestore equivalent of the Postgres
 * UNIQUE(dentist_id, appointment_date, start_time) constraint.
 */
export async function createAppointment(
  input: NewAppointmentInput,
): Promise<{ appointment: Appointment | null; conflict: boolean }> {
  const [patientSnap, dentistSnap] = await Promise.all([
    adminDb.collection("patients").doc(input.patient_id).get(),
    adminDb.collection("dentists").doc(input.dentist_id).get(),
  ]);
  if (!patientSnap.exists) throw new Error("Patient not found");
  const patientData = patientSnap.data()!;
  const dentistData = dentistSnap.exists ? dentistSnap.data()! : null;

  const slotRef = adminDb
    .collection("appointmentSlots")
    .doc(slotId(input.dentist_id, input.appointment_date, input.start_time));
  const apptRef = adminDb.collection("appointments").doc();

  const conflict = await adminDb.runTransaction(async (tx) => {
    const slotSnap = await tx.get(slotRef);
    if (
      slotSnap.exists &&
      LOCKING_STATUSES.includes(slotSnap.data()!.status as AppointmentStatus)
    ) {
      return true;
    }
    const now = FieldValue.serverTimestamp();
    tx.set(slotRef, { appointmentId: apptRef.id, status: "scheduled" });
    tx.set(apptRef, {
      patientId: input.patient_id,
      patientName: patientData.fullName,
      patientPhone: patientData.phone,
      dentistId: input.dentist_id,
      dentistName: (dentistData?.profileName as string) ?? null,
      appointmentDate: input.appointment_date,
      startTime: input.start_time,
      endTime: null,
      appointmentType: input.appointment_type,
      status: "scheduled",
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      createdBy: input.created_by ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return false;
  });

  if (conflict) return { appointment: null, conflict: true };

  await recomputeStats(input.patient_id);
  const snap = await apptRef.get();
  return { appointment: appointmentFromDoc(snap.id, snap.data()!), conflict: false };
}

export async function updateStatus(id: string, status: AppointmentStatus): Promise<void> {
  const apptRef = adminDb.collection("appointments").doc(id);
  const snap = await apptRef.get();
  if (!snap.exists) throw new Error("Appointment not found");
  const data = snap.data()!;

  await apptRef.update({ status, updatedAt: FieldValue.serverTimestamp() });

  if (data.dentistId) {
    const slotRef = adminDb
      .collection("appointmentSlots")
      .doc(slotId(data.dentistId as string, data.appointmentDate as string, data.startTime as string));
    if (!LOCKING_STATUSES.includes(status)) {
      await slotRef.delete();
    } else {
      await slotRef.set({ appointmentId: id, status }, { merge: true });
    }
  }

  await recomputeStats(data.patientId as string);
}
