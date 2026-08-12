"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, AlertCircle } from "lucide-react";

type Toast = { id: string; text: string; kind: "ok" | "error" };
type ToastContext = { push: (text: string, kind?: "ok" | "error") => void };

const Ctx = React.createContext<ToastContext | null>(null);

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const push = React.useCallback(
    (text: string, kind: "ok" | "error" = "ok") => {
      const id = Math.random().toString(36).slice(2);
      setToasts((s) => [...s, { id, text, kind }]);
      setTimeout(
        () => setToasts((s) => s.filter((t) => t.id !== id)),
        3200,
      );
    },
    [],
  );

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-5"
        style={{ bottom: "max(5.5rem, calc(env(safe-area-inset-bottom) + 5rem))" }}
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-2.5 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-float"
            >
              <span
                className={
                  "grid h-5 w-5 place-items-center rounded-full " +
                  (t.kind === "ok" ? "bg-brand-500" : "bg-rose-500")
                }
              >
                {t.kind === "ok" ? <Check size={13} /> : <AlertCircle size={13} />}
              </span>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
