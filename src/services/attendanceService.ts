import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { attendanceFromDoc } from "@/lib/firebase/converters";
import * as settingsService from "@/services/settingsService";
import {
  addDaysToDateKey, dateKey, formatTimeIST, minutesSinceMidnightIST, timeToMinutes,
} from "@/lib/utils";
import type { AttendanceMonthlySummary, AttendanceRecord } from "@/lib/types";

function docId(staffId: string, date: string): string {
  return `${staffId}_${date}`;
}

/** Inclusive list of YYYY-MM-DD strings from `from` to `to`. */
function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 400) {
    out.push(cursor);
    cursor = addDaysToDateKey(cursor, 1);
    guard += 1;
  }
  return out;
}

export type AttendanceActionResult =
  | { ok: true; record: AttendanceRecord }
  | { ok: false; error: string };

export async function getTodayAttendance(staffId: string): Promise<AttendanceRecord | null> {
  const snap = await adminDb.collection("attendance").doc(docId(staffId, dateKey())).get();
  return snap.exists ? attendanceFromDoc(snap.id, snap.data()!) : null;
}

/**
 * Check-in/checkout timestamps come from `new Date()` on the server process
 * (Vercel serverless), never the caller's device clock, and are persisted
 * via serverTimestamp() sentinels for the authoritative on-disk value — the
 * in-request Date is only used to compute late/overtime minutes for the
 * same response without a second round trip.
 */
export async function checkIn(staffId: string, staffName: string): Promise<AttendanceActionResult> {
  const date = dateKey();
  const ref = adminDb.collection("attendance").doc(docId(staffId, date));
  const existing = await ref.get();
  const existingData = existing.data();
  if (existing.exists && existingData?.checkIn) {
    return {
      ok: false,
      error: `Already checked in at ${formatTimeIST(existingData.checkIn.toDate().toISOString())}.`,
    };
  }

  const settings = await settingsService.getAttendanceSettings();
  const now = new Date();
  const lateMinutes = Math.max(0, minutesSinceMidnightIST(now) - timeToMinutes(settings.work_start));

  await ref.set(
    {
      staffId,
      staffName,
      date,
      checkIn: FieldValue.serverTimestamp(),
      checkOut: null,
      totalMinutes: null,
      lateMinutes,
      overtimeMinutes: 0,
      earlyCheckoutMinutes: 0,
      status: lateMinutes > 0 ? "late" : "present",
      notes: null,
      createdAt: existing.exists ? existingData!.createdAt : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const saved = await ref.get();
  return { ok: true, record: attendanceFromDoc(saved.id, saved.data()!) };
}

export async function checkOut(staffId: string): Promise<AttendanceActionResult> {
  const date = dateKey();
  const ref = adminDb.collection("attendance").doc(docId(staffId, date));
  const existing = await ref.get();
  const data = existing.data();
  if (!existing.exists || !data?.checkIn) {
    return { ok: false, error: "You haven't checked in yet." };
  }
  if (data.checkOut) {
    return { ok: false, error: "Today's attendance is complete." };
  }

  const settings = await settingsService.getAttendanceSettings();
  const now = new Date();
  const nowMinutes = minutesSinceMidnightIST(now);
  const endMinutes = timeToMinutes(settings.work_end);
  const overtimeMinutes = Math.max(0, nowMinutes - endMinutes);
  const earlyCheckoutMinutes = Math.max(0, endMinutes - nowMinutes);
  const totalMinutes = Math.max(
    0,
    Math.round((now.getTime() - (data.checkIn.toDate() as Date).getTime()) / 60000),
  );

  await ref.update({
    checkOut: FieldValue.serverTimestamp(),
    totalMinutes,
    overtimeMinutes,
    earlyCheckoutMinutes,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const saved = await ref.get();
  return { ok: true, record: attendanceFromDoc(saved.id, saved.data()!) };
}

/** Batch-gets by deterministic doc ID across the range — no Firestore composite index needed. */
export async function listStaffAttendance(
  staffId: string,
  from: string,
  to: string,
): Promise<AttendanceRecord[]> {
  const refs = dateRange(from, to).map((d) => adminDb.collection("attendance").doc(docId(staffId, d)));
  if (refs.length === 0) return [];
  const snaps = await adminDb.getAll(...refs);
  return snaps
    .filter((s) => s.exists)
    .map((s) => attendanceFromDoc(s.id, s.data()!))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** One record per staff member for a single date, keyed by staff_id (absent staff are simply missing). */
export async function listAttendanceForDate(
  staffIds: string[],
  date: string,
): Promise<Map<string, AttendanceRecord>> {
  if (staffIds.length === 0) return new Map();
  const refs = staffIds.map((id) => adminDb.collection("attendance").doc(docId(id, date)));
  const snaps = await adminDb.getAll(...refs);
  const map = new Map<string, AttendanceRecord>();
  snaps.forEach((s) => {
    if (s.exists) {
      const record = attendanceFromDoc(s.id, s.data()!);
      map.set(record.staff_id, record);
    }
  });
  return map;
}

/**
 * "Working days" = elapsed calendar days in the month so far — there's no
 * weekly-off/holiday calendar yet, so every elapsed day counts and absence
 * is simply "no attendance record for that day."
 */
export async function monthlySummary(
  staffId: string,
  monthKey: string,
): Promise<AttendanceMonthlySummary> {
  const [y, m] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const today = dateKey();
  const isCurrentMonth = monthKey === today.slice(0, 7);
  const lastDay = isCurrentMonth ? Number(today.slice(8, 10)) : daysInMonth;
  const from = `${monthKey}-01`;
  const to = `${monthKey}-${String(lastDay).padStart(2, "0")}`;

  const records = await listStaffAttendance(staffId, from, to);
  const present = records.filter((r) => r.check_in).length;
  const late = records.filter((r) => r.status === "late").length;
  const totalMinutes = records.reduce((acc, r) => acc + (r.total_minutes ?? 0), 0);
  const overtimeMinutes = records.reduce((acc, r) => acc + r.overtime_minutes, 0);

  return {
    working_days: lastDay,
    present,
    absent: Math.max(0, lastDay - present),
    late,
    total_minutes: totalMinutes,
    overtime_minutes: overtimeMinutes,
  };
}
