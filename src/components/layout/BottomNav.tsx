"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Users, Calendar, BarChart3, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/new-booking", label: "Book", icon: Plus, primary: true },
  { href: "/appointments", label: "Schedule", icon: Calendar },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/85 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {items.map((it) => {
          const active = pathname.startsWith(it.href);
          const Icon = it.icon;
          if (it.primary) {
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-label={it.label}
                className="relative -mt-5 flex flex-col items-center justify-center"
              >
                <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-accent text-white shadow-float transition active:scale-90">
                  <Icon size={24} strokeWidth={2.4} />
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={it.href}
              href={it.href}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
            >
              {active && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-600"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <Icon
                size={22}
                className={cn(active ? "text-brand-600" : "text-slate-400")}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  active ? "text-brand-700" : "text-slate-400",
                )}
              >
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
