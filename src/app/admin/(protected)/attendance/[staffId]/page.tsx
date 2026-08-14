import { notFound } from "next/navigation";
import * as staffService from "@/services/staffService";
import * as attendanceService from "@/services/attendanceService";
import { AdminStaffAttendanceDetail } from "@/components/admin/AdminStaffAttendanceDetail";
import { dateKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

function monthEndOrToday(monthKey: string): string {
  const today = dateKey();
  if (monthKey === today.slice(0, 7)) return today;
  const [y, m] = monthKey.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${monthKey}-${String(lastDay).padStart(2, "0")}`;
}

export default async function AdminStaffAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ staffId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { staffId } = await params;
  const { month } = await searchParams;

  const staff = await staffService.getStaffProfile(staffId);
  if (!staff) notFound();

  const monthKey = month && /^\d{4}-\d{2}$/.test(month) ? month : dateKey().slice(0, 7);
  const [summary, records] = await Promise.all([
    attendanceService.monthlySummary(staffId, monthKey),
    attendanceService.listStaffAttendance(staffId, `${monthKey}-01`, monthEndOrToday(monthKey)),
  ]);

  return (
    <AdminStaffAttendanceDetail
      staff={staff}
      summary={summary}
      records={records}
      monthKey={monthKey}
    />
  );
}
