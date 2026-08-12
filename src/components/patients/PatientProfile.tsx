"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar, Activity, Wallet, ShieldAlert, Cake, Plus, X, CalendarPlus,
} from "lucide-react";
import { Avatar, Button, Card, Chip, StatusBadge, EmptyState } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { recordPaymentAction } from "@/app/actions/payments";
import {
  APPOINTMENT_TYPE_LABELS, formatINR, to12h,
} from "@/lib/utils";
import type {
  Appointment, Payment, PatientPreview, PaymentMethod, Prescription, Treatment,
} from "@/lib/types";
import { format } from "date-fns";

type Tab = "overview" | "history" | "appointments" | "payments";

export function PatientProfile({
  patient,
  appointments,
  treatments,
  payments,
  prescriptions,
}: {
  patient: PatientPreview;
  appointments: Appointment[];
  treatments: Treatment[];
  payments: Payment[];
  prescriptions: Prescription[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [payOpen, setPayOpen] = useState(false);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "history", label: "History" },
    { id: "appointments", label: "Appointments" },
    { id: "payments", label: "Payments" },
  ];

  return (
    <div className="space-y-5">
      {/* header */}
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-4"
      >
        <Avatar name={patient.full_name} size={56} />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {patient.full_name}
          </h1>
          <p className="truncate text-sm text-slate-500">{patient.phone}</p>
          <p className="text-xs text-slate-400">
            Patient since{" "}
            {patient.created_at
              ? format(new Date(patient.created_at), "MMM yyyy")
              : "—"}
          </p>
        </div>
      </motion.header>

      {/* summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.35 }}
        className="grid grid-cols-2 gap-3"
      >
        <Mini label="Total visits" value={String(patient.total_visits)} />
        <Mini
          label="Treatments"
          value={String(treatments.filter((t) => t.status === "completed").length)}
        />
        <Mini
          label="Upcoming"
          value={String(
            appointments.filter((a) =>
              ["scheduled", "confirmed", "checked_in"].includes(a.status),
            ).length,
          )}
        />
        <Mini
          label="Outstanding"
          value={patient.outstanding > 0 ? formatINR(patient.outstanding) : "Clear"}
          danger={patient.outstanding > 0}
        />
      </motion.div>

      <div className="flex gap-3">
        <Button className="flex-1" onClick={() => router.push("/new-booking")}>
          <CalendarPlus size={17} /> Book
        </Button>
        <Button variant="secondary" className="flex-1" onClick={() => setPayOpen(true)}>
          <Wallet size={17} /> Record payment
        </Button>
      </div>

      {/* tabs */}
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {tabs.map((t) => (
          <Chip key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </Chip>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
        >
          {tab === "overview" && (
            <Overview patient={patient} treatments={treatments} />
          )}
          {tab === "history" && (
            <Timeline treatments={treatments} prescriptions={prescriptions} />
          )}
          {tab === "appointments" && <Appointments appointments={appointments} />}
          {tab === "payments" && <Payments payments={payments} />}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {payOpen && (
          <RecordPaymentSheet
            patientId={patient.id}
            onClose={() => setPayOpen(false)}
            onDone={() => {
              setPayOpen(false);
              router.refresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Mini({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold ${
          danger ? "text-rose-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </Card>
  );
}

/* ---------------------------------------------------------------- overview */
function Overview({
  patient,
  treatments,
}: {
  patient: PatientPreview;
  treatments: Treatment[];
}) {
  const last = treatments[0];
  return (
    <div className="space-y-3">
      <Card className="divide-y divide-slate-100">
        <InfoRow
          icon={<ShieldAlert size={17} className="text-amber-500" />}
          label="Allergies"
          value={patient.allergies || "None recorded"}
        />
        <InfoRow
          icon={<Cake size={17} className="text-brand-600" />}
          label="Date of birth"
          value={
            patient.date_of_birth
              ? format(new Date(patient.date_of_birth), "d MMM yyyy")
              : "—"
          }
        />
        <InfoRow
          icon={<Activity size={17} className="text-brand-600" />}
          label="Last treatment"
          value={last?.treatment_name ?? "—"}
        />
      </Card>
      {patient.medical_notes && (
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Medical notes
          </p>
          <p className="mt-1 text-sm text-slate-600">{patient.medical_notes}</p>
        </Card>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-700">{value}</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- timeline */
function Timeline({
  treatments,
  prescriptions,
}: {
  treatments: Treatment[];
  prescriptions: Prescription[];
}) {
  if (treatments.length === 0) {
    return (
      <EmptyState
        icon={<Activity size={22} />}
        title="No history yet"
        description="Treatments and visits will appear here after the first appointment."
      />
    );
  }
  return (
    <div className="relative pl-6">
      <div className="absolute bottom-2 left-1.5 top-2 w-px bg-slate-200" />
      {treatments.map((t, i) => {
        const rx = prescriptions.filter((p) => p.treatment_id === t.id);
        return (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.05 }}
            className="relative mb-4"
          >
            <span className="absolute -left-6 top-1.5 h-3 w-3 rounded-full bg-gradient-to-br from-brand-600 to-accent ring-4 ring-canvas" />
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">
                    {t.treatment_date
                      ? format(new Date(t.treatment_date), "d MMM yyyy")
                      : "Undated"}
                  </p>
                  <p className="mt-0.5 font-semibold">
                    {t.treatment_name}
                    {t.tooth_number ? ` — Tooth ${t.tooth_number}` : ""}
                  </p>
                  {t.diagnosis && (
                    <p className="mt-0.5 text-xs text-slate-500">{t.diagnosis}</p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium capitalize text-brand-700">
                  {t.status.replace("_", " ")}
                </span>
              </div>
              {t.cost > 0 && (
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {formatINR(t.cost)}
                </p>
              )}
              {rx.map((p) => (
                <div key={p.id} className="mt-3 rounded-2xl bg-slate-50 p-3">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Prescription
                  </p>
                  <ul className="space-y-1">
                    {p.medicines.map((m, idx) => (
                      <li key={idx} className="text-xs text-slate-600">
                        <span className="font-medium text-slate-700">{m.name}</span>
                        {m.dosage && ` · ${m.dosage}`}
                        {m.frequency && ` · ${m.frequency}`}
                        {m.duration && ` · ${m.duration}`}
                      </li>
                    ))}
                  </ul>
                  {p.notes && <p className="mt-1.5 text-xs text-slate-500">{p.notes}</p>}
                </div>
              ))}
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- appts */
function Appointments({ appointments }: { appointments: Appointment[] }) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={<Calendar size={22} />}
        title="No appointments"
        description="Book one from the button above to get started."
      />
    );
  }
  return (
    <div className="space-y-2.5">
      {appointments.map((a) => (
        <Card key={a.id} className="flex items-center gap-3 p-4">
          <div className="w-16 shrink-0">
            <p className="text-xs font-semibold text-slate-600">
              {format(new Date(a.appointment_date), "d MMM")}
            </p>
            <p className="text-xs text-slate-400">{to12h(a.start_time)}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {APPOINTMENT_TYPE_LABELS[a.appointment_type]}
            </p>
            {a.dentist_name && (
              <p className="truncate text-xs text-slate-400">
                {a.dentist_name}
              </p>
            )}
          </div>
          <StatusBadge status={a.status} />
        </Card>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- payments */
function Payments({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <EmptyState
        icon={<Wallet size={22} />}
        title="No payments recorded"
        description="Recorded payments and their methods will show up here."
      />
    );
  }
  return (
    <div className="space-y-2.5">
      {payments.map((p) => (
        <Card key={p.id} className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-semibold">{formatINR(p.amount)}</p>
            <p className="text-xs capitalize text-slate-400">
              {p.payment_method.replace("_", " ")} ·{" "}
              {format(new Date(p.payment_date), "d MMM yyyy")}
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700">
            {p.payment_status}
          </span>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ payment sheet */
const METHODS: PaymentMethod[] = ["cash", "upi", "card", "bank_transfer", "other"];

function RecordPaymentSheet({
  patientId,
  onClose,
  onDone,
}: {
  patientId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [pending, start] = useTransition();

  function submit() {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.push("Enter an amount", "error");
      return;
    }
    start(async () => {
      const res = await recordPaymentAction({
        patient_id: patientId,
        amount: value,
        payment_method: method,
      });
      if (res.ok) {
        toast.push("Payment recorded");
        onDone();
      } else {
        toast.push(res.error ?? "Couldn’t record payment", "error");
      }
    });
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-float"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Record payment</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-50 text-slate-500"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex h-14 items-center gap-2 rounded-2xl bg-slate-50 px-4 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-500">
          <span className="text-lg font-semibold text-slate-400">₹</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            autoFocus
            placeholder="0"
            className="w-full bg-transparent text-lg font-semibold outline-none"
            style={{ fontSize: 18 }}
          />
        </div>

        <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
          Method
        </p>
        <div className="flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <Chip key={m} active={method === m} onClick={() => setMethod(m)}>
              <span className="capitalize">{m.replace("_", " ")}</span>
            </Chip>
          ))}
        </div>

        <Button
          size="lg"
          className="mt-5 w-full"
          disabled={pending}
          onClick={submit}
        >
          <Plus size={18} /> {pending ? "Saving…" : "Record payment"}
        </Button>
      </motion.div>
    </motion.div>
  );
}
