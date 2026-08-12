"use client";

import {
  Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis,
} from "recharts";
import { Card } from "@/components/ui";
import { formatINR } from "@/lib/utils";
import type { Point, RevenueTotals } from "@/services/reportService";

const DONUT_COLORS = ["#c6297e", "#eb6834", "#1baf7a", "#eda100", "#4a3aa7", "#2a78d6"];

export function ReportsView({
  totals,
  revenue,
  treatments,
}: {
  totals: RevenueTotals;
  revenue: Point[];
  treatments: Point[];
}) {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">Revenue and treatment insights.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Totals label="Today" value={formatINR(totals.today)} tone="brand" />
        <Totals label="This week" value={formatINR(totals.week)} />
        <Totals label="Last 30 days" value={formatINR(totals.month)} />
        <Totals
          label="Outstanding"
          value={formatINR(totals.outstanding)}
          tone={totals.outstanding > 0 ? "rose" : "default"}
        />
      </div>

      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold text-slate-500">
          Revenue · last 14 days
        </p>
        <div className="h-44">
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
                interval={2}
              />
              <Tooltip
                formatter={(v: number) => formatINR(v)}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#c6297e"
                strokeWidth={2}
                fill="url(#rev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold text-slate-500">
          Treatment mix
        </p>
        {treatments.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No treatments recorded yet.
          </p>
        ) : (
          <div className="flex items-center gap-4">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={treatments}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={44}
                    outerRadius={72}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {treatments.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-1.5">
              {treatments.map((t, i) => (
                <li key={t.label} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                  />
                  <span className="truncate text-slate-600">{t.label}</span>
                  <span className="ml-auto font-semibold text-slate-400">
                    {t.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}

function Totals({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "brand" | "rose";
}) {
  const tones = {
    default: "text-slate-900",
    brand: "text-brand-700",
    rose: "text-rose-600",
  };
  return (
    <Card className="p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tones[tone]}`}>{value}</p>
    </Card>
  );
}
