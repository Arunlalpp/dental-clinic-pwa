import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { appointmentFromDoc } from "@/lib/firebase/converters";
import { recomputeStats } from "@/services/patientService";
import { dateKey, minutesSinceMidnightIST, timeToMinutes } from "@/lib/utils";
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

export async function updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
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

  return appointmentFromDoc(id, { ...data, status });
}

// A reminder fires once an appointment is this many minutes out, and stays
// "due" for a window this wide — the window must be at least as long as the
// cron's polling interval, or an appointment can fall through the gap
// between two runs and never get reminded. With the 10-minute cron in
// vercel.json, a 15-minute window gives a couple of minutes' safety margin.
const REMINDER_LEAD_MINUTES = 30;
const REMINDER_WINDOW_MINUTES = 15;
const REMINDABLE_STATUSES: AppointmentStatus[] = ["scheduled", "confirmed"];

/** Today's appointments starting soon that haven't been reminded yet. */
export async function findDueReminders(): Promise<Appointment[]> {
  const today = dateKey();
  const nowMinutes = minutesSinceMidnightIST();
  const windowStart = nowMinutes + REMINDER_LEAD_MINUTES;
  const windowEnd = windowStart + REMINDER_WINDOW_MINUTES;

  const snap = await adminDb
    .collection("appointments")
    .where("appointmentDate", "==", today)
    .get();

  return snap.docs
    .filter((d) => {
      const data = d.data();
      if (data.reminderSentAt) return false;
      if (!REMINDABLE_STATUSES.includes(data.status as AppointmentStatus)) return false;
      const startMinutes = timeToMinutes(data.startTime as string);
      return startMinutes >= windowStart && startMinutes < windowEnd;
    })
    .map((d) => appointmentFromDoc(d.id, d.data()));
}

export async function markReminderSent(id: string): Promise<void> {
  await adminDb
    .collection("appointments")
    .doc(id)
    .update({ reminderSentAt: FieldValue.serverTimestamp() });
}
