"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Clock, Save, Users, CheckCircle2, AlarmClock, UserX, LogOut as LogOutIcon, Activity } from "lucide-react";
import { Avatar, Card } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { updateAttendanceSettingsAction } from "@/app/actions/settings";
import { formatDateIST, formatDuration, formatTimeIST } from "@/lib/utils";
import type { AttendanceRecord, AttendanceSettings, Profile } from "@/lib/types";

type Row = { staff: Profile; record: AttendanceRecord | null };

function deriveStatus(record: AttendanceRecord | null): {
  label: string;
  className: string;
} {
  if (!record) return { label: "Absent", className: "bg-slate-100 text-slate-400" };
  if (record.status === "late") return { label: "Late", className: "bg-amber-50 text-amber-700" };
  if (!record.check_out) return { label: "Working", className: "bg-cyan-50 text-cyan-700" };
  return { label: "Present", className: "bg-emerald-50 text-emerald-700" };
}

export function AdminAttendanceView({
  rows,
  settings,
  date,
}: {
  rows: Row[];
  settings: AttendanceSettings;
  date: string;
}) {
  const totalStaff = rows.length;
  const present = rows.filter((r) => r.record?.check_in).length;
  const late = rows.filter((r) => r.record?.status === "late").length;
  const absent = totalStaff - present;
  const checkedOut = rows.filter((r) => r.record?.check_out).length;
  const working = rows.filter((r) => r.record?.check_in && !r.record?.check_out).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="mt-1 text-sm text-slate-500">{formatDateIST()} · staff check-ins for today</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat icon={<Users size={16} />} label="Total staff" value={totalStaff} />
        <Stat icon={<CheckCircle2 size={16} />} label="Present" value={present} tone="emerald" />
        <Stat icon={<AlarmClock size={16} />} label="Late" value={late} tone="amber" />
        <Stat icon={<UserX size={16} />} label="Absent" value={absent} tone="rose" />
        <Stat icon={<LogOutIcon size={16} />} label="Checked out" value={checkedOut} />
        <Stat icon={<Activity size={16} />} label="Currently working" value={working} tone="brand" />
      </div>

      <WorkingHoursCard settings={settings} />

      <Card className="overflow-hidden">
        <p className="border-b border-slate-100 p-4 text-sm font-semibold text-slate-500">
          Today&apos;s staff attendance
        </p>
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No staff members yet.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {rows.map(({ staff, record }) => {
              const status = deriveStatus(record);
              return (
                <Link
                  key={staff.id}
                  href={`/admin/attendance/${staff.id}`}
                  className="flex items-center gap-3 p-3.5 transition hover:bg-slate-50"
                >
                  <Avatar name={staff.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{staff.name}</p>
                    <p className="truncate text-xs capitalize text-slate-400">{staff.role}</p>
                  </div>
                  <div className="hidden shrink-0 text-right text-xs text-slate-500 sm:block">
                    <p>
                      {formatTimeIST(record?.check_in)} → {formatTimeIST(record?.check_out)}
                    </p>
                    <p className="text-slate-400">
                      {formatDuration(record?.total_minutes)}
                      {record && record.overtime_minutes > 0
                        ? ` · +${formatDuration(record.overtime_minutes)} OT`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                  >
                    {status.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <p className="text-xs text-slate-400">Showing attendance for {date}.</p>
    </div>
  );
}

function WorkingHoursCard({ settings }: { settings: AttendanceSettings }) {
  const toast = useToast();
  const [workStart, setWorkStart] = useState(settings.work_start);
  const [workEnd, setWorkEnd] = useState(settings.work_end);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await updateAttendanceSettingsAction(workStart, workEnd);
      if (res.ok) toast.push("Working hours updated");
      else toast.push(res.error ?? "Couldn’t save", "error");
    });
  }

  return (
    <Card className="flex flex-wrap items-end gap-4 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Clock size={18} />
      </span>
      <label className="text-xs font-medium text-slate-500">
        Working start
        <input
          type="time"
          value={workStart}
          onChange={(e) => setWorkStart(e.target.value)}
          className="mt-1 block h-10 rounded-xl bg-slate-50 px-3 text-sm ring-1 ring-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-brand-500"
        />
      </label>
      <label className="text-xs font-medium text-slate-500">
        Working end
        <input
          type="time"
          value={workEnd}
          onChange={(e) => setWorkEnd(e.target.value)}
          className="mt-1 block h-10 rounded-xl bg-slate-50 px-3 text-sm ring-1 ring-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-brand-500"
        />
      </label>
      <button
        onClick={save}
        disabled={pending}
        className="flex h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40"
      >
        <Save size={14} /> Save
      </button>
      <p className="w-full text-xs text-slate-400">
        Check-ins after {settings.work_start} are marked late; check-outs after {settings.work_end} count as overtime.
      </p>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "default" | "brand" | "emerald" | "amber" | "rose";
}) {
  const tones = {
    default: "text-slate-900",
    brand: "text-brand-700",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
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
