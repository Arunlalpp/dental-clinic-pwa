"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Trash2, CheckCheck } from "lucide-react";
import { Button, Card, Chip, Field } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { completeConsultationAction } from "@/app/actions/appointments";
import { APPOINTMENT_TYPE_LABELS, APPOINTMENT_TYPES, getFee } from "@/lib/utils";
import { ConsultationSuccessOverlay } from "@/components/appointments/SuccessOverlay";
import { ALL_MEDICINES } from "@/lib/medicineReference";
import type { Appointment, AppointmentType, Medicine, TreatmentPrice } from "@/lib/types";

const emptyMedicine = (): Medicine => ({ name: "", dosage: "", frequency: "", duration: "" });

const inputCls =
  "h-10 rounded-xl bg-slate-50 px-3 text-sm outline-none ring-1 ring-slate-200 placeholder:text-slate-300 focus:ring-2 focus:ring-brand-500";
const textareaCls =
  "w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-slate-200 placeholder:text-slate-300 focus:ring-2 focus:ring-brand-500";

export function CompleteConsultationSheet({
  appointment,
  prices,
  onClose,
  onDone,
}: {
  appointment: Appointment;
  prices: TreatmentPrice[];
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [type, setType] = useState<AppointmentType>(appointment.appointment_type);
  const [fee, setFee] = useState(() =>
    String(getFee(prices, appointment.appointment_type, appointment.dentist_id)),
  );
  const [toothNumber, setToothNumber] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [writePrescription, setWritePrescription] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>([emptyMedicine()]);
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const completeConsultation = useMutation({
    mutationFn: completeConsultationAction,
    onSuccess: (res) => {
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["patient-search"] });
        queryClient.invalidateQueries({ queryKey: ["patient-by-phone"] });
        setShowSuccess(true);
      } else {
        toast.push(res.error ?? "Couldn’t complete consultation", "error");
      }
    },
    onError: () => toast.push("Couldn’t complete consultation", "error"),
  });
  const pending = completeConsultation.isPending;

  function selectType(t: AppointmentType) {
    setType(t);
    setFee(String(getFee(prices, t, appointment.dentist_id)));
  }

  function updateMedicine(i: number, patch: Partial<Medicine>) {
    setMedicines((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  function submit() {
    const cleanedMedicines = medicines
      .map((m) => ({ ...m, name: m.name.trim() }))
      .filter((m) => m.name);
    completeConsultation.mutate({
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      dentist_id: appointment.dentist_id,
      treatment_type: type,
      tooth_number: toothNumber || null,
      diagnosis: diagnosis || null,
      notes: notes || null,
      cost: Number(fee) || 0,
      prescription:
        writePrescription && cleanedMedicines.length > 0
          ? { medicines: cleanedMedicines, notes: prescriptionNotes || null }
          : null,
    });
  }

  if (showSuccess) {
    return <ConsultationSuccessOverlay onDone={onDone} />;
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
        className="flex w-full max-w-md flex-col rounded-t-3xl bg-white shadow-float"
        style={{ maxHeight: "92vh" }}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">Complete consultation</h3>
            <p className="truncate text-sm text-slate-500">{appointment.patient_name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-500"
          >
            <X size={17} />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-5"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Treatment
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {APPOINTMENT_TYPES.map((t) => (
              <Chip key={t} active={type === t} onClick={() => selectType(t)}>
                {APPOINTMENT_TYPE_LABELS[t]}
              </Chip>
            ))}
          </div>

          <div className="mb-4 flex h-14 items-center gap-2 rounded-2xl bg-slate-50 px-4 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-500">
            <span className="text-lg font-semibold text-slate-400">₹</span>
            <input
              value={fee}
              onChange={(e) => setFee(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="0"
              className="w-full bg-transparent text-lg font-semibold outline-none"
              style={{ fontSize: 18 }}
            />
            <span className="shrink-0 text-xs text-slate-400">Fee</span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <Field
              label="Tooth number"
              value={toothNumber}
              onChange={(e) => setToothNumber(e.target.value)}
              placeholder="e.g. 26"
            />
            <Field
              label="Diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <label className="mb-4 block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional"
              className={textareaCls}
            />
          </label>

          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Write a prescription</span>
            <button
              type="button"
              onClick={() => setWritePrescription((v) => !v)}
              aria-pressed={writePrescription}
              className={`h-7 w-12 rounded-full transition ${
                writePrescription ? "bg-gradient-to-br from-brand-600 to-accent" : "bg-slate-200"
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow transition ${
                  writePrescription ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <AnimatePresence>
            {writePrescription && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mb-3 space-y-2.5">
                  {medicines.map((m, i) => (
                    <Card key={i} className="p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">
                          Medicine {i + 1}
                        </span>
                        {medicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setMedicines((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            aria-label="Remove medicine"
                            className="text-rose-500"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <MedicineNameField
                          index={i}
                          value={m.name}
                          onUpdate={updateMedicine}
                        />
                        <input
                          value={m.dosage}
                          onChange={(e) => updateMedicine(i, { dosage: e.target.value })}
                          placeholder="Dosage (e.g. 500mg)"
                          className={inputCls}
                        />
                        <input
                          value={m.frequency}
                          onChange={(e) => updateMedicine(i, { frequency: e.target.value })}
                          placeholder="Frequency (e.g. 2x/day)"
                          className={inputCls}
                        />
                        <input
                          value={m.duration}
                          onChange={(e) => updateMedicine(i, { duration: e.target.value })}
                          placeholder="Duration (e.g. 5 days)"
                          className={`${inputCls} col-span-2`}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setMedicines((prev) => [...prev, emptyMedicine()])}
                  className="mb-3 flex items-center gap-1 text-sm font-medium text-brand-600"
                >
                  <Plus size={15} /> Add medicine
                </button>
                <label className="mb-4 block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Prescription notes
                  </span>
                  <textarea
                    value={prescriptionNotes}
                    onChange={(e) => setPrescriptionNotes(e.target.value)}
                    rows={2}
                    placeholder="Optional"
                    className={textareaCls}
                  />
                </label>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-5 pt-3">
          <Button size="lg" className="w-full" disabled={pending} onClick={submit}>
            <CheckCheck size={18} /> {pending ? "Completing…" : "Complete consultation"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------- medicine autocomplete */
function MedicineNameField({
  index,
  value,
  onUpdate,
}: {
  index: number;
  value: string;
  onUpdate: (i: number, patch: Partial<Medicine>) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const query = value.trim().toLowerCase();
  const matches = query
    ? ALL_MEDICINES.filter((m) => m.name.toLowerCase().includes(query)).slice(0, 6)
    : [];

  return (
    <div ref={containerRef} className="relative col-span-2">
      <input
        value={value}
        onChange={(e) => {
          onUpdate(index, { name: e.target.value });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Name"
        autoComplete="off"
        className={`${inputCls} w-full`}
      />
      {open && matches.length > 0 && (
        <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl bg-white py-1 shadow-float ring-1 ring-slate-100">
          {matches.map((m) => (
            <button
              key={m.name}
              type="button"
              onClick={() => {
                onUpdate(index, {
                  name: m.name,
                  dosage: m.dosage,
                  frequency: m.frequency,
                  duration: m.duration,
                });
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50"
            >
              <span className="truncate font-medium text-slate-700">{m.name}</span>
              <span className="shrink-0 text-xs text-slate-400">{m.dosage}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
