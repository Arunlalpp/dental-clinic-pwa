import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { medicineCatalogFromDoc } from "@/lib/firebase/converters";
import type { MedicineCatalogItem } from "@/lib/types";

/** Active-only catalog — powers the prescription form's autocomplete.
 * Sorted client-side rather than via orderBy() so this doesn't need a
 * composite index (active == true + order by name) — the catalog is small
 * enough that this is cheap either way. */
export async function listActiveMedicines(): Promise<MedicineCatalogItem[]> {
  const snap = await getDocs(query(collection(db, "medicines"), where("active", "==", true)));
  return snap.docs
    .map((d) => medicineCatalogFromDoc(d.id, d.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}
