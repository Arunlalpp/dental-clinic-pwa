"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { setDefaultFeeAction, setDentistFeeAction } from "@/app/actions/treatmentPrices";
import { APPOINTMENT_TYPE_LABELS, APPOINTMENT_TYPES } from "@/lib/utils";
import type { AppointmentType, TreatmentPrice } from "@/lib/types";

interface DentistOption {
  id: string;
  name: string;
}

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
  const priceMap = new Map(prices.map((p) => [p.treatment_type, p]));

  async function saveDefault(type: AppointmentType, value: string) {
    const fee = Number(value) || 0;
    const res = await setDefaultFeeAction(type, fee);
    if (res.ok) router.refresh();
    else toast.push(res.error ?? "Couldn’t save", "error");
  }

  async function saveDentistFee(type: AppointmentType, dentistId: string, value: string) {
    const fee = value.trim() === "" ? null : Number(value) || 0;
    const res = await setDentistFeeAction(type, dentistId, fee);
    if (res.ok) router.refresh();
    else toast.push(res.error ?? "Couldn’t save", "error");
  }

  return (
    <Card className="divide-y divide-slate-100">
      {APPOINTMENT_TYPES.map((type) => {
        const price = priceMap.get(type);
        const isOpen = expanded === type;
        return (
          <div key={type}>
            <div className="flex items-center gap-3 p-4">
              <button
                onClick={() => setExpanded(isOpen ? null : type)}
                className="flex flex-1 items-center gap-2 text-left"
              >
                <ChevronDown
                  size={16}
                  className={`text-slate-300 transition ${isOpen ? "rotate-180" : ""}`}
                />
                <span className="text-sm font-medium text-slate-700">
                  {APPOINTMENT_TYPE_LABELS[type]}
                </span>
              </button>
              <div className="flex h-9 w-28 items-center gap-1 rounded-xl bg-slate-50 px-3 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-500">
                <span className="text-xs text-slate-400">₹</span>
                <input
                  key={price?.default_fee ?? 0}
                  defaultValue={price?.default_fee ?? 0}
                  onBlur={(e) => saveDefault(type, e.target.value)}
                  inputMode="decimal"
                  className="w-full bg-transparent text-sm font-semibold outline-none"
                />
              </div>
            </div>
            {isOpen && (
              <div className="space-y-2 bg-slate-50/60 p-4 pt-0">
                {dentists.length === 0 ? (
                  <p className="py-2 text-xs text-slate-400">No dentists yet.</p>
                ) : (
                  dentists.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 py-1.5">
                      <span className="flex-1 truncate text-xs text-slate-500">{d.name}</span>
                      <div className="flex h-8 w-28 items-center gap-1 rounded-xl bg-white px-3 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-500">
                        <span className="text-xs text-slate-400">₹</span>
                        <input
                          key={price?.dentist_fees[d.id] ?? "default"}
                          defaultValue={price?.dentist_fees[d.id] ?? ""}
                          placeholder="default"
                          onBlur={(e) => saveDentistFee(type, d.id, e.target.value)}
                          inputMode="decimal"
                          className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-slate-300"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}
