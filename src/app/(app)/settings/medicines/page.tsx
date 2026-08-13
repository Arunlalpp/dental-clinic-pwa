import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { MEDICINE_REFERENCE } from "@/lib/medicineReference";

export const dynamic = "force-static";

export default function MedicinesReferencePage() {
  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-600 shadow-card ring-1 ring-slate-100 transition active:scale-90"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">Medicine reference</h1>
      </div>
      <p className="-mt-3 text-sm text-slate-500">
        A quick lookup for common dental prescriptions — not linked to inventory. Also powers the
        autocomplete when writing a prescription. Always confirm dosage against the patient&apos;s
        history before prescribing.
      </p>

      {MEDICINE_REFERENCE.map((group) => (
        <section key={group.title}>
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-slate-400">{group.title}</h2>
            {group.note && <span className="text-xs text-slate-300">{group.note}</span>}
          </div>
          <Card className="divide-y divide-slate-100">
            {group.items.map((item) => (
              <div key={item.name} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700">{item.name}</p>
                  <p className="truncate text-xs text-slate-400">
                    {item.frequency} · {item.duration}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                  {item.dosage}
                </span>
              </div>
            ))}
          </Card>
        </section>
      ))}
    </div>
  );
}
