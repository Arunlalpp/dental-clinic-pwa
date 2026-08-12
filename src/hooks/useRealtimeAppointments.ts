"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

/**
 * Subscribe to appointment changes for a given date and refresh the route.
 * Powers live updates on the dashboard / dentist view.
 */
export function useRealtimeAppointments(date: string) {
  const router = useRouter();
  useEffect(() => {
    const q = query(collection(db, "appointments"), where("appointmentDate", "==", date));
    // onSnapshot fires immediately with the current state, then again on
    // every change; skip that first call so mounting doesn't force an
    // unnecessary refresh (the page already has fresh initial data).
    let first = true;
    const unsubscribe = onSnapshot(q, () => {
      if (first) {
        first = false;
        return;
      }
      router.refresh();
    });
    return () => unsubscribe();
  }, [date, router]);
}
