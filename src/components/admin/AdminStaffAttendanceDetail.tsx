import Link from "next/link";
import { ChevronLeft, ChevronRight, Mail, Phone, CalendarDays, Wallet, Shield } from "lucide-react";
import { Avatar, Card } from "@/components/ui";
import { addDaysToDateKey, dateKey, formatDuration, formatINR, formatTimeIST } from "@/lib/utils";
import type { AttendanceMonthlySummary, AttendanceRecord, Profile } from "@/lib/types";

function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

function daysInMonth(monthKey: string): string[] {
  const [y, m] = monthKey.split("-").map(Number);
  const count = new Date(y, m, 0).getDate();
  const out: string[] = [];
  let cursor = `${monthKey}-01`;
  for (let i = 0; i < count; i++) {
    out.push(cursor);
    cursor = addDaysToDateKey(cursor, 1);
  }
  return out;
}

export function AdminStaffAttendanceDetail({
  staff,
  summary,
  records,
  monthKey,
}: {
  staff: Profile;
  summary: AttendanceMonthlySummary;
  records: AttendanceRecord[];
  monthKey: string;
}) {
  const today = dateKey();
  const isCurrentMonth = monthKey === today.slice(0, 7);
  const recordByDate = new Map(records.map((r) => [r.date, r]));
  const rows = daysInMonth(monthKey)
    .filter((d) => d <= today)
    .reverse();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/attendance" className="text-xs font-semibold text-brand-600">
          ← Back to attendance
        </Link>
      </div>

      <header className="flex items-center gap-4">
        <Avatar name={staff.name} size={52} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{staff.name}</h1>
          <span className="inline-flex items-center gap-1 text-sm capitalize text-slate-500">
            <Shield size={13} /> {staff.role}
          </span>
        </div>
      </header>

      {/* Staff information */}
      <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        <InfoItem icon={<Phone size={14} />} label="Phone" value={staff.phone ?? "Not set"} />
        <InfoItem icon={<Mail size={14} />} label="Email" value={staff.email ?? "Not set"} />
        <InfoItem
          icon={<CalendarDays size={14} />}
          label="Joining date"
          value={staff.joining_date ?? "Not set"}
        />
        <InfoItem
          icon={<Wallet size={14} />}
          label="Monthly salary"
          value={staff.monthly_salary != null ? formatINR(staff.monthly_salary) : "Not set"}
        />
      </Card>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Link
          href={`/admin/attendance/${staff.id}?month=${shiftMonthKey(monthKey, -1)}`}
          className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-500 shadow-card ring-1 ring-slate-100 transition active:scale-90"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </Link>
        <p className="text-sm font-semibold text-slate-700">{monthLabel(monthKey)}</p>
        {isCurrentMonth ? (
          <span className="grid h-9 w-9 place-items-center text-slate-200">
            <ChevronRight size={16} />
          </span>
        ) : (
          <Link
            href={`/admin/attendance/${staff.id}?month=${shiftMonthKey(monthKey, 1)}`}
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-500 shadow-card ring-1 ring-slate-100 transition active:scale-90"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </Link>
        )}
      </div>

      {/* Monthly summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryStat label="Working days" value={String(summary.working_days)} />
        <SummaryStat label="Present" value={String(summary.present)} tone="text-emerald-600" />
        <SummaryStat label="Absent" value={String(summary.absent)} tone="text-rose-600" />
        <SummaryStat label="Late" value={String(summary.late)} tone="text-amber-600" />
        <SummaryStat label="Total hours" value={formatDuration(summary.total_minutes)} />
        <SummaryStat label="Overtime" value={formatDuration(summary.overtime_minutes)} tone="text-brand-700" />
      </div>

      {/* Attendance table */}
      <Card className="overflow-hidden">
        <p className="border-b border-slate-100 p-4 text-sm font-semibold text-slate-500">
          Attendance records
        </p>
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No records this month.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {rows.map((date) => {
              const record = recordByDate.get(date) ?? null;
              return (
                <div key={date} className="flex items-center justify-between gap-3 p-3.5">
                  <p className="w-24 shrink-0 text-sm font-medium text-slate-700">
                    {new Intl.DateTimeFormat("en-US", {
                      timeZone: "Asia/Kolkata",
                      month: "short",
                      day: "numeric",
                    }).format(new Date(`${date}T12:00:00+05:30`))}
                  </p>
                  <p className="flex-1 text-xs text-slate-400">
                    {record
                      ? `${formatTimeIST(record.check_in)} → ${formatTimeIST(record.check_out)} · ${formatDuration(record.total_minutes)}${
                          record.overtime_minutes > 0 ? ` · +${formatDuration(record.overtime_minutes)} OT` : ""
                        }`
                      : "No record"}
                  </p>
                  <StatusPill record={record} />
                </div>
              );
            })}
          </div>
        )}
      </Card>
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

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
        {icon} {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-800">{value}</p>
    </div>
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
