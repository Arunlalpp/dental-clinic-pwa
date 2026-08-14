import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import * as attendanceService from "@/services/attendanceService";
import { AttendanceCheckCard } from "@/components/attendance/AttendanceCheckCard";
import { AttendanceHistoryView } from "@/components/attendance/AttendanceHistoryView";
import { dateKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const monthKey = dateKey().slice(0, 7);
  const [today, summary, history] = await Promise.all([
    attendanceService.getTodayAttendance(profile.id),
    attendanceService.monthlySummary(profile.id, monthKey),
    attendanceService.listStaffAttendance(profile.id, `${monthKey}-01`, dateKey()),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="mt-1 text-sm text-slate-500">
          Check in, check out, and review your attendance history.
        </p>
      </header>

      <AttendanceCheckCard initial={today} />

      <AttendanceHistoryView initialSummary={summary} initialHistory={history} />
    </div>
  );
}
