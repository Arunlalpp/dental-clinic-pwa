import * as medicineService from "@/services/medicineService";
import { MedicinesManager } from "@/components/settings/MedicinesManager";

export const dynamic = "force-dynamic";

export default async function AdminMedicinesPage() {
  const medicines = await medicineService.listMedicines();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-lg font-semibold tracking-tight md:text-2xl">Medicines</h1>
        <p className="mt-1 text-sm text-slate-500 md:text-base">
          Manage the clinic&apos;s medicine catalog — also powers the autocomplete when writing a
          prescription.
        </p>
      </header>
      <MedicinesManager initial={medicines} />
    </div>
  );
}
