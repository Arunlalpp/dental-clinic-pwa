import Link from "next/link";
import { Card } from "@/components/ui";
import { Search, UserPlus, Wallet, CalendarPlus } from "lucide-react";

export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "brand" | "amber" | "emerald";
}) {
  const tones = {
    default: "text-slate-900",
    brand: "text-brand-700",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
  };
  return (
    <Card className="p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight ${tones[tone]}`}>
        {value}
      </p>
    </Card>
  );
}

const actions = [
  { href: "/new-booking", label: "New booking", icon: CalendarPlus },
  { href: "/patients", label: "Find patient", icon: Search },
  { href: "/new-booking", label: "Add patient", icon: UserPlus },
  { href: "/payments", label: "Record payment", icon: Wallet },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.label}
            href={a.href}
            className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-100 transition active:scale-95"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Icon size={19} />
            </span>
            <span className="text-sm font-semibold text-slate-700">
              {a.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
