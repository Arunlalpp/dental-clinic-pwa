import * as reportService from "@/services/reportService";
import * as appointmentService from "@/services/appointmentService";
import * as patientService from "@/services/patientService";
import { AdminDashboardView } from "@/components/admin/AdminDashboardView";
import { dateKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DEFAULT_REVENUE_DAYS = 30;

export default async function AdminDashboardPage() {
  const today = dateKey();

  const [stats, totals, revenue, treatments, patients, appointments, recentPatients] =
    await Promise.all([
      reportService.dashboardStats(today),
      reportService.revenueTotals(),
      reportService.revenueSeries(DEFAULT_REVENUE_DAYS),
      reportService.treatmentDistribution(6),
      reportService.patientCounts(),
      appointmentService.listByDate(today),
      patientService.listRecentPatients(5),
    ]);

  return (
    <AdminDashboardView
      stats={stats}
      totals={totals}
      revenue={revenue}
      treatments={treatments}
      patients={patients}
      appointments={appointments}
      recentPatients={recentPatients}
    />
  );
}
