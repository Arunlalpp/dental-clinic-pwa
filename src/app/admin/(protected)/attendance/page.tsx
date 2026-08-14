import * as staffService from "@/services/staffService";
import * as attendanceService from "@/services/attendanceService";
import * as settingsService from "@/services/settingsService";
import { AdminAttendanceView } from "@/components/admin/AdminAttendanceView";
import { dateKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAttendancePage() {
  const date = dateKey();
  const [staff, settings] = await Promise.all([
    staffService.listStaffProfiles(),
    settingsService.getAttendanceSettings(),
  ]);
  const recordsMap = await attendanceService.listAttendanceForDate(
    staff.map((s) => s.id),
    date,
  );
  const rows = staff.map((s) => ({ staff: s, record: recordsMap.get(s.id) ?? null }));

  return <AdminAttendanceView rows={rows} settings={settings} date={date} />;
}
