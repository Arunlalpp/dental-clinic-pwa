import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AppointmentStatus, AppointmentType, TreatmentPrice } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Digits-only normalization — mirrors the DB `normalize_phone` trigger. */
export function normalizePhone(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

export function formatINR(n: number | null | undefined): string {
  return "₹" + Number(n ?? 0).toLocaleString("en-IN");
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
