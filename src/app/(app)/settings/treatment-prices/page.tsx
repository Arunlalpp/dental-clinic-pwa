import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import * as treatmentPriceService from "@/services/treatmentPriceService";
import * as dentistService from "@/services/dentistService";
import { TreatmentPricesEditor } from "@/components/settings/TreatmentPricesEditor";

export const dynamic = "force-dynamic";

export default async function TreatmentPricesPage() {
  const [prices, dentists] = await Promise.all([
    treatmentPriceService.listPrices(),
    dentistService.listActiveDentists(),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-600 shadow-card ring-1 ring-slate-100 transition active:scale-90"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">Treatment prices</h1>
      </div>
      <p className="-mt-3 text-sm text-slate-500">
        Set a default fee per treatment. Tap a row to override it for a specific dentist.
      </p>
      <TreatmentPricesEditor prices={prices} dentists={dentists} />
    </div>
  );
}
