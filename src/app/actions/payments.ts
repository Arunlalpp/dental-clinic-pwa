"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import * as paymentService from "@/services/paymentService";
import type { NewPaymentInput } from "@/services/paymentService";

export async function recordPaymentAction(
  input: Omit<NewPaymentInput, "created_by">,
): Promise<{ ok: boolean; error?: string }> {
  if (!input.amount || input.amount <= 0) {
    return { ok: false, error: "Amount must be greater than zero." };
  }
  const profile = await getCurrentProfile();
  try {
    await paymentService.recordPayment({
      ...input,
      created_by: profile?.id ?? null,
    });
    revalidatePath(`/patients/${input.patient_id}`);
    revalidatePath("/payments");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
