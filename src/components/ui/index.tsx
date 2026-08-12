"use client";

import * as React from "react";
import { cn, initials, STATUS_LABELS, STATUS_STYLES } from "@/lib/utils";
import type { AppointmentStatus } from "@/lib/types";

/* ---------------------------------------------------------------- Button */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
};
export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-95 disabled:opacity-40 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";
  const sizes = { md: "h-12 px-4 text-sm", lg: "h-14 px-5 text-base" };
  const variants = {
    primary:
      "bg-gradient-to-br from-brand-600 to-accent text-white shadow-card",
    secondary: "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
    ghost: "text-slate-600 hover:bg-slate-50",
  };
  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    />
  );
}

/* ---------------------------------------------------------------- Card */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl bg-white shadow-card ring-1 ring-slate-100",
        className,
      )}
      {...props}
    />
  );
}

/* ---------------------------------------------------------------- Chip */
export function Chip({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        "rounded-full px-4 py-2.5 text-sm font-medium ring-1 transition active:scale-95",
        active
          ? "bg-gradient-to-br from-brand-600 to-accent text-white ring-transparent shadow-card"
          : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300",
        className,
      )}
      {...props}
    />
  );
}

/* ---------------------------------------------------------------- Field */
type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};
export const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  function Field({ label, className, id, ...props }, ref) {
    const generatedId = React.useId();
    const fieldId = id ?? generatedId;
    return (
      <label htmlFor={fieldId} className="block">
        <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <input
          id={fieldId}
          ref={ref}
          className={cn(
            "h-12 w-full rounded-2xl bg-white px-4 text-base outline-none ring-1 ring-slate-200 transition placeholder:text-slate-300 focus:ring-2 focus:ring-brand-500",
            className,
          )}
          {...props}
        />
      </label>
    );
  },
);

/* ---------------------------------------------------------------- Badge */
export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/* ---------------------------------------------------------------- Avatar */
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-accent font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  );
}

/* ---------------------------------------------------------------- Skeleton */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-lg bg-slate-100",
        className,
      )}
      style={{
        backgroundImage:
          "linear-gradient(90deg,#eef2f5 25%,#f6f9fb 37%,#eef2f5 63%)",
        backgroundSize: "200% 100%",
      }}
    />
  );
}

/* ---------------------------------------------------------------- Empty */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
        {icon}
      </div>
      <p className="mt-3 text-base font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}
