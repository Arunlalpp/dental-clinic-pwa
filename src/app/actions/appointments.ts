"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import * as appointmentService from "@/services/appointmentService";
import * as treatmentService from "@/services/treatmentService";
import * as prescriptionService from "@/services/prescriptionService";
import type { NewAppointmentInput } from "@/services/appointmentService";
import { APPOINTMENT_TYPE_LABELS, dateKey } from "@/lib/utils";
import type { AppointmentStatus, AppointmentType, Medicine } from "@/lib/types";

const CLINICAL_ROLES = ["owner", "admin", "dentist"];

export type BookResult =
  | { ok: true; appointmentId: string }
  | { ok: false; conflict?: boolean; error?: string };

export async function bookAppointmentAction(
  input: Omit<NewAppointmentInput, "created_by">,
): Promise<BookResult> {
  const profile = await getCurrentProfile();

  try {
    const { appointment, conflict } = await appointmentService.createAppointment({
      ...input,
      created_by: profile?.id ?? null,
    });
    if (conflict || !appointment) return { ok: false, conflict: true };

    revalidatePath("/dashboard");
    revalidatePath("/appointments");
    return { ok: true, appointmentId: appointment.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateAppointmentStatusAction(
  id: string,
  status: AppointmentStatus,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await appointmentService.updateStatus(id, status);
    revalidatePath("/dashboard");
    revalidatePath("/appointments");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export interface CompleteConsultationInput {
  appointment_id: string;
  patient_id: string;
  dentist_id: string | null;
  treatment_type: AppointmentType;
  tooth_number?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  cost: number;
  prescription?: { medicines: Medicine[]; notes?: string | null } | null;
}

/**
 * Finishing a consultation is one guided action, not three separate ones:
 * records the treatment (+ its fee), optionally writes a linked
 * prescription, then marks the appointment completed (which also frees its
 * slot lock — see appointmentService.updateStatus).
 */
export async function completeConsultationAction(
  input: CompleteConsultationInput,
): Promise<{ ok: boolean; error?: string }> {
  const caller = await getCurrentProfile();
  if (!caller || !CLINICAL_ROLES.includes(caller.role)) {
    return { ok: false, error: "Only clinical staff can complete a consultation." };
  }

  try {
    const treatment = await treatmentService.createTreatment({
      patient_id: input.patient_id,
      appointment_id: input.appointment_id,
      dentist_id: input.dentist_id,
      treatment_type: input.treatment_type,
      treatment_name: APPOINTMENT_TYPE_LABELS[input.treatment_type],
      tooth_number: input.tooth_number ?? null,
      diagnosis: input.diagnosis ?? null,
      status: "completed",
      notes: input.notes ?? null,
      treatment_date: dateKey(),
      cost: input.cost,
    });

    if (input.prescription && input.prescription.medicines.length > 0) {
      await prescriptionService.createPrescription({
        patient_id: input.patient_id,
        treatment_id: treatment.id,
        appointment_id: input.appointment_id,
        dentist_id: input.dentist_id,
        medicines: input.prescription.medicines,
        notes: input.prescription.notes ?? null,
        created_by: caller.id,
      });
    }

    await appointmentService.updateStatus(input.appointment_id, "completed");

    revalidatePath("/dashboard");
    revalidatePath("/appointments");
    revalidatePath(`/patients/${input.patient_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
