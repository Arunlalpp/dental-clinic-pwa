"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, ChevronRight } from "lucide-react";
import { Avatar, Card, EmptyState, Skeleton } from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";
import * as patientService from "@/services/patientService.client";
import { formatINR } from "@/lib/utils";
import type { PatientPreview } from "@/lib/types";

export function PatientSearchList({ initial }: { initial: PatientPreview[] }) {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);
  const trimmed = debounced.trim();

  const { data, isFetching } = useQuery({
    queryKey: ["patient-search", trimmed],
    queryFn: () => patientService.searchPatients(trimmed),
    enabled: trimmed.length > 0,
    placeholderData: (prev) => prev,
  });

  const results = trimmed ? (data ?? []) : initial;
  const loading = trimmed.length > 0 && isFetching;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search by phone, name, ID or email.
        </p>
      </header>

      <div className="flex h-12 items-center gap-3 rounded-2xl bg-white px-4 shadow-card ring-1 ring-slate-100 focus-within:ring-2 focus-within:ring-brand-500">
        <Search size={18} className="text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search patients…"
          inputMode="search"
          className="w-full bg-transparent text-base outline-none placeholder:text-slate-300"
          style={{ fontSize: 16 }}
        />
      </div>

      {loading && results.length === 0 ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="No patients found"
          description="Try a different number or name, or add them from a new booking."
        />
      ) : (
        <div className="space-y-2.5">
          {results.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link href={`/patients/${p.id}`}>
                <Card className="flex items-center gap-3 p-3 transition active:scale-[0.99]">
                  <Avatar name={p.full_name} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {p.full_name}
                    </p>
                    <p className="truncate text-xs text-slate-500">{p.phone}</p>
                  </div>
                  <div className="text-right">
                    {p.outstanding > 0 ? (
                      <p className="text-xs font-semibold text-rose-600">
                        {formatINR(p.outstanding)}
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-400">
                      {p.last_visit ?? "New"}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300" />
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
