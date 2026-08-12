"use server";

import { getCurrentProfile } from "@/lib/auth";
import * as prescriptionService from "@/services/prescriptionService";
import type { NewPrescriptionInput } from "@/services/prescriptionService";

const CLINICAL_ROLES = ["owner", "admin", "dentist"];

export async function createPrescriptionAction(
  input: Omit<NewPrescriptionInput, "created_by">,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const caller = await getCurrentProfile();
  if (!caller || !CLINICAL_ROLES.includes(caller.role)) {
    return { ok: false, error: "Only clinical staff can write prescriptions." };
  }
  try {
    const id = await prescriptionService.createPrescription({
      ...input,
      created_by: caller.id,
    });
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
