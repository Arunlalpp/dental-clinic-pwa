"use client";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { normalizePhone } from "@/lib/utils";
import * as patientService from "@/services/patientService.client";
import type { PatientPreview } from "@/lib/types";

type State = "idle" | "searching" | "found" | "empty" | "error";

/** Debounced phone lookup for the booking hot path. */
export function usePatientSearch(phone: string) {
  const debounced = useDebounce(phone, 350);
  const normalized = normalizePhone(debounced);
  const enabled = normalized.length >= 4;

  const { data, isFetching, isError } = useQuery({
    queryKey: ["patient-by-phone", normalized],
    queryFn: () => patientService.findByExactPhone(debounced),
    enabled,
    placeholderData: (prev) => prev,
  });

  const match: PatientPreview | null = enabled ? data ?? null : null;
  const state: State = !enabled
    ? "idle"
    : isError
      ? "error"
      : isFetching
        ? "searching"
        : match
          ? "found"
          : "empty";

  return { state, match };
}
