import Link from "next/link";
import { format } from "date-fns";
import * as paymentService from "@/services/paymentService";
import { Card, EmptyState } from "@/components/ui";
import { formatINR } from "@/lib/utils";
import { Wallet, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const payments = await paymentService.listRecent(30);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-slate-500">
          Recent payments across the clinic.
        </p>
      </header>

      <Link
        href="/patients"
        className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-100 transition active:scale-[0.99]"
      >
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <Search size={19} />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-700">Record a payment</p>
          <p className="text-xs text-slate-400">
            Open a patient to record against their account
          </p>
        </div>
      </Link>

      {payments.length === 0 ? (
        <EmptyState
          icon={<Wallet size={22} />}
          title="No payments yet"
          description="Payments recorded from patient profiles will appear here."
        />
      ) : (
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
      )}
    </div>
  );
}
