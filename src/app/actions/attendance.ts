"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import * as attendanceService from "@/services/attendanceService";
import { addDaysToDateKey, dateKey } from "@/lib/utils";
import type { AttendanceActionResult } from "@/services/attendanceService";
import type { AttendanceRecord } from "@/lib/types";

export async function checkInAction(): Promise<AttendanceActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Not signed in." };

  const res = await attendanceService.checkIn(profile.id, profile.name);
  if (res.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/attendance");
    revalidatePath("/admin/attendance");
  }
  return res;
}

export async function checkOutAction(): Promise<AttendanceActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Not signed in." };

  const res = await attendanceService.checkOut(profile.id);
  if (res.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/attendance");
    revalidatePath("/admin/attendance");
  }
  return res;
}

export type HistoryRange = "today" | "week" | "month" | { from: string; to: string };

export async function listMyAttendanceHistoryAction(
  range: HistoryRange,
): Promise<AttendanceRecord[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];

  const today = dateKey();
  const { from, to } =
    range === "today"
      ? { from: today, to: today }
      : range === "week"
        ? { from: addDaysToDateKey(today, -6), to: today }
        : range === "month"
          ? { from: `${today.slice(0, 7)}-01`, to: today }
          : range;

  return attendanceService.listStaffAttendance(profile.id, from, to);
}
