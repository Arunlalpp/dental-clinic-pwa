"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis,
} from "recharts";
import {
  CalendarCheck, CheckCircle2, IndianRupee, Wallet, Users, UserPlus,
} from "lucide-react";
import { Avatar, Card, StatusBadge } from "@/components/ui";
import { formatDateIST, formatINR, to12h, APPOINTMENT_TYPE_LABELS } from "@/lib/utils";
import { getRevenueSeriesAction } from "@/app/actions/reports";
import type {
  DashboardStats, RevenueTotals, Point, PatientCounts,
} from "@/services/reportService";
import type { Appointment, PatientPreview } from "@/lib/types";

const DONUT_COLORS = ["#c6297e", "#eb6834", "#1baf7a", "#eda100", "#4a3aa7", "#2a78d6"];
const RANGE_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
];

export function AdminDashboardView({
  stats,
  totals,
  revenue: initialRevenue,
  treatments,
  patients,
  appointments,
  recentPatients,
}: {
  stats: DashboardStats;
  totals: RevenueTotals;
  revenue: Point[];
  treatments: Point[];
  patients: PatientCounts;
  appointments: Appointment[];
  recentPatients: PatientPreview[];
}) {
  const [revenue, setRevenue] = useState(initialRevenue);
  const [rangeDays, setRangeDays] = useState(30);
  const [pending, startTransition] = useTransition();

  function changeRange(days: number) {
    setRangeDays(days);
    startTransition(async () => {
      setRevenue(await getRevenueSeriesAction(days));
    });
  }

  const statusCounts = appointments.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of Carewell Dental · {formatDateIST()}
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi icon={<CalendarCheck size={16} />} label="Today's appointments" value={String(stats.today)} />
        <Kpi icon={<CheckCircle2 size={16} />} label="Completed" value={String(stats.completed)} tone="emerald" />
        <Kpi icon={<IndianRupee size={16} />} label="Today's revenue" value={formatINR(totals.today)} tone="brand" />
        <Kpi
          icon={<Wallet size={16} />}
          label="Outstanding"
          value={formatINR(totals.outstanding)}
          tone={totals.outstanding > 0 ? "rose" : "default"}
        />
        <Kpi icon={<Users size={16} />} label="Total patients" value={String(patients.total)} />
        <Kpi icon={<UserPlus size={16} />} label="New patients" value={String(patients.new_today)} tone="emerald" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue chart */}
        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Revenue overview</p>
            <div className="flex gap-1 rounded-full bg-slate-50 p-1">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => changeRange(opt.days)}
                  disabled={pending}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    rangeDays === opt.days
                      ? "bg-white text-brand-700 shadow-card"
                      : "text-slate-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c6297e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#c6297e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(revenue.length / 8) - 1)}
                />
                <Tooltip
                  formatter={(v: number) => formatINR(v)}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="value" stroke="#c6297e" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Appointment overview */}
        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold text-slate-500">Appointment overview</p>
          <div className="space-y-2.5">
            <StatusRow label="Scheduled" count={(statusCounts.scheduled ?? 0) + (statusCounts.confirmed ?? 0)} color="#4a3aa7" />
            <StatusRow label="Completed" count={statusCounts.completed ?? 0} color="#1baf7a" />
            <StatusRow label="Cancelled" count={statusCounts.cancelled ?? 0} color="#94a3b8" />
            <StatusRow label="No show" count={statusCounts.no_show ?? 0} color="#eb6834" />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Today's appointments */}
        <Card className="overflow-hidden lg:col-span-2">
          <p className="border-b border-slate-100 p-4 text-sm font-semibold text-slate-500">
            Today&apos;s appointments
          </p>
          {appointments.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">Nothing scheduled today.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {appointments.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3.5">
                  <div className="w-14 shrink-0 text-xs font-semibold text-slate-500">
                    {to12h(a.start_time)}
                  </div>
                  <Avatar name={a.patient_name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{a.patient_name}</p>
                    <p className="truncate text-xs text-slate-400">
                      {APPOINTMENT_TYPE_LABELS[a.appointment_type]}
                      {a.dentist_name ? ` · ${a.dentist_name}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Treatment performance */}
        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold text-slate-500">Treatment performance</p>
          {treatments.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No treatments recorded yet.</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-32 w-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={treatments}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={36}
                      outerRadius={58}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {treatments.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-1.5">
                {treatments.map((t, i) => (
                  <li key={t.label} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                    />
                    <span className="truncate text-slate-600">{t.label}</span>
                    <span className="ml-auto font-semibold text-slate-400">{t.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* Recent patients */}
      <Card className="overflow-hidden">
        <p className="border-b border-slate-100 p-4 text-sm font-semibold text-slate-500">
          Recent patients
        </p>
        {recentPatients.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No patients yet.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentPatients.map((p) => (
              <Link
                key={p.id}
                href={`/patients/${p.id}`}
                className="flex items-center gap-3 p-3.5 transition hover:bg-slate-50"
              >
                <Avatar name={p.full_name} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">{p.full_name}</p>
                  <p className="truncate text-xs text-slate-400">{p.phone}</p>
                </div>
                {p.outstanding > 0 && (
                  <span className="shrink-0 text-xs font-semibold text-rose-600">
                    {formatINR(p.outstanding)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "brand" | "emerald" | "rose";
}) {
  const tones = {
    default: "text-slate-900",
    brand: "text-brand-700",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
  };
  return (
    <Card className="p-4">
      <span className="text-slate-400">{icon}</span>
      <p className={`mt-2 text-lg font-semibold ${tones[tone]}`}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{label}</p>
    </Card>
  );
}

function StatusRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="flex-1 text-slate-600">{label}</span>
      <span className="font-semibold text-slate-700">{count}</span>
    </div>
  );
}
