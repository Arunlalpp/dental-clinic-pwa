import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";
import { Avatar, Card, Button } from "@/components/ui";
import { NotificationToggle } from "@/components/settings/NotificationToggle";
import { Shield, LogOut, Building2, IndianRupee, ChevronRight, Pill } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "owner" || profile?.role === "admin";

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>

      <Card className="flex items-center gap-4 p-5">
        <Avatar name={profile?.name ?? "User"} size={52} />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{profile?.name}</p>
          <p className="truncate text-sm text-slate-500">{profile?.email}</p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium capitalize text-brand-700">
            <Shield size={11} /> {profile?.role}
          </span>
        </div>
      </Card>

      <Card className="divide-y divide-slate-100">
        <Row icon={<Building2 size={18} className="text-brand-600" />} label="Clinic profile" hint="Carewell Dental" />
        <NotificationToggle />
        <Row icon={<Shield size={18} className="text-brand-600" />} label="Roles & access" hint={profile?.role ?? ""} />
      </Card>

      <Card>
        <Link href="/settings/medicines" className="flex items-center gap-3 p-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50">
            <Pill size={18} className="text-brand-600" />
          </span>
          <span className="flex-1 text-sm font-medium text-slate-700">
            Medicine reference
          </span>
          <ChevronRight size={16} className="text-slate-300" />
        </Link>
      </Card>

      {isAdmin && (
        <Card>
          <Link
            href="/settings/treatment-prices"
            className="flex items-center gap-3 p-4"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50">
              <IndianRupee size={18} className="text-brand-600" />
            </span>
            <span className="flex-1 text-sm font-medium text-slate-700">
              Treatment prices
            </span>
            <ChevronRight size={16} className="text-slate-300" />
          </Link>
        </Card>
      )}

      <form action={signOutAction}>
        <Button variant="secondary" size="lg" className="w-full text-rose-600">
          <LogOut size={18} /> Sign out
        </Button>
      </form>

      <p className="text-center text-xs text-slate-400">CAREWELL The Dental Experts · v0.1.0</p>
    </div>
  );
}

function Row({ icon, label, hint }: { icon: React.ReactNode; label: string; hint: string }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50">{icon}</span>
      <span className="flex-1 text-sm font-medium text-slate-700">{label}</span>
      <span className="text-xs capitalize text-slate-400">{hint}</span>
    </div>
  );
}
