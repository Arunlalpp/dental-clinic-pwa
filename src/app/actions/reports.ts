"use server";

import { getCurrentProfile } from "@/lib/auth";
import * as reportService from "@/services/reportService";
import type { Point } from "@/services/reportService";

const ADMIN_ROLES = ["owner", "admin"];

export async function getRevenueSeriesAction(days: number): Promise<Point[]> {
  const profile = await getCurrentProfile();
  if (!profile || !ADMIN_ROLES.includes(profile.role)) return [];
  return reportService.revenueSeries(days);
}
