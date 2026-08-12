import {
  collection,
  query,
  where,
  orderBy,
  limit as fsLimit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { patientFromDoc } from "@/lib/firebase/converters";
import { normalizePhone } from "@/lib/utils";
import type { PatientPreview } from "@/lib/types";

function toPreview(id: string, data: Record<string, unknown>): PatientPreview {
  const p = patientFromDoc(id, data);
  return {
    ...p,
    last_visit: p.stats.last_visit,
    last_treatment: p.stats.last_treatment,
    total_visits: p.stats.total_visits,
    outstanding: p.stats.outstanding,
  };
}

// Firestore has no substring/trigram search — prefix-range is the accepted
// replacement (see migration plan). Matches from the start of the field only.
function prefixQuery(field: string, term: string, take: number) {
  return query(
    collection(db, "patients"),
    where(field, ">=", term),
    where(field, "<=", term + ""),
    fsLimit(take),
  );
}

/** Partial phone match — powers the debounced lookup and global search. */
export async function searchByPhone(
  raw: string,
  limitCount = 8,
): Promise<PatientPreview[]> {
  const n = normalizePhone(raw);
  if (n.length < 3) return [];
  const snap = await getDocs(prefixQuery("normalizedPhone", n, limitCount));
  return snap.docs.map((d) => toPreview(d.id, d.data()));
}

/** Exact phone match — used for instant recognition + duplicate protection. */
export async function findByExactPhone(raw: string): Promise<PatientPreview | null> {
  const n = normalizePhone(raw);
  if (n.length < 6) return null;
  const snap = await getDocs(
    query(collection(db, "patients"), where("normalizedPhone", "==", n), fsLimit(1)),
  );
  const first = snap.docs[0];
  return first ? toPreview(first.id, first.data()) : null;
}

/** Free-text search across name, phone, patient number and email. */
export async function searchPatients(
  queryText: string,
  limitCount = 20,
): Promise<PatientPreview[]> {
  const trimmed = queryText.trim();
  if (!trimmed) {
    const snap = await getDocs(
      query(collection(db, "patients"), orderBy("createdAt", "desc"), fsLimit(limitCount)),
    );
    return snap.docs.map((d) => toPreview(d.id, d.data()));
  }

  const lower = trimmed.toLowerCase();
  const digits = normalizePhone(trimmed);
  const queries = [
    getDocs(prefixQuery("fullNameLower", lower, limitCount)),
    getDocs(prefixQuery("patientNumber", trimmed, limitCount)),
    getDocs(prefixQuery("emailLower", lower, limitCount)),
    ...(digits ? [getDocs(prefixQuery("normalizedPhone", digits, limitCount))] : []),
  ];
  const snaps = await Promise.all(queries);
  const byId = new Map<string, PatientPreview>();
  for (const snap of snaps) {
    for (const d of snap.docs) {
      if (!byId.has(d.id)) byId.set(d.id, toPreview(d.id, d.data()));
    }
  }
  return Array.from(byId.values()).slice(0, limitCount);
}
