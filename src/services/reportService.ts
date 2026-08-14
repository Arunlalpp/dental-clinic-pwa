import { adminDb } from "@/lib/firebase/admin";
import { dateKey } from "@/lib/utils";
import type { AppointmentStatus } from "@/lib/types";

export interface DashboardStats {
  today: number;
  checkedIn: number;
  completed: number;
  pending: number;
}

export async function dashboardStats(date: string): Promise<DashboardStats> {
  const snap = await adminDb
    .collection("appointments")
    .where("appointmentDate", "==", date)
    .get();
  const rows = snap.docs.map((d) => d.data().status as AppointmentStatus);
  return {
    today: rows.length,
    checkedIn: rows.filter((s) => s === "checked_in" || s === "in_treatment").length,
    completed: rows.filter((s) => s === "completed").length,
    pending: rows.filter((s) => s === "scheduled" || s === "confirmed").length,
  };
}

export interface Point {
  label: string;
  value: number;
}

/** Revenue for the last `days` days (payment totals per day). */
export async function revenueSeries(days = 14): Promise<Point[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  const sinceKey = dateKey(since);
  const snap = await adminDb
    .collection("payments")
    .where("paymentDate", ">=", sinceKey)
    .get();
  const byDay = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    byDay.set(dateKey(d), 0);
  }
  for (const doc of snap.docs) {
    const d = doc.data();
    const key = d.paymentDate as string;
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + Number(d.amount));
  }
  return Array.from(byDay.entries()).map(([k, v]) => ({
    label: k.slice(5),
    value: v,
  }));
}

/** Treatment distribution by name (top N). */
export async function treatmentDistribution(topN = 6): Promise<Point[]> {
  const snap = await adminDb.collection("treatments").select("treatmentName").get();
  const counts = new Map<string, number>();
  for (const doc of snap.docs) {
    const k = doc.data().treatmentName as string;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([label, value]) => ({ label, value }));
}

export interface RevenueTotals {
  today: number;
  week: number;
  month: number;
  outstanding: number;
}

export async function revenueTotals(): Promise<RevenueTotals> {
  const today = dateKey();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 29);
  const monthAgoKey = dateKey(monthAgo);

  const [paysSnap, patientsSnap] = await Promise.all([
    adminDb.collection("payments").where("paymentDate", ">=", monthAgoKey).get(),
    adminDb.collection("patients").select("stats").get(),
  ]);

  const rows = paysSnap.docs.map((d) => ({
    amount: Number(d.data().amount) || 0,
    payment_date: d.data().paymentDate as string,
  }));
  const sum = (from: string) =>
    rows.filter((r) => r.payment_date >= from).reduce((s, r) => s + r.amount, 0);

  const outstanding = patientsSnap.docs.reduce(
    (s, d) => s + (Number(d.data().stats?.outstanding) || 0),
    0,
  );

  return {
    today: sum(today),
    week: sum(dateKey(weekAgo)),
    month: rows.reduce((s, r) => s + r.amount, 0),
    outstanding,
  };
}

export interface PatientCounts {
  total: number;
  new_today: number;
}

export async function patientCounts(): Promise<PatientCounts> {
  const startOfDay = new Date(`${dateKey()}T00:00:00+05:30`);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const [totalSnap, newSnap] = await Promise.all([
    adminDb.collection("patients").count().get(),
    adminDb
      .collection("patients")
      .where("createdAt", ">=", startOfDay)
      .where("createdAt", "<", endOfDay)
      .count()
      .get(),
  ]);

  return {
    total: totalSnap.data().count,
    new_today: newSnap.data().count,
  };
}
