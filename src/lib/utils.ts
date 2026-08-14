import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AppointmentStatus, AppointmentType, TreatmentPrice } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CLINIC_TIMEZONE = "Asia/Kolkata";

/**
 * YYYY-MM-DD for a date in the clinic's local timezone. Server code runs on
 * Vercel in UTC, so plain `toISOString().slice(0,10)` rolls over to the
 * next/previous calendar day for up to 5.5 hours a day relative to IST —
 * this is what every server-side "today" computation should use instead.
 */
export function dateKey(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: CLINIC_TIMEZONE });
}

/** "Wednesday, August 13" in the clinic's local timezone. */
export function formatDateIST(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** Current hour (0-23) in the clinic's local timezone, e.g. for greeting text. */
export function hourIST(date: Date = new Date()): number {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: CLINIC_TIMEZONE,
      hour: "numeric",
      hour12: false,
    }).format(date),
  );
  return hour % 24;
}

/** Minutes since midnight in the clinic's local timezone — for comparing
 * "now" against a stored "HH:mm" appointment start_time. */
export function minutesSinceMidnightIST(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/** "14:30" | "14:30:00" -> 870 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Digits-only normalization — mirrors the DB `normalize_phone` trigger. */
export function normalizePhone(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

export function formatINR(n: number | null | undefined): string {
  return "₹" + Number(n ?? 0).toLocaleString("en-IN");
}

/** ISO timestamp -> "9:32 AM" in the clinic's local timezone. */
export function formatTimeIST(iso: string | null | undefined): string {
  if (!iso) return "--";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/** Minutes -> "08h 24m" (or "24m" under an hour). */
export function formatDuration(totalMinutes: number | null | undefined): string {
  if (!totalMinutes || totalMinutes <= 0) return "0m";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return h > 0 ? `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

/**
 * Shifts a YYYY-MM-DD date by `days` (may be negative) while staying on the
 * clinic's local calendar — anchoring at noon IST keeps this correct
 * regardless of the server process's own timezone, with no DST to worry
 * about since IST has none.
 */
export function addDaysToDateKey(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00+05:30`);
  d.setUTCDate(d.getUTCDate() + days);
  return dateKey(d);
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function to12h(time: string): string {
  // "14:30:00" | "14:30" -> "2:30 PM"
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${mStr ?? "00"} ${suffix}`;
}

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  consultation: "Consultation",
  dental_cleaning: "Dental Cleaning",
  root_canal: "Root Canal",
  tooth_extraction: "Tooth Extraction",
  dental_filling: "Dental Filling",
  braces_consultation: "Braces Consultation",
  implant_consultation: "Implant Consultation",
  follow_up: "Follow-up",
  emergency: "Emergency",
};

export const APPOINTMENT_TYPES = Object.keys(
  APPOINTMENT_TYPE_LABELS,
) as AppointmentType[];

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  in_treatment: "In Treatment",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

/** Dentist override, if set, else the treatment type's default fee, else 0. */
export function getFee(
  prices: TreatmentPrice[],
  treatmentType: AppointmentType,
  dentistId: string | null,
): number {
  const price = prices.find((p) => p.treatment_type === treatmentType);
  if (!price) return 0;
  if (dentistId && price.dentist_fees[dentistId] != null) {
    return price.dentist_fees[dentistId];
  }
  return price.default_fee;
}

/** Tailwind classes per status badge. */
export const STATUS_STYLES: Record<AppointmentStatus, string> = {
  scheduled: "bg-slate-100 text-slate-600",
  confirmed: "bg-brand-50 text-brand-700",
  checked_in: "bg-cyan-50 text-cyan-700",
  in_treatment: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-600",
  no_show: "bg-slate-100 text-slate-400",
};
