"use client";

import { useState, useTransition } from "react";
import { Card, Chip } from "@/components/ui";
import { listMyAttendanceHistoryAction, type HistoryRange } from "@/app/actions/attendance";
import { addDaysToDateKey, dateKey, formatDuration, formatTimeIST } from "@/lib/utils";
import type { AttendanceMonthlySummary, AttendanceRecord } from "@/lib/types";

type Tab = "today" | "week" | "month" | "custom";
const TABS: { key: Tab; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom Range" },
];

function resolveTabRange(tab: Tab, custom: { from: string; to: string }) {
  const today = dateKey();
  if (tab === "today") return { from: today, to: today };
  if (tab === "week") return { from: addDaysToDateKey(today, -6), to: today };
  if (tab === "month") return { from: `${today.slice(0, 7)}-01`, to: today };
  return custom;
}

function enumerateDates(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 400) {
    out.push(cur);
    cur = addDaysToDateKey(cur, 1);
    guard += 1;
  }
  return out;
}

function formatDayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00+05:30`));
}

export function AttendanceHistoryView({
  initialSummary,
  initialHistory,
}: {
  initialSummary: AttendanceMonthlySummary;
  initialHistory: AttendanceRecord[];
}) {
  const [tab, setTab] = useState<Tab>("month");
  const [custom, setCustom] = useState(() => ({ from: dateKey(), to: dateKey() }));
  const [records, setRecords] = useState(initialHistory);
  const [pending, startTransition] = useTransition();
  const today = dateKey();

  function selectTab(next: Tab) {
    setTab(next);
    if (next === "custom") return;
    const range: HistoryRange = next;
    startTransition(async () => {
      setRecords(await listMyAttendanceHistoryAction(range));
    });
  }

  function applyCustom() {
    startTransition(async () => {
      setRecords(await listMyAttendanceHistoryAction(custom));
    });
  }

  const { from, to } = resolveTabRange(tab, custom);
  const recordByDate = new Map(records.map((r) => [r.date, r]));
  const rows = enumerateDates(from, to)
    .filter((d) => d !== today)
    .reverse()
    .map((d) => recordByDate.get(d) ?? { date: d, absent: true as const });

  return (
    <div className="space-y-4">
      {/* Monthly summary */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-400">This month</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryStat label="Working days" value={String(initialSummary.working_days)} />
          <SummaryStat label="Present" value={String(initialSummary.present)} tone="text-emerald-600" />
          <SummaryStat label="Absent" value={String(initialSummary.absent)} tone="text-rose-600" />
          <SummaryStat label="Late" value={String(initialSummary.late)} tone="text-amber-600" />
          <SummaryStat label="Total hours" value={formatDuration(initialSummary.total_minutes)} />
          <SummaryStat label="Overtime" value={formatDuration(initialSummary.overtime_minutes)} tone="text-brand-700" />
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-400">History</h2>
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <Chip key={t.key} active={tab === t.key} onClick={() => selectTab(t.key)} className="shrink-0">
              {t.label}
            </Chip>
          ))}
        </div>

        {tab === "custom" && (
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-500">
              From
              <input
                type="date"
                value={custom.from}
                max={custom.to}
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                className="mt-1 block h-10 rounded-xl bg-white px-3 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <label className="text-xs text-slate-500">
              To
              <input
                type="date"
                value={custom.to}
                min={custom.from}
                max={today}
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                className="mt-1 block h-10 rounded-xl bg-white px-3 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <button
              onClick={applyCustom}
              disabled={pending}
              className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        )}

        <Card className="divide-y divide-slate-50 overflow-hidden">
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">No records in this range.</p>
          ) : (
            rows.map((r) => (
              <div key={r.date} className="flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700">{formatDayLabel(r.date)}</p>
                  {"absent" in r ? (
                    <p className="text-xs text-slate-400">No record</p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      {formatTimeIST(r.check_in)} → {formatTimeIST(r.check_out)} · {formatDuration(r.total_minutes)}
                    </p>
                  )}
                </div>
                <StatusPill record={"absent" in r ? null : r} />
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

function StatusPill({ record }: { record: AttendanceRecord | null }) {
  if (!record) {
    return (
      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-400">
        Absent
      </span>
    );
  }
  if (record.status === "late") {
    return (
      <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        Late
      </span>
    );
  }
  if (!record.check_out) {
    return (
      <span className="shrink-0 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
        Working
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
      Present
    </span>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-3.5">
      <p className={`text-base font-semibold ${tone ?? "text-slate-900"}`}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{label}</p>
    </Card>
  );
}
