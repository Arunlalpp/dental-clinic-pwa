"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, format } from "date-fns";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Phone, X, UserPlus, Plus, ArrowLeft, Check, AlertCircle,
} from "lucide-react";
import { Avatar, Button, Card, Chip, Field, Skeleton } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { usePatientSearch } from "@/hooks/usePatientSearch";
import * as appointmentService from "@/services/appointmentService.client";
import { createPatientAction } from "@/app/actions/patients";
import { bookAppointmentAction } from "@/app/actions/appointments";
import { PatientPreviewCard } from "@/components/patients/PatientPreviewCard";
import { BookingSuccessOverlay } from "@/components/appointments/SuccessOverlay";
import {
  APPOINTMENT_TYPE_LABELS, APPOINTMENT_TYPES, normalizePhone, to12h,
} from "@/lib/utils";
import type {
  AppointmentType, Gender, PatientPreview,
} from "@/lib/types";

type DentistOption = { id: string; name: string };
type Stage = "lookup" | "create" | "booking";

export function BookingFlow({ dentists }: { dentists: DentistOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<Stage>("lookup");
  const [patient, setPatient] = useState<PatientPreview | null>(null);
  const { state, match } = usePatientSearch(phone);

  // Keep the resolved patient in sync with the live search while on lookup.
  useEffect(() => {
    if (stage === "lookup") setPatient(match);
  }, [match, stage]);

  return (
    <div className="space-y-5">
      {stage === "lookup" && (
        <>
          <header>
            <h1 className="text-2xl font-semibold tracking-tight">
              Find or add a patient
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Start with their phone number.
            </p>
          </header>

          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Phone number
            </span>
            <div className="flex h-[60px] items-center gap-3 rounded-2xl bg-white px-4 shadow-card ring-1 ring-slate-100 focus-within:ring-2 focus-within:ring-brand-500">
              <Phone size={20} className="shrink-0 text-brand-600" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoFocus
                placeholder="+91 98765 43210"
                className="h-[60px] w-full bg-transparent text-lg font-medium tracking-wide outline-none placeholder:text-slate-300"
                style={{ fontSize: 18 }}
              />
              {phone && (
                <button
                  onClick={() => setPhone("")}
                  aria-label="Clear"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-300"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </label>

          <div>
            {state === "searching" && <LookupSkeleton />}
            {state === "found" && patient && (
              <PatientPreviewCard
                patient={patient}
                onBook={() => setStage("booking")}
                onHistory={() => router.push(`/patients/${patient.id}`)}
              />
            )}
            {state === "empty" && (
              <NoMatch phone={phone} onCreate={() => setStage("create")} />
            )}
            {state === "error" && (
              <Card className="p-5 text-sm text-rose-600">
                Couldn’t reach the patient database. Check your connection and try again.
              </Card>
            )}
          </div>
        </>
      )}

      {stage === "create" && (
        <CreatePatient
          phone={phone}
          onBack={() => setStage("lookup")}
          onCreated={(p) => {
            setPatient(p);
            setStage("booking");
            router.refresh();
          }}
        />
      )}

      {stage === "booking" && patient && (
        <Booking
          patient={patient}
          dentists={dentists}
          onBack={() => setStage("lookup")}
          onBooked={() => {
            toast.push("Appointment booked");
            router.push("/appointments");
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- skeleton */
function LookupSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 rounded-2xl" />
        ))}
      </div>
    </Card>
  );
}

function NoMatch({ phone, onCreate }: { phone: string; onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
          <UserPlus size={22} />
        </div>
        <p className="mt-3 text-base font-semibold">No patient on this number</p>
        <p className="mt-1 text-sm text-slate-500">
          {phone} isn’t in the system yet.
        </p>
        <Button className="mt-4 w-full" onClick={onCreate}>
          <Plus size={17} /> Create patient
        </Button>
      </Card>
    </motion.div>
  );
}

/* ---------------------------------------------------------------- create */
function CreatePatient({
  phone,
  onBack,
  onCreated,
}: {
  phone: string;
  onBack: () => void;
  onCreated: (p: PatientPreview) => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [email, setEmail] = useState("");
  const [duplicate, setDuplicate] = useState(false);

  const createPatient = useMutation({
    mutationFn: createPatientAction,
    onSuccess: (res) => {
      if (res.ok) {
        toast.push(`${name.trim()} added`);
        queryClient.invalidateQueries({ queryKey: ["patient-search"] });
        queryClient.invalidateQueries({ queryKey: ["patient-by-phone"] });
        onCreated({
          id: res.patientId,
          full_name: name.trim(),
          phone,
          normalized_phone: normalizePhone(phone),
          patient_number: null,
          email: email || null,
          date_of_birth: dob || null,
          gender: gender || null,
          address: null,
          medical_notes: null,
          allergies: null,
          emergency_contact: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          stats: {
            total_cost: 0,
            total_paid: 0,
            outstanding: 0,
            last_visit: null,
            last_treatment: null,
            total_visits: 0,
          },
          last_visit: null,
          last_treatment: null,
          total_visits: 0,
          outstanding: 0,
        });
      } else if (res.duplicate) {
        setDuplicate(true);
      } else {
        toast.push(res.error ?? "Couldn’t create patient", "error");
      }
    },
    onError: () => toast.push("Couldn’t create patient", "error"),
  });

  function submit() {
    createPatient.mutate({
      full_name: name.trim(),
      phone,
      email: email || null,
      date_of_birth: dob || null,
      gender: gender || null,
    });
  }
  const pending = createPatient.isPending;

  return (
    <div>
      <BackBar title="New patient" onBack={onBack} />

      {duplicate ? (
        <Card className="p-6">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle size={18} />
            <span className="text-sm font-semibold">Patient already exists</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {phone} is already registered. Go back to open their record.
          </p>
          <Button variant="secondary" className="mt-4 w-full" onClick={onBack}>
            Back to lookup
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-brand-50 px-4 py-3 ring-1 ring-brand-100">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
              Phone
            </p>
            <p className="text-base font-semibold text-brand-900">{phone}</p>
          </div>

          <Field
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rahul Thomas"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Date of birth"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
            <div>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Gender
              </span>
              <div className="flex gap-2">
                {(["male", "female", "other"] as Gender[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`h-12 flex-1 rounded-2xl text-sm font-semibold uppercase ring-1 transition ${
                      gender === g
                        ? "bg-brand-600 text-white ring-brand-600"
                        : "bg-white text-slate-500 ring-slate-200"
                    }`}
                  >
                    {g[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Field
            label="Email (optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@email.com"
          />

          <Button
            size="lg"
            className="w-full"
            disabled={!name.trim() || pending}
            onClick={submit}
          >
            <Check size={19} /> {pending ? "Creating…" : "Create patient"}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- booking */
function Booking({
  patient,
  dentists,
  onBack,
  onBooked,
}: {
  patient: PatientPreview;
  dentists: DentistOption[];
  onBack: () => void;
  onBooked: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const dates = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDays(new Date(), i)),
    [],
  );
  const [dentist, setDentist] = useState(dentists[0]?.id ?? "");
  const [type, setType] = useState<AppointmentType>("consultation");
  const [dateKey, setDateKey] = useState(format(dates[0], "yyyy-MM-dd"));
  const [slot, setSlot] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: slots = null } = useQuery({
    queryKey: ["available-slots", dateKey, dentist],
    queryFn: () => appointmentService.availableSlots(dateKey, dentist),
    enabled: Boolean(dentist),
  });

  useEffect(() => setSlot(null), [dateKey, dentist]);

  const bookAppointment = useMutation({
    mutationFn: bookAppointmentAction,
    onSuccess: (res) => {
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["available-slots", dateKey, dentist] });
        setShowSuccess(true);
      } else if (res.conflict) {
        toast.push("That slot was just taken. Pick another.", "error");
        queryClient.invalidateQueries({ queryKey: ["available-slots", dateKey, dentist] });
      } else {
        toast.push(res.error ?? "Couldn’t book", "error");
      }
    },
    onError: () => toast.push("Couldn’t book", "error"),
  });

  function confirm() {
    if (!slot || !dentist) return;
    bookAppointment.mutate({
      patient_id: patient.id,
      dentist_id: dentist,
      appointment_date: dateKey,
      start_time: slot,
      appointment_type: type,
    });
  }
  const pending = bookAppointment.isPending;

  if (showSuccess) {
    return <BookingSuccessOverlay onDone={onBooked} />;
  }

  return (
    <div className="pb-4">
      <BackBar title="Book appointment" onBack={onBack} />

      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card ring-1 ring-slate-100">
        <Avatar name={patient.full_name} size={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{patient.full_name}</p>
          <p className="truncate text-xs text-slate-500">{patient.phone}</p>
        </div>
      </div>

      <SectionLabel>Dentist</SectionLabel>
      <div className="mb-5 flex flex-wrap gap-2">
        {dentists.map((d) => (
          <Chip key={d.id} active={dentist === d.id} onClick={() => setDentist(d.id)}>
            {d.name}
          </Chip>
        ))}
        {dentists.length === 0 && (
          <p className="text-sm text-slate-400">
            No dentists yet — add one in Settings.
          </p>
        )}
      </div>

      <SectionLabel>Appointment type</SectionLabel>
      <div className="mb-5 flex flex-wrap gap-2">
        {APPOINTMENT_TYPES.map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(t)}>
            {APPOINTMENT_TYPE_LABELS[t]}
          </Chip>
        ))}
      </div>

      <SectionLabel>Date</SectionLabel>
      <div className="no-scrollbar -mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {dates.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const active = key === dateKey;
          return (
            <button
              key={key}
              onClick={() => setDateKey(key)}
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

      <SectionLabel>Available times</SectionLabel>
      <div className="mb-6 grid grid-cols-3 gap-2">
        {slots === null ? (
          Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-2xl" />
          ))
        ) : slots.length === 0 ? (
          <p className="col-span-3 text-sm text-slate-400">
            {dentist ? "No times available for this day." : "Pick a dentist to see available times."}
          </p>
        ) : (
          slots.map((s) => {
              const active = slot === s.time;
              return (
                <button
                  key={s.time}
                  disabled={!s.available}
                  onClick={() => setSlot(s.time)}
                  className={`h-12 rounded-2xl text-sm font-semibold ring-1 transition active:scale-95 ${
                    active
                      ? "bg-gradient-to-br from-brand-600 to-accent text-white ring-transparent shadow-card"
                      : s.available
                        ? "bg-white text-slate-700 ring-slate-200"
                        : "bg-slate-50 text-slate-300 line-through ring-transparent"
                  }`}
                >
                  {to12h(s.time)}
                </button>
              );
            })
        )}
      </div>

      <div
        className="sticky bottom-0 -mx-5 border-t border-slate-100 bg-white/90 px-5 pt-3 backdrop-blur"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <Button
          size="lg"
          className="w-full"
          disabled={!slot || !dentist || pending}
          onClick={confirm}
        >
          {slot ? (
            <>
              {pending ? "Booking…" : "Confirm booking"} <Check size={19} />
            </>
          ) : (
            "Select a time"
          )}
        </Button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- shared */
function BackBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <button
        onClick={onBack}
        aria-label="Back"
        className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-600 shadow-card ring-1 ring-slate-100 transition active:scale-90"
      >
        <ArrowLeft size={18} />
      </button>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
    </div>
  );
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-slate-400">
      {children}
    </p>
  );
}
