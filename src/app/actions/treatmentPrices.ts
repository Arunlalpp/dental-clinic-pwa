"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import * as treatmentPriceService from "@/services/treatmentPriceService";
import type { AppointmentType } from "@/lib/types";

async function requireAdmin() {
  const caller = await getCurrentProfile();
  if (!caller || !["owner", "admin"].includes(caller.role)) {
    return { ok: false as const, error: "Only an owner or admin can manage fees." };
  }
  return null;
}

export async function setDefaultFeeAction(
  treatmentType: AppointmentType,
  fee: number,
): Promise<{ ok: boolean; error?: string }> {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await treatmentPriceService.setDefaultFee(treatmentType, fee);
    revalidatePath("/settings/treatment-prices");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function setDentistFeeAction(
  treatmentType: AppointmentType,
  dentistId: string,
  fee: number | null,
): Promise<{ ok: boolean; error?: string }> {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await treatmentPriceService.setDentistFee(treatmentType, dentistId, fee);
    revalidatePath("/settings/treatment-prices");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
