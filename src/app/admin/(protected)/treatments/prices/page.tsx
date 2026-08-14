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
      <header>
        <h1 className="text-lg font-semibold tracking-tight md:text-2xl">Treatment prices</h1>
        <p className="mt-1 text-sm text-slate-500 md:text-base">
          Set a default fee per treatment. Tap a row to override it for a specific dentist.
        </p>
      </header>
      <div className="md:max-w-4xl">
        <TreatmentPricesEditor prices={prices} dentists={dentists} />
      </div>
    </div>
  );
}
