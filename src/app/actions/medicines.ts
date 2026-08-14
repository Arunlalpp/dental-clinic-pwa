"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import * as medicineService from "@/services/medicineService";
import type { NewMedicineInput, MedicineUpdateInput } from "@/services/medicineService";

const ADMIN_ROLES = ["owner", "admin"];

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    return { ok: false as const, error: "Only an owner or admin can manage medicines." };
  }
  return { ok: true as const };
}

export type MedicineActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createMedicineAction(
  input: NewMedicineInput,
): Promise<MedicineActionResult> {
  const check = await requireAdmin();
  if (!check.ok) return check;
  if (!input.name?.trim()) return { ok: false, error: "Name is required." };

  try {
    const medicine = await medicineService.createMedicine(input);
    revalidatePath("/admin/medicines");
    return { ok: true, id: medicine.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateMedicineAction(
  id: string,
  input: MedicineUpdateInput,
): Promise<MedicineActionResult> {
  const check = await requireAdmin();
  if (!check.ok) return check;

  try {
    await medicineService.updateMedicine(id, input);
    revalidatePath("/admin/medicines");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function setMedicineActiveAction(
  id: string,
  active: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const check = await requireAdmin();
  if (!check.ok) return check;

  try {
    await medicineService.setMedicineActive(id, active);
    revalidatePath("/admin/medicines");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteMedicineAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const check = await requireAdmin();
  if (!check.ok) return check;

  try {
    await medicineService.deleteMedicine(id);
    revalidatePath("/admin/medicines");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
