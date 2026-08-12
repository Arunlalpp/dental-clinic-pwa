import { getCurrentProfile } from "@/lib/auth";
import * as reportService from "@/services/reportService";
import * as appointmentService from "@/services/appointmentService";
import { StatCard, QuickActions } from "@/components/dashboard/DashboardBits";
import { TodayTimeline } from "@/components/dashboard/TodayTimeline";
import { dateKey, formatDateIST, hourIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const today = dateKey();

  const [stats, appointments] = await Promise.all([
    reportService.dashboardStats(today),
    appointmentService.listByDate(today),
  ]);

  const hour = hourIST();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {formatDateIST()} · here’s what’s happening today.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Today’s appointments" value={stats.today} tone="brand" />
        <StatCard label="Checked in" value={stats.checkedIn} />
        <StatCard label="Completed" value={stats.completed} tone="emerald" />
        <StatCard label="Pending" value={stats.pending} tone="amber" />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-400">Quick actions</h2>
        <QuickActions />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-400">Today’s schedule</h2>
        <TodayTimeline appointments={appointments} date={today} />
      </section>
    </div>
  );
}
