"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import * as settingsService from "@/services/settingsService";

async function requireAdmin() {
  const caller = await getCurrentProfile();
  if (!caller || !["owner", "admin"].includes(caller.role)) {
    return { ok: false as const, error: "Only an owner or admin can manage clinic settings." };
  }
  return null;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function updateAttendanceSettingsAction(
  workStart: string,
  workEnd: string,
): Promise<{ ok: boolean; error?: string }> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!TIME_RE.test(workStart) || !TIME_RE.test(workEnd)) {
    return { ok: false, error: "Enter times as HH:MM (24-hour)." };
  }
  try {
    await settingsService.updateAttendanceSettings({ work_start: workStart, work_end: workEnd });
    revalidatePath("/admin/attendance");
    revalidatePath("/attendance");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
