"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, AlertTriangle, Check, ChevronDown, IndianRupee,
  PenTool, RotateCcw, Scissors, Smile, Sparkles, Stethoscope, Syringe,
} from "lucide-react";
import { Card } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { setDefaultFeeAction, setDentistFeeAction } from "@/app/actions/treatmentPrices";
import { APPOINTMENT_TYPE_LABELS, APPOINTMENT_TYPES, formatINR } from "@/lib/utils";
import type { AppointmentType, TreatmentPrice } from "@/lib/types";

interface DentistOption {
  id: string;
  name: string;
}

const TYPE_ICON: Record<AppointmentType, React.ElementType> = {
  consultation: Stethoscope,
  dental_cleaning: Sparkles,
  root_canal: Activity,
  tooth_extraction: Scissors,
  dental_filling: PenTool,
  braces_consultation: Smile,
  implant_consultation: Syringe,
  follow_up: RotateCcw,
  emergency: AlertTriangle,
};

const TYPE_TONE: Record<AppointmentType, string> = {
  consultation: "bg-brand-50 text-brand-600",
  dental_cleaning: "bg-cyan-50 text-cyan-600",
  root_canal: "bg-amber-50 text-amber-600",
  tooth_extraction: "bg-rose-50 text-rose-600",
  dental_filling: "bg-indigo-50 text-indigo-600",
  braces_consultation: "bg-emerald-50 text-emerald-600",
  implant_consultation: "bg-violet-50 text-violet-600",
  follow_up: "bg-slate-100 text-slate-500",
  emergency: "bg-orange-50 text-orange-600",
};

export function TreatmentPricesEditor({
  prices,
  dentists,
}: {
  prices: TreatmentPrice[];
  dentists: DentistOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [expanded, setExpanded] = useState<AppointmentType | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const priceMap = new Map(prices.map((p) => [p.treatment_type, p]));

  const stats = useMemo(() => {
    const fees = APPOINTMENT_TYPES.map((t) => priceMap.get(t)?.default_fee ?? 0);
    const nonZero = fees.filter((f) => f > 0);
    const avg = nonZero.length
      ? Math.round(nonZero.reduce((a, b) => a + b, 0) / nonZero.length)
      : 0;
    const overrideCount = prices.reduce(
      (acc, p) => acc + Object.keys(p.dentist_fees ?? {}).length,
      0,
    );
    return {
      count: APPOINTMENT_TYPES.length,
      avg,
      min: nonZero.length ? Math.min(...nonZero) : 0,
      max: nonZero.length ? Math.max(...nonZero) : 0,
      overrideCount,
    };
  }, [prices]);

  function flash(type: AppointmentType) {
    setSavedFlash(type);
    setTimeout(() => setSavedFlash((cur) => (cur === type ? null : cur)), 1200);
  }

  async function saveDefault(type: AppointmentType, value: string) {
    const fee = Number(value) || 0;
    const res = await setDefaultFeeAction(type, fee);
    if (res.ok) {
      flash(type);
      router.refresh();
    } else {
      toast.push(res.error ?? "Couldn’t save", "error");
    }
  }

  async function saveDentistFee(type: AppointmentType, dentistId: string, value: string) {
    const fee = value.trim() === "" ? null : Number(value) || 0;
    const res = await setDentistFeeAction(type, dentistId, fee);
    if (res.ok) {
      flash(type);
      router.refresh();
    } else {
      toast.push(res.error ?? "Couldn’t save", "error");
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Treatments" value={String(stats.count)} tone="text-slate-900" />
        <StatCard label="Average fee" value={formatINR(stats.avg)} tone="text-brand-700" />
        <StatCard
          label="Fee range"
          value={`${formatINR(stats.min)} – ${formatINR(stats.max)}`}
          tone="text-slate-900"
        />
        <StatCard label="Dentist overrides" value={String(stats.overrideCount)} tone="text-emerald-600" />
      </div>

      {/* Treatment grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {APPOINTMENT_TYPES.map((type) => {
          const price = priceMap.get(type);
          const isOpen = expanded === type;
          const Icon = TYPE_ICON[type];
          const overrideCount = Object.keys(price?.dentist_fees ?? {}).length;
          const justSaved = savedFlash === type;

          return (
            <Card
              key={type}
              className={`overflow-hidden transition ${isOpen ? "ring-2 ring-brand-200" : ""}`}
            >
              <div className="flex items-center gap-3 p-4">
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${TYPE_TONE[type]}`}>
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {APPOINTMENT_TYPE_LABELS[type]}
                  </p>
                  <button
                    onClick={() => setExpanded(isOpen ? null : type)}
                    className="mt-0.5 flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-brand-600"
                  >
                    {dentists.length === 0
                      ? "No dentists yet"
                      : overrideCount > 0
                        ? `${overrideCount} dentist override${overrideCount > 1 ? "s" : ""}`
                        : "Same for all dentists"}
                    <ChevronDown
                      size={12}
                      className={`transition ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
                <div className="relative flex h-10 w-28 shrink-0 items-center gap-1 rounded-xl bg-slate-50 px-3 ring-1 ring-slate-200 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500">
                  <IndianRupee size={13} className="shrink-0 text-slate-400" />
                  <input
                    key={price?.default_fee ?? 0}
                    defaultValue={price?.default_fee ?? 0}
                    onBlur={(e) => saveDefault(type, e.target.value)}
                    inputMode="decimal"
                    aria-label={`Default fee for ${APPOINTMENT_TYPE_LABELS[type]}`}
                    className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
                  />
                  {justSaved && (
                    <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white shadow-card animate-fadeIn">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="space-y-1.5 border-t border-slate-100 bg-slate-50/60 p-4">
                  {dentists.length === 0 ? (
                    <p className="py-1 text-xs text-slate-400">No dentists yet.</p>
                  ) : (
                    dentists.map((d) => (
                      <div key={d.id} className="flex items-center gap-3 py-1">
                        <span className="flex-1 truncate text-xs font-medium text-slate-500">
                          {d.name}
                        </span>
                        <div className="flex h-9 w-28 items-center gap-1 rounded-xl bg-white px-3 ring-1 ring-slate-200 transition focus-within:ring-2 focus-within:ring-brand-500">
                          <IndianRupee size={12} className="shrink-0 text-slate-300" />
                          <input
                            key={price?.dentist_fees[d.id] ?? "default"}
                            defaultValue={price?.dentist_fees[d.id] ?? ""}
                            placeholder="default"
                            onBlur={(e) => saveDentistFee(type, d.id, e.target.value)}
                            inputMode="decimal"
                            aria-label={`${d.name} fee for ${APPOINTMENT_TYPE_LABELS[type]}`}
                            className="w-full bg-transparent text-xs font-medium text-slate-700 outline-none placeholder:text-slate-300"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card className="p-3.5">
      <p className={`text-base font-semibold ${tone}`}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{label}</p>
    </Card>
  );
}
