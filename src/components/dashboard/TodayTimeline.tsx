"use client";

import { useTransition } from "react";
import { motion } from "framer-motion";
import { Clock, LogIn, CalendarX } from "lucide-react";
import { Avatar, StatusBadge, EmptyState, Button } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { useRealtimeAppointments } from "@/hooks/useRealtimeAppointments";
import { updateAppointmentStatusAction } from "@/app/actions/appointments";
import { to12h, APPOINTMENT_TYPE_LABELS } from "@/lib/utils";
import type { Appointment } from "@/lib/types";

export function TodayTimeline({
  appointments,
  date,
}: {
  appointments: Appointment[];
  date: string;
}) {
  useRealtimeAppointments(date);
  const toast = useToast();
  const [pending, start] = useTransition();

  function checkIn(id: string) {
    start(async () => {
      const res = await updateAppointmentStatusAction(id, "checked_in");
      toast.push(res.ok ? "Patient checked in" : "Couldn’t check in", res.ok ? "ok" : "error");
    });
  }

  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={<CalendarX size={22} />}
        title="No appointments yet"
        description="Your schedule is clear. Book the first one to get the day started."
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {appointments.map((a, i) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.3 }}
          className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card ring-1 ring-slate-100"
        >
          <div className="flex w-14 shrink-0 flex-col items-center">
            <Clock size={14} className="text-slate-300" />
            <span className="mt-0.5 text-xs font-semibold text-slate-600">
              {to12h(a.start_time)}
            </span>
          </div>
          <Avatar name={a.patient_name ?? "?"} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {a.patient_name ?? "Unknown"}
            </p>
            <p className="truncate text-xs text-slate-400">
              {APPOINTMENT_TYPE_LABELS[a.appointment_type]}
              {a.dentist_name ? ` · ${a.dentist_name}` : ""}
            </p>
          </div>
          {a.status === "confirmed" || a.status === "scheduled" ? (
            <Button
              variant="secondary"
              onClick={() => checkIn(a.id)}
              disabled={pending}
              className="h-9 px-3 text-xs"
            >
              <LogIn size={15} /> Check in
            </Button>
          ) : (
            <StatusBadge status={a.status} />
          )}
        </motion.div>
      ))}
    </div>
  );
}
