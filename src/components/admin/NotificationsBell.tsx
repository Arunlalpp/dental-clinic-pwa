"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import {
  listRecentNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/actions/notifications";
import type { AppNotification } from "@/lib/types";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function NotificationsBell({
  initial,
  currentUserId,
}: {
  initial: AppNotification[];
  currentUserId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: notifications = initial } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: listRecentNotificationsAction,
    initialData: initial,
    refetchInterval: 60_000,
  });

  const unread = notifications.filter((n) => !n.read_by.includes(currentUserId));

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function openNotification(n: AppNotification) {
    setOpen(false);
    if (!n.read_by.includes(currentUserId)) {
      queryClient.setQueryData<AppNotification[]>(["admin-notifications"], (prev) =>
        (prev ?? []).map((x) =>
          x.id === n.id ? { ...x, read_by: [...x.read_by, currentUserId] } : x,
        ),
      );
      await markNotificationReadAction(n.id);
    }
    if (n.url) router.push(n.url);
  }

  async function markAllRead() {
    const ids = unread.map((n) => n.id);
    if (ids.length === 0) return;
    queryClient.setQueryData<AppNotification[]>(["admin-notifications"], (prev) =>
      (prev ?? []).map((x) => ({ ...x, read_by: [...new Set([...x.read_by, currentUserId])] })),
    );
    await markAllNotificationsReadAction(ids);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-50"
      >
        <Bell size={18} />
        {unread.length > 0 && (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-11 z-30 w-80 overflow-hidden rounded-2xl bg-white shadow-float ring-1 ring-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-700">Notifications</p>
              {unread.length > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs font-medium text-brand-600"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">
                  No notifications yet.
                </p>
              ) : (
                notifications.map((n) => {
                  const isUnread = !n.read_by.includes(currentUserId);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => openNotification(n)}
                      className={`flex w-full items-start gap-2.5 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${
                        isUnread ? "bg-brand-50/40" : ""
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          isUnread ? "bg-brand-500" : "bg-transparent"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-700">{n.title}</p>
                        {n.body && (
                          <p className="truncate text-xs text-slate-400">{n.body}</p>
                        )}
                        <p className="mt-0.5 text-[11px] text-slate-300">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
