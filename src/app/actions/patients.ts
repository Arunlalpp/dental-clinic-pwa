"use server";

import { revalidatePath } from "next/cache";
import * as patientService from "@/services/patientService";
import type { NewPatientInput } from "@/services/patientService";

export type CreatePatientResult =
  | { ok: true; patientId: string }
  | { ok: false; duplicate?: boolean; error?: string };

export async function createPatientAction(
  input: NewPatientInput,
): Promise<CreatePatientResult> {
  if (!input.full_name?.trim() || !input.phone?.trim()) {
    return { ok: false, error: "Name and phone are required." };
  }

  try {
    const { patient, duplicate } = await patientService.createPatient(input);
    if (duplicate || !patient) return { ok: false, duplicate: true };

    revalidatePath("/patients");
    return { ok: true, patientId: patient.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
