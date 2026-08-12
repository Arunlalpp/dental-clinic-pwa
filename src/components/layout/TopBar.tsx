import Image from "next/image";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";

export function TopBar({ subtitle }: { subtitle?: string }) {
  return (
    <header
      className="sticky top-0 z-30 border-b border-slate-100 bg-canvas/85 backdrop-blur-lg"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent shadow-card">
            <Image src="/icons/tooth-mark-white.png" alt="" width={18} height={18} />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">Carewell Dental</p>
            <p className="text-xs leading-tight text-slate-400">
              {subtitle ?? "Reception"}
            </p>
          </div>
        </div>
        <form action={signOutAction}>
          <button
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-500 shadow-card ring-1 ring-slate-100 transition active:scale-90"
            aria-label="Sign out"
          >
            <LogOut size={17} />
          </button>
        </form>
      </div>
    </header>
  );
}
