import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { AttendanceSettings } from "@/lib/types";

const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  work_start: "09:30",
  work_end: "22:30",
};

export async function getAttendanceSettings(): Promise<AttendanceSettings> {
  const snap = await adminDb.collection("settings").doc("attendance").get();
  if (!snap.exists) return DEFAULT_ATTENDANCE_SETTINGS;
  const data = snap.data()!;
  return {
    work_start: (data.workStart as string) ?? DEFAULT_ATTENDANCE_SETTINGS.work_start,
    work_end: (data.workEnd as string) ?? DEFAULT_ATTENDANCE_SETTINGS.work_end,
  };
}

export async function updateAttendanceSettings(input: AttendanceSettings): Promise<void> {
  await adminDb.collection("settings").doc("attendance").set(
    {
      workStart: input.work_start,
      workEnd: input.work_end,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
