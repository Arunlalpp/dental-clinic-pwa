"use client";

import { motion } from "framer-motion";
import { CheckCircle2, History, ChevronRight } from "lucide-react";
import { Avatar, Button } from "@/components/ui";
import { formatINR } from "@/lib/utils";
import type { PatientPreview } from "@/lib/types";

export function PatientPreviewCard({
  patient,
  onBook,
  onHistory,
}: {
  patient: PatientPreview;
  onBook?: () => void;
  onHistory?: () => void;
}) {
  const stats: { label: string; value: string; danger?: boolean; wide?: boolean }[] = [
    { label: "Last visit", value: patient.last_visit ?? "—" },
    { label: "Last treatment", value: patient.last_treatment ?? "—", wide: true },
    { label: "Total visits", value: String(patient.total_visits) },
    {
      label: "Outstanding",
      value: patient.outstanding > 0 ? formatINR(patient.outstanding) : "Clear",
      danger: patient.outstanding > 0,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-100"
    >
      <div className="flex items-center gap-3 border-b border-slate-100 p-5">
        <Avatar name={patient.full_name} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-brand-600" />
            <span className="text-xs font-medium text-brand-600">Patient found</span>
          </div>
          <p className="mt-0.5 truncate text-lg font-semibold leading-tight">
            {patient.full_name}
          </p>
          <p className="truncate text-sm text-slate-500">
            {patient.phone}
            {patient.patient_number ? ` · ${patient.patient_number}` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-slate-100">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className={`bg-white p-4 ${s.wide ? "col-span-2" : ""}`}
          >
            <p className="text-xs text-slate-400">{s.label}</p>
            <p
              className={`mt-1 text-base font-semibold ${
                s.danger ? "text-rose-600" : "text-slate-900"
              }`}
            >
              {s.value}
            </p>
          </motion.div>
        ))}
      </div>

      {(onBook || onHistory) && (
        <div className="flex gap-3 p-4">
          {onHistory && (
            <Button variant="secondary" className="flex-1" onClick={onHistory}>
              <History size={17} /> History
            </Button>
          )}
          {onBook && (
            <Button className="flex-1" onClick={onBook}>
              Book appointment <ChevronRight size={17} />
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
