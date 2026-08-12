import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { appointmentFromDoc } from "@/lib/firebase/converters";
import type { Appointment, AppointmentStatus } from "@/lib/types";

// Clinic working hours -> 30-minute slot template.
const OPEN_HOUR = 9;
const CLOSE_HOUR = 18;

export function slotTemplate(): string[] {
  const out: string[] = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
}

export async function listByDate(date: string): Promise<Appointment[]> {
  const snap = await getDocs(
    query(
      collection(db, "appointments"),
      where("appointmentDate", "==", date),
      orderBy("startTime", "asc"),
    ),
  );
  return snap.docs.map((d) => appointmentFromDoc(d.id, d.data()));
}

export interface Slot {
  time: string; // "HH:mm"
  available: boolean;
}

// Mirrors appointmentService.ts's LOCKING_STATUSES — cancelled/no_show don't
// block a slot from showing as available again.
const NOT_TAKEN: AppointmentStatus[] = ["cancelled", "no_show"];

/** Available slots = template minus times already booked for that dentist/date. */
export async function availableSlots(date: string, dentistId: string): Promise<Slot[]> {
  const snap = await getDocs(
    query(
      collection(db, "appointments"),
      where("appointmentDate", "==", date),
      where("dentistId", "==", dentistId),
    ),
  );
  const taken = new Set(
    snap.docs
      .filter((d) => !NOT_TAKEN.includes(d.data().status as AppointmentStatus))
      .map((d) => (d.data().startTime as string).slice(0, 5)),
  );
  return slotTemplate().map((time) => ({ time, available: !taken.has(time) }));
}
