"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { requestPushPermission, disablePush } from "@/lib/firebase/messaging";
import { registerFcmTokenAction, unregisterFcmTokenAction } from "@/app/actions/notifications";

const TOKEN_STORAGE_KEY = "carewell-fcm-token";

type Status = "loading" | "unsupported" | "denied" | "off" | "on" | "busy";

export function NotificationToggle() {
  const toast = useToast();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    setStatus(localStorage.getItem(TOKEN_STORAGE_KEY) ? "on" : "off");
  }, []);

  async function enable() {
    setStatus("busy");
    const result = await requestPushPermission();
    if (!result.ok) {
      setStatus(result.reason === "denied" ? "denied" : "off");
      const message =
        result.reason === "denied"
          ? "Notifications blocked — enable them in your browser settings."
          : "Couldn’t enable notifications on this device.";
      toast.push(message, "error");
      return;
    }
    await registerFcmTokenAction(result.token);
    localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
    setStatus("on");
    toast.push("Notifications enabled");
  }

  async function disable() {
    setStatus("busy");
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    await disablePush();
    if (token) await unregisterFcmTokenAction(token);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setStatus("off");
    toast.push("Notifications turned off");
  }

  const hint =
    status === "loading"
      ? ""
      : status === "unsupported"
        ? "Not supported on this device"
        : status === "denied"
          ? "Blocked in browser settings"
          : status === "on"
            ? "On"
            : "Off";

  return (
    <div className="flex items-center gap-3 p-4">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50">
        <Bell size={18} className="text-brand-600" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-700">Push notifications</p>
        <p className="text-xs text-slate-400">New bookings, check-ins, reminders</p>
      </div>
      {status === "unsupported" || status === "denied" ? (
        <span className="text-xs capitalize text-slate-400">{hint}</span>
      ) : (
        <button
          type="button"
          disabled={status === "loading" || status === "busy"}
          onClick={() => (status === "on" ? disable() : enable())}
          aria-pressed={status === "on"}
          className={`h-7 w-12 shrink-0 rounded-full transition disabled:opacity-40 ${
            status === "on" ? "bg-gradient-to-br from-brand-600 to-accent" : "bg-slate-200"
          }`}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-white shadow transition ${
              status === "on" ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      )}
    </div>
  );
}
