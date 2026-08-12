// ---------------------------------------------------------------------------
// Domain types — mirror the Firestore collections (see the migration plan /
// firestore.rules). Field names are camelCase to match Firestore convention;
// dates/times are kept as plain strings throughout (never Firestore
// Timestamp) so string comparisons/sorts used across the app keep working
// unchanged.
// ---------------------------------------------------------------------------

export type UserRole = "owner" | "admin" | "receptionist" | "dentist" | "staff";
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "in_treatment"
  | "completed"
  | "cancelled"
  | "no_show";

export type AppointmentType =
  | "consultation"
  | "dental_cleaning"
  | "root_canal"
  | "tooth_extraction"
  | "dental_filling"
  | "braces_consultation"
  | "implant_consultation"
  | "follow_up"
  | "emergency";

export type TreatmentStatus = "planned" | "in_progress" | "completed" | "cancelled";
export type PaymentMethod = "cash" | "upi" | "card" | "bank_transfer" | "other";
export type PaymentStatus = "pending" | "partial" | "paid" | "refunded";

// profiles/{uid} — doc ID is the Firebase Auth uid, so there's no separate
// user_id field the way Supabase's profiles.user_id foreign key needed.
export interface Profile {
  id: string;
  name: string;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientStats {
  total_cost: number;
  total_paid: number;
  outstanding: number;
  last_visit: string | null;
  last_treatment: string | null;
  total_visits: number;
}

export interface Patient {
  id: string;
  patient_number: string | null;
  full_name: string;
  phone: string;
  normalized_phone: string;
  email: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  address: string | null;
  medical_notes: string | null;
  allergies: string | null;
  emergency_contact: string | null;
  created_at: string;
  updated_at: string;
  stats: PatientStats;
}

export interface Dentist {
  id: string;
  profile_id: string;
  profile_name: string;
  specialization: string | null;
  license_number: string | null;
  bio: string | null;
  active: boolean;
  created_at: string;
}

// appointments/{id} carries denormalized patient/dentist display fields —
// Firestore has no join, so these are written at create time and kept in
// sync by the writing Server Action rather than resolved by a query.
export interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  dentist_id: string | null;
  dentist_name: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string | null;
  appointment_type: AppointmentType;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Treatment {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  dentist_id: string | null;
  treatment_type: AppointmentType | null;
  treatment_name: string;
  tooth_number: string | null;
  diagnosis: string | null;
  status: TreatmentStatus;
  notes: string | null;
  treatment_date: string | null;
  cost: number;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

// treatmentPrices/{treatmentType} — one doc per AppointmentType, doubling as
// the billable-procedure catalog (there's no separate procedure list in this
// app). dentist_fees overrides default_fee for a specific dentist.
export interface TreatmentPrice {
  treatment_type: AppointmentType;
  default_fee: number;
  dentist_fees: Record<string, number>;
  updated_at: string;
}

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  treatment_id: string | null;
  appointment_id: string | null;
  dentist_id: string | null;
  dentist_name: string | null;
  medicines: Medicine[];
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface Payment {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  treatment_id: string | null;
  amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  transaction_reference: string | null;
  payment_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// Convenience shape used across the patient preview / lookup UI — same
// fields as PatientStats, flattened onto Patient, matching the old
// patient_balances-view-derived shape so components don't need to change.
export interface PatientPreview extends Patient {
  last_visit: string | null;
  last_treatment: string | null;
  total_visits: number;
  outstanding: number;
}
