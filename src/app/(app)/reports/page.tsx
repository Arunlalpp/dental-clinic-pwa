import * as reportService from "@/services/reportService";
import { ReportsView } from "@/components/reports/ReportsView";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [totals, revenue, treatments] = await Promise.all([
    reportService.revenueTotals(),
    reportService.revenueSeries(14),
    reportService.treatmentDistribution(6),
  ]);
  return <ReportsView totals={totals} revenue={revenue} treatments={treatments} />;
}
