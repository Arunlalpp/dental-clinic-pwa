import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { medicineCatalogFromDoc } from "@/lib/firebase/converters";
import type { MedicineCatalogItem } from "@/lib/types";

export async function listMedicines(): Promise<MedicineCatalogItem[]> {
  const snap = await adminDb.collection("medicines").orderBy("name", "asc").get();
  return snap.docs.map((d) => medicineCatalogFromDoc(d.id, d.data()));
}

export interface NewMedicineInput {
  name: string;
  generic_name?: string | null;
  category: string;
  strength: string;
  form: string;
  manufacturer?: string | null;
  description?: string | null;
  usage_instructions?: string | null;
  notes?: string | null;
}

export async function createMedicine(input: NewMedicineInput): Promise<MedicineCatalogItem> {
  const now = FieldValue.serverTimestamp();
  const ref = adminDb.collection("medicines").doc();
  await ref.set({
    name: input.name,
    genericName: input.generic_name ?? null,
    category: input.category,
    strength: input.strength,
    form: input.form,
    manufacturer: input.manufacturer ?? null,
    description: input.description ?? null,
    usageInstructions: input.usage_instructions ?? null,
    notes: input.notes ?? null,
    active: true,
    createdAt: now,
    updatedAt: now,
  });
  const snap = await ref.get();
  return medicineCatalogFromDoc(snap.id, snap.data()!);
}

export type MedicineUpdateInput = Partial<NewMedicineInput>;

export async function updateMedicine(
  id: string,
  input: MedicineUpdateInput,
): Promise<MedicineCatalogItem> {
  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.generic_name !== undefined) patch.genericName = input.generic_name;
  if (input.category !== undefined) patch.category = input.category;
  if (input.strength !== undefined) patch.strength = input.strength;
  if (input.form !== undefined) patch.form = input.form;
  if (input.manufacturer !== undefined) patch.manufacturer = input.manufacturer;
  if (input.description !== undefined) patch.description = input.description;
  if (input.usage_instructions !== undefined) patch.usageInstructions = input.usage_instructions;
  if (input.notes !== undefined) patch.notes = input.notes;

  const ref = adminDb.collection("medicines").doc(id);
  await ref.update(patch);
  const snap = await ref.get();
  return medicineCatalogFromDoc(snap.id, snap.data()!);
}

export async function setMedicineActive(id: string, active: boolean): Promise<void> {
  await adminDb
    .collection("medicines")
    .doc(id)
    .update({ active, updatedAt: FieldValue.serverTimestamp() });
}

// Prescriptions snapshot {name, dosage, frequency, duration} at write time
// rather than referencing a medicine id (see MedicineCatalogItem's doc
// comment), so there's no foreign-key integrity to protect here — a hard
// delete never orphans or corrupts an existing prescription.
export async function deleteMedicine(id: string): Promise<void> {
  await adminDb.collection("medicines").doc(id).delete();
}
