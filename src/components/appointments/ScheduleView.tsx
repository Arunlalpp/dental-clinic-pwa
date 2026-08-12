"use client";

import { useEffect, useState, useTransition } from "react";
import { addDays, format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, LogIn, Play, CheckCheck, CalendarX } from "lucide-react";
import { Avatar, Card, Button, StatusBadge, EmptyState } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { useRealtimeAppointments } from "@/hooks/useRealtimeAppointments";
import * as appointmentService from "@/services/appointmentService.client";
import { updateAppointmentStatusAction } from "@/app/actions/appointments";
import { CompleteConsultationSheet } from "@/components/appointments/CompleteConsultationSheet";
import { APPOINTMENT_TYPE_LABELS, to12h } from "@/lib/utils";
import type { Appointment, AppointmentStatus, TreatmentPrice } from "@/lib/types";

const WAITING: AppointmentStatus[] = ["checked_in", "in_treatment"];

export function ScheduleView({
  initial,
  date: initialDate,
  prices,
}: {
  initial: Appointment[];
  date: string;
  prices: TreatmentPrice[];
}) {
  const [date, setDate] = useState(initialDate);
  const [appts, setAppts] = useState<Appointment[]>(initial);
  const [completing, setCompleting] = useState<Appointment | null>(null);
  const toast = useToast();
  const [pending, start] = useTransition();
  useRealtimeAppointments(date);

  const dates = Array.from({ length: 10 }, (_, i) => addDays(new Date(), i - 2));

  useEffect(() => {
    let cancelled = false;
    appointmentService
      .listByDate(date)
      .then((r) => !cancelled && setAppts(r))
      .catch(() => !cancelled && setAppts([]));
    return () => {
      cancelled = true;
    };
  }, [date]);

  function transition(id: string, status: AppointmentStatus, label: string) {
    start(async () => {
      const res = await updateAppointmentStatusAction(id, status);
      if (res.ok) {
        toast.push(label);
        setAppts(await appointmentService.listByDate(date));
      } else {
        toast.push("Couldn’t update", "error");
      }
    });
  }

  const waiting = appts.filter((a) => WAITING.includes(a.status));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="mt-1 text-sm text-slate-500">
          {format(new Date(date), "EEEE, MMMM d")}
        </p>
      </header>

      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {dates.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const active = key === date;
          return (
            <button
              key={key}
              onClick={() => setDate(key)}
              className={`flex h-[68px] w-14 shrink-0 flex-col items-center justify-center rounded-2xl ring-1 transition active:scale-95 ${
                active
                  ? "bg-gradient-to-br from-brand-600 to-accent text-white ring-transparent shadow-card"
                  : "bg-white text-slate-600 ring-slate-200"
              }`}
            >
              <span className={`text-xs ${active ? "text-brand-50" : "text-slate-400"}`}>
                {format(d, "EEE")}
              </span>
              <span className="mt-0.5 text-lg font-semibold">{format(d, "d")}</span>
            </button>
          );
        })}
      </div>

      {waiting.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-400">
            Waiting room · {waiting.length}
          </h2>
          <div className="space-y-2.5">
            {waiting.map((a) => (
              <Card key={a.id} className="flex items-center gap-3 p-3 ring-brand-100">
                <Avatar name={a.patient_name ?? "?"} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {a.patient_name}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {APPOINTMENT_TYPE_LABELS[a.appointment_type]}
                  </p>
                </div>
                {a.status === "checked_in" ? (
                  <Button
                    className="h-9 px-3 text-xs"
                    disabled={pending}
                    onClick={() => transition(a.id, "in_treatment", "Treatment started")}
                  >
                    <Play size={14} /> Start
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    className="h-9 px-3 text-xs"
                    disabled={pending}
                    onClick={() => setCompleting(a)}
                  >
                    <CheckCheck size={14} /> Complete
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-400">
          Appointments · {appts.length}
        </h2>
        {appts.length === 0 ? (
          <EmptyState
            icon={<CalendarX size={22} />}
            title="Nothing scheduled"
            description="This day is clear. Pick another date or book an appointment."
          />
        ) : (
          <div className="space-y-2.5">
            {appts.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="flex items-center gap-3 p-3">
                  <div className="flex w-14 shrink-0 flex-col items-center">
                    <Clock size={14} className="text-slate-300" />
                    <span className="mt-0.5 text-xs font-semibold text-slate-600">
                      {to12h(a.start_time)}
                    </span>
                  </div>
                  <Avatar name={a.patient_name ?? "?"} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {a.patient_name}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {APPOINTMENT_TYPE_LABELS[a.appointment_type]}
                    </p>
                  </div>
                  {a.status === "scheduled" || a.status === "confirmed" ? (
                    <Button
                      variant="secondary"
                      className="h-9 px-3 text-xs"
                      disabled={pending}
                      onClick={() => transition(a.id, "checked_in", "Checked in")}
                    >
                      <LogIn size={14} /> Check in
                    </Button>
                  ) : (
                    <StatusBadge status={a.status} />
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {completing && (
          <CompleteConsultationSheet
            appointment={completing}
            prices={prices}
            onClose={() => setCompleting(null)}
            onDone={async () => {
              setCompleting(null);
              setAppts(await appointmentService.listByDate(date));
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
