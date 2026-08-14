"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutGrid, IndianRupee, Pill, ArrowLeft, LogOut, Menu, X, Shield,
  ChevronsLeft, ChevronsRight, Search, ChevronRight, Clock,
} from "lucide-react";
import { Avatar } from "@/components/ui";
import { signOutAction } from "@/app/actions/auth";
import { NotificationsBell } from "@/components/admin/NotificationsBell";
import type { AppNotification, Profile } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutGrid, exact: true },
  { href: "/admin/treatments/prices", label: "Treatment prices", icon: IndianRupee },
  { href: "/admin/medicines", label: "Medicines", icon: Pill },
  { href: "/admin/attendance", label: "Attendance", icon: Clock },
];

export function AdminShell({
  profile,
  initialNotifications,
  children,
}: {
  profile: Profile;
  initialNotifications: AppNotification[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const activeItem = useMemo(
    () =>
      NAV_ITEMS.find((item) =>
        item.exact ? pathname === item.href : pathname.startsWith(item.href),
      ),
    [pathname],
  );

  return (
    <div className="min-h-screen bg-canvas md:flex">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden shrink-0 flex-col border-r border-slate-100 bg-white transition-all md:flex ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
      >
        <SidebarContent
          profile={profile}
          pathname={pathname}
          collapsed={collapsed}
        />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col bg-white shadow-float md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
            >
              <div className="flex justify-end p-3">
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="grid h-9 w-9 place-items-center rounded-full bg-slate-50 text-slate-500"
                >
                  <X size={17} />
                </button>
              </div>
              <SidebarContent
                profile={profile}
                pathname={pathname}
                collapsed={false}
                onNavigate={() => setDrawerOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className={`min-w-0 flex-1 transition-all ${collapsed ? "md:ml-[76px]" : "md:ml-64"}`}>
        <AdminHeader
          title={activeItem?.label ?? "Admin dashboard"}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          onOpenDrawer={() => setDrawerOpen(true)}
          initialNotifications={initialNotifications}
          currentUserId={profile.id}
          profileName={profile.name}
          profileRole={profile.role}
        />
        <main className="mx-auto max-w-6xl px-5 py-6 md:px-10 md:py-8">{children}</main>
      </div>
    </div>
  );
}

function AdminHeader({
  title,
  collapsed,
  onToggleCollapse,
  onOpenDrawer,
  initialNotifications,
  currentUserId,
  profileName,
  profileRole,
}: {
  title: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenDrawer: () => void;
  initialNotifications: AppNotification[];
  currentUserId: string;
  profileName: string;
  profileRole: string;
}) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  useOutsideClick(profileRef, () => setProfileOpen(false));

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const matches = query.trim()
    ? NAV_ITEMS.filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  function goTo(href: string) {
    setQuery("");
    setSearchOpen(false);
    router.push(href);
  }

  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-100 bg-white/85 px-4 py-3 backdrop-blur-lg md:px-8"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <button
        onClick={onOpenDrawer}
        aria-label="Open menu"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-600 transition active:scale-90 md:hidden"
      >
        <Menu size={20} />
      </button>
      <button
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-50 md:grid"
      >
        {collapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        <span className="hidden text-slate-400 sm:inline">Admin</span>
        <ChevronRight size={14} className="hidden shrink-0 text-slate-300 sm:inline" />
        <span className="truncate font-semibold text-slate-800">{title}</span>
      </div>

      <div className="relative hidden md:block">
        <div className="flex h-9 w-56 items-center gap-2 rounded-full bg-slate-50 px-3 ring-1 ring-transparent focus-within:ring-brand-500">
          <Search size={15} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            placeholder="Jump to…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-300"
          />
        </div>
        <AnimatePresence>
          {searchOpen && matches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-2xl bg-white py-1 shadow-float ring-1 ring-slate-100"
              onMouseDown={(e) => e.preventDefault()}
            >
              {matches.map((m) => (
                <button
                  key={m.href}
                  type="button"
                  onClick={() => goTo(m.href)}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <m.icon size={15} className="text-slate-400" /> {m.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <NotificationsBell initial={initialNotifications} currentUserId={currentUserId} />

      <div ref={profileRef} className="relative">
        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          aria-label="Account menu"
          className="grid h-9 w-9 place-items-center rounded-full transition active:scale-95"
        >
          <Avatar name={profileName} size={32} />
        </button>
        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-2xl bg-white py-1 shadow-float ring-1 ring-slate-100"
            >
              <div className="border-b border-slate-100 px-3.5 py-2.5">
                <p className="truncate text-sm font-semibold text-slate-700">{profileName}</p>
                <p className="text-xs capitalize text-slate-400">{profileRole}</p>
              </div>
              <Link
                href="/settings"
                className="block px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Settings
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft size={14} /> Back to app
              </Link>
              <form action={signOutAction}>
                <button className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-slate-50">
                  <LogOut size={14} /> Sign out
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

function SidebarContent({
  profile,
  pathname,
  collapsed,
  onNavigate,
}: {
  profile: Profile;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-2.5 p-5 ${collapsed ? "justify-center px-3" : ""}`}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent shadow-card">
          <Image src="/icons/tooth-mark-white.png" alt="" width={18} height={18} />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">Carewell Dental</p>
            <p className="text-xs leading-tight text-slate-400">Admin panel</p>
          </div>
        )}
      </div>

      <nav className={`flex-1 space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                collapsed ? "justify-center" : ""
              } ${active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <Icon size={18} className={active ? "text-brand-600" : "text-slate-400"} />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className={`space-y-3 border-t border-slate-100 p-4 ${collapsed ? "px-2" : ""}`}>
        {!collapsed && (
          <Link
            href="/settings"
            className="flex items-center gap-2 text-xs font-medium text-slate-400 transition hover:text-slate-600"
          >
            <ArrowLeft size={14} /> Back to app
          </Link>
        )}
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <Avatar name={profile.name} size={36} />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-700">{profile.name}</p>
              <span className="inline-flex items-center gap-1 text-xs capitalize text-slate-400">
                <Shield size={11} /> {profile.role}
              </span>
            </div>
          )}
          {!collapsed && (
            <form action={signOutAction}>
              <button
                aria-label="Sign out"
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-rose-600"
              >
                <LogOut size={15} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
