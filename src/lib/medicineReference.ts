// Reference only — not tied to inventory or billing. Powers both the
// Settings -> Medicine reference list and the autocomplete on the
// prescription form's medicine name field (CompleteConsultationSheet).
export interface MedicineReference {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface MedicineReferenceGroup {
  title: string;
  note?: string;
  items: MedicineReference[];
}

export const MEDICINE_REFERENCE: MedicineReferenceGroup[] = [
  {
    title: "Antibiotics",
    note: "Course length per case — confirm before prescribing",
    items: [
      { name: "Amoxicillin", dosage: "500 mg", frequency: "3x/day", duration: "5 days" },
      { name: "Amoxicillin + Clavulanic acid", dosage: "625 mg", frequency: "2x/day", duration: "5 days" },
      { name: "Metronidazole", dosage: "400 mg", frequency: "3x/day", duration: "5 days" },
      { name: "Azithromycin", dosage: "500 mg", frequency: "1x/day", duration: "3 days" },
      { name: "Clindamycin", dosage: "300 mg", frequency: "3x/day", duration: "5 days" },
    ],
  },
  {
    title: "Pain relief & anti-inflammatory",
    note: "Take after food",
    items: [
      { name: "Ibuprofen", dosage: "400 mg", frequency: "3x/day", duration: "3 days" },
      { name: "Diclofenac", dosage: "50 mg", frequency: "2x/day", duration: "3 days" },
      { name: "Paracetamol", dosage: "650 mg", frequency: "3x/day", duration: "3 days" },
      { name: "Aceclofenac + Paracetamol", dosage: "100 mg + 325 mg", frequency: "2x/day", duration: "3 days" },
    ],
  },
  {
    title: "Topical gels & ointments",
    note: "Applied directly to the site",
    items: [
      { name: "Lignocaine gel", dosage: "2%", frequency: "Before procedure", duration: "1 day" },
      { name: "Metronidazole + Chlorhexidine gel", dosage: "1% + 0.25%", frequency: "2x/day", duration: "5 days" },
      { name: "Choline salicylate gel", dosage: "8.7%", frequency: "3–4x/day", duration: "5 days" },
      { name: "Hyaluronic acid gel", dosage: "0.2%", frequency: "2x/day", duration: "7 days" },
    ],
  },
  {
    title: "Mouthwash & antifungal",
    items: [
      { name: "Chlorhexidine gluconate mouthwash", dosage: "0.2%", frequency: "2x/day", duration: "7 days" },
      { name: "Clotrimazole (oral lozenge)", dosage: "10 mg", frequency: "5x/day", duration: "14 days" },
    ],
  },
];

export const ALL_MEDICINES: MedicineReference[] = MEDICINE_REFERENCE.flatMap((g) => g.items);
