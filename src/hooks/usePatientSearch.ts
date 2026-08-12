"use client";
import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { normalizePhone } from "@/lib/utils";
import * as patientService from "@/services/patientService.client";
import type { PatientPreview } from "@/lib/types";

type State = "idle" | "searching" | "found" | "empty" | "error";

/** Debounced phone lookup for the booking hot path. */
export function usePatientSearch(phone: string) {
  const debounced = useDebounce(phone, 350);
  const [state, setState] = useState<State>("idle");
  const [match, setMatch] = useState<PatientPreview | null>(null);

  useEffect(() => {
    const n = normalizePhone(debounced);
    if (n.length < 4) {
      setState("idle");
      setMatch(null);
      return;
    }
    let cancelled = false;
    setState("searching");
    patientService
      .findByExactPhone(debounced)
      .then((res) => {
        if (cancelled) return;
        setMatch(res);
        setState(res ? "found" : "empty");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return { state, match };
}
