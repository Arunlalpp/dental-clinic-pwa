"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search, Plus, MoreVertical, Pencil, EyeOff, Eye, Trash2, X, Check,
} from "lucide-react";
import { Button, Card, Chip, Field, EmptyState } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import {
  createMedicineAction,
  updateMedicineAction,
  setMedicineActiveAction,
  deleteMedicineAction,
} from "@/app/actions/medicines";
import type { MedicineCatalogItem } from "@/lib/types";
import type { NewMedicineInput } from "@/services/medicineService";

const emptyForm: NewMedicineInput = {
  name: "",
  generic_name: "",
  category: "",
  strength: "",
  form: "",
  manufacturer: "",
  description: "",
  usage_instructions: "",
  notes: "",
};

export function MedicinesManager({ initial }: { initial: MedicineCatalogItem[] }) {
  const toast = useToast();
  const [medicines, setMedicines] = useState(initial);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [editing, setEditing] = useState<MedicineCatalogItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<MedicineCatalogItem | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(medicines.map((m) => m.category))).sort(),
    [medicines],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return medicines.filter((m) => {
      if (category && m.category !== category) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.generic_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [medicines, query, category]);

  async function handleToggleActive(m: MedicineCatalogItem) {
    setOpenMenuId(null);
    const res = await setMedicineActiveAction(m.id, !m.active);
    if (res.ok) {
      setMedicines((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, active: !m.active } : x)),
      );
      toast.push(m.active ? "Medicine deactivated" : "Medicine activated");
    } else {
      toast.push(res.error ?? "Couldn’t update", "error");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    const res = await deleteMedicineAction(deleting.id);
    if (res.ok) {
      setMedicines((prev) => prev.filter((x) => x.id !== deleting.id));
      toast.push("Medicine deleted");
    } else {
      toast.push(res.error ?? "Couldn’t delete", "error");
    }
    setDeleting(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex h-12 flex-1 items-center gap-3 rounded-2xl bg-white px-4 shadow-card ring-1 ring-slate-100 focus-within:ring-2 focus-within:ring-brand-500">
          <Search size={18} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search medicines…"
            className="w-full bg-transparent text-base outline-none placeholder:text-slate-300"
            style={{ fontSize: 16 }}
          />
        </div>
        <Button className="w-full md:w-auto md:shrink-0" onClick={() => setEditing("new")}>
          <Plus size={17} /> Add medicine
        </Button>
      </div>

      {categories.length > 0 && (
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
          <Chip active={category === null} onClick={() => setCategory(null)}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title="No medicines found"
          description="Try a different search, or add a new one."
        />
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-2.5 md:hidden">
            {filtered.map((m) => (
              <Card key={m.id} className={`p-4 ${!m.active ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-700">{m.name}</p>
                      {!m.active && <InactiveBadge />}
                    </div>
                    {m.generic_name && (
                      <p className="truncate text-xs text-slate-400">{m.generic_name}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {m.category && <CategoryPill>{m.category}</CategoryPill>}
                      {m.strength && <span className="text-xs text-slate-400">{m.strength}</span>}
                      {m.form && <span className="text-xs text-slate-400">· {m.form}</span>}
                    </div>
                    {m.manufacturer && (
                      <p className="mt-1 truncate text-xs text-slate-300">{m.manufacturer}</p>
                    )}
                  </div>
                  <RowActionsMenu
                    medicine={m}
                    open={openMenuId === m.id}
                    onOpenChange={(open) => setOpenMenuId(open ? m.id : null)}
                    onEdit={() => setEditing(m)}
                    onToggleActive={() => handleToggleActive(m)}
                    onDelete={() => setDeleting(m)}
                  />
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-100 md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Medicine</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Strength / form</th>
                  <th className="px-4 py-3 font-medium">Manufacturer</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((m) => (
                  <tr key={m.id} className={!m.active ? "opacity-60" : ""}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-700">{m.name}</p>
                      {m.generic_name && (
                        <p className="text-xs text-slate-400">{m.generic_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {m.category ? <CategoryPill>{m.category}</CategoryPill> : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {[m.strength, m.form].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{m.manufacturer || "—"}</td>
                    <td className="px-4 py-3">
                      {m.active ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <InactiveBadge />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RowActionsMenu
                        medicine={m}
                        open={openMenuId === m.id}
                        onOpenChange={(open) => setOpenMenuId(open ? m.id : null)}
                        onEdit={() => setEditing(m)}
                        onToggleActive={() => handleToggleActive(m)}
                        onDelete={() => setDeleting(m)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AnimatePresence>
        {editing && (
          <MedicineFormSheet
            medicine={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onCreated={(m) => {
              setMedicines((prev) => [...prev, m].sort((a, b) => a.name.localeCompare(b.name)));
              setEditing(null);
            }}
            onUpdated={(id, patch) => {
              setMedicines((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <ConfirmDialog
            title="Delete medicine?"
            description={`"${deleting.name}" will be permanently removed from the reference list. This won't affect prescriptions already written — they keep their own copy of the details.`}
            confirmLabel="Delete"
            danger
            onCancel={() => setDeleting(null)}
            onConfirm={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function InactiveBadge() {
  return (
    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
      Inactive
    </span>
  );
}

function CategoryPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
      {children}
    </span>
  );
}

function RowActionsMenu({
  medicine,
  open,
  onOpenChange,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  medicine: MedicineCatalogItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative inline-block shrink-0">
      <button
        type="button"
        aria-label="Actions"
        onClick={() => onOpenChange(!open)}
        className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition active:scale-90"
      >
        <MoreVertical size={17} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => onOpenChange(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-2xl bg-white py-1 text-left shadow-float ring-1 ring-slate-100"
            >
              <MenuItem
                icon={<Pencil size={15} />}
                label="Edit"
                onClick={() => {
                  onOpenChange(false);
                  onEdit();
                }}
              />
              <MenuItem
                icon={medicine.active ? <EyeOff size={15} /> : <Eye size={15} />}
                label={medicine.active ? "Deactivate" : "Activate"}
                onClick={onToggleActive}
              />
              <MenuItem
                icon={<Trash2 size={15} />}
                label="Delete"
                danger
                onClick={() => {
                  onOpenChange(false);
                  onDelete();
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium transition hover:bg-slate-50 ${
        danger ? "text-rose-600" : "text-slate-700"
      }`}
    >
      {icon} {label}
    </button>
  );
}

/* ---------------------------------------------------------------- confirm dialog */
function ConfirmDialog({
  title,
  description,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-3xl bg-white p-5 shadow-float"
      >
        <p className="text-base font-semibold text-slate-800">{title}</p>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
        <div className="mt-5 flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          {danger ? (
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 rounded-2xl bg-rose-600 text-sm font-semibold text-white transition active:scale-95"
              style={{ height: 48 }}
            >
              {confirmLabel}
            </button>
          ) : (
            <Button className="flex-1" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------- add/edit sheet */
function MedicineFormSheet({
  medicine,
  onClose,
  onCreated,
  onUpdated,
}: {
  medicine: MedicineCatalogItem | null;
  onClose: () => void;
  onCreated: (m: MedicineCatalogItem) => void;
  onUpdated: (id: string, patch: Partial<MedicineCatalogItem>) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<NewMedicineInput>(
    medicine
      ? {
          name: medicine.name,
          generic_name: medicine.generic_name ?? "",
          category: medicine.category,
          strength: medicine.strength,
          form: medicine.form,
          manufacturer: medicine.manufacturer ?? "",
          description: medicine.description ?? "",
          usage_instructions: medicine.usage_instructions ?? "",
          notes: medicine.notes ?? "",
        }
      : emptyForm,
  );
  const [saving, setSaving] = useState(false);

  function set<K extends keyof NewMedicineInput>(key: K, value: NewMedicineInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!form.name.trim()) {
      toast.push("Name is required", "error");
      return;
    }
    setSaving(true);
    if (medicine) {
      const res = await updateMedicineAction(medicine.id, form);
      setSaving(false);
      if (res.ok) {
        onUpdated(medicine.id, form as Partial<MedicineCatalogItem>);
        toast.push("Medicine updated");
      } else {
        toast.push(res.error ?? "Couldn’t update", "error");
      }
    } else {
      const res = await createMedicineAction(form);
      setSaving(false);
      if (res.ok) {
        onCreated({
          id: res.id,
          name: form.name,
          generic_name: form.generic_name || null,
          category: form.category,
          strength: form.strength,
          form: form.form,
          manufacturer: form.manufacturer || null,
          description: form.description || null,
          usage_instructions: form.usage_instructions || null,
          notes: form.notes || null,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        toast.push("Medicine added");
      } else {
        toast.push(res.error ?? "Couldn’t add", "error");
      }
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col rounded-t-3xl bg-white shadow-float sm:max-w-lg sm:rounded-3xl"
        style={{ maxHeight: "92vh" }}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="text-lg font-semibold">
            {medicine ? "Edit medicine" : "Add medicine"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-500"
          >
            <X size={17} />
          </button>
        </div>

        <div
          className="flex-1 space-y-3.5 overflow-y-auto px-5"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        >
          <Field
            label="Medicine name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Amoxicillin"
            autoFocus
          />
          <Field
            label="Generic name"
            value={form.generic_name ?? ""}
            onChange={(e) => set("generic_name", e.target.value)}
            placeholder="Optional"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Category"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="e.g. Antibiotics"
            />
            <Field
              label="Form"
              value={form.form}
              onChange={(e) => set("form", e.target.value)}
              placeholder="e.g. Tablet"
            />
          </div>
          <Field
            label="Strength"
            value={form.strength}
            onChange={(e) => set("strength", e.target.value)}
            placeholder="e.g. 500 mg"
          />
          <Field
            label="Manufacturer"
            value={form.manufacturer ?? ""}
            onChange={(e) => set("manufacturer", e.target.value)}
            placeholder="Optional"
          />
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Usage instructions
            </span>
            <textarea
              value={form.usage_instructions ?? ""}
              onChange={(e) => set("usage_instructions", e.target.value)}
              rows={2}
              placeholder="e.g. 1 tablet, 3x/day, 5 days"
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-slate-200 placeholder:text-slate-300 focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Notes
            </span>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Optional"
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-slate-200 placeholder:text-slate-300 focus:ring-2 focus:ring-brand-500"
            />
          </label>
        </div>

        <div className="p-5 pt-3">
          <Button size="lg" className="w-full" disabled={saving} onClick={submit}>
            <Check size={18} /> {saving ? "Saving…" : medicine ? "Save changes" : "Add medicine"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
