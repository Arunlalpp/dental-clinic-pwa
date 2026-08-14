"use client";

import { useEffect, useState, useTransition } from "react";
import { Clock, LogIn, LogOut } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { checkInAction, checkOutAction } from "@/app/actions/attendance";
import { formatDateIST, formatDuration, formatTimeIST } from "@/lib/utils";
import type { AttendanceRecord } from "@/lib/types";

function minutesSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

export function AttendanceCheckCard({ initial }: { initial: AttendanceRecord | null }) {
  const toast = useToast();
  const [record, setRecord] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState(() => (record?.check_in ? minutesSince(record.check_in) : 0));

  useEffect(() => {
    if (!record?.check_in || record.check_out) return;
    const checkIn = record.check_in;
    const tick = () => setElapsed(minutesSince(checkIn));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [record?.check_in, record?.check_out]);

  function handleCheckIn() {
    startTransition(async () => {
      const res = await checkInAction();
      if (res.ok) setRecord(res.record);
      else toast.push(res.error, "error");
    });
  }

  function handleCheckOut() {
    startTransition(async () => {
      const res = await checkOutAction();
      if (res.ok) setRecord(res.record);
      else toast.push(res.error, "error");
    });
  }

  const isWorking = record?.check_in && !record?.check_out;
  const isComplete = Boolean(record?.check_in && record?.check_out);

  return (
    <Card className="overflow-hidden p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">Today&apos;s attendance</p>
          <p className="text-xs text-slate-400">{formatDateIST()}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <Clock size={18} />
        </span>
      </div>

      {!record && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">You haven&apos;t checked in yet.</p>
          <Button size="lg" className="w-full" onClick={handleCheckIn} disabled={pending}>
            <LogIn size={18} /> Check in
          </Button>
        </div>
      )}

      {isWorking && (
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Checked in</p>
              <p className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">
                {formatTimeIST(record!.check_in)}
              </p>
              {record!.status === "late" && (
                <span className="mt-1 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  Late by {formatDuration(record!.late_minutes)}
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Working for</p>
              <p className="mt-0.5 text-xl font-semibold text-brand-700">{formatDuration(elapsed)}</p>
            </div>
          </div>
          <Button size="lg" variant="secondary" className="w-full" onClick={handleCheckOut} disabled={pending}>
            <LogOut size={18} /> Check out
          </Button>
        </div>
      )}

      {isComplete && (
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Check in" value={formatTimeIST(record!.check_in)} />
          <Stat label="Check out" value={formatTimeIST(record!.check_out)} />
          <Stat label="Total" value={formatDuration(record!.total_minutes)} />
          <Stat
            label="Status"
            value={record!.status === "late" ? "Completed · Late" : "Completed"}
            tone={record!.status === "late" ? "text-amber-600" : "text-emerald-600"}
          />
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-base font-semibold ${tone ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}
