import type {
  Appointment,
  AppNotification,
  AttendanceRecord,
  Dentist,
  Medicine,
  MedicineCatalogItem,
  Patient,
  PatientStats,
  Payment,
  Prescription,
  Profile,
  Treatment,
  TreatmentPrice,
} from "@/lib/types";

/**
 * Maps Firestore documents (camelCase on disk, per the migration plan's data
 * model) to this app's domain types (snake_case, unchanged from the Supabase
 * era so components didn't need to be rewritten). `created_at`/`updated_at`
 * are written as Firestore serverTimestamp() sentinels and read back as
 * Timestamp instances (Admin SDK and client SDK both expose `.toDate()`) —
 * tsToIso() normalizes either that or an already-ISO string (the migration
 * script writes plain strings for historical rows).
 */

function tsToIso(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate(): Date }).toDate().toISOString();
  }
  return typeof value === "string" ? value : new Date().toISOString();
}

function nullable<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

function nullableTs(value: unknown): string | null {
  if (value == null) return null;
  return tsToIso(value);
}

export function profileFromDoc(id: string, data: Record<string, unknown>): Profile {
  return {
    id,
    name: data.name as string,
    email: nullable(data.email as string | undefined),
    role: data.role as Profile["role"],
    avatar_url: nullable(data.avatarUrl as string | undefined),
    phone: nullable(data.phone as string | undefined),
    joining_date: nullable(data.joiningDate as string | undefined),
    monthly_salary: nullable(data.monthlySalary as number | undefined),
    created_at: tsToIso(data.createdAt),
    updated_at: tsToIso(data.updatedAt),
  };
}

export function dentistFromDoc(id: string, data: Record<string, unknown>): Dentist {
  return {
    id,
    profile_id: data.profileId as string,
    profile_name: data.profileName as string,
    specialization: nullable(data.specialization as string | undefined),
    license_number: nullable(data.licenseNumber as string | undefined),
    bio: nullable(data.bio as string | undefined),
    active: Boolean(data.active),
    created_at: tsToIso(data.createdAt),
  };
}

const emptyStats: PatientStats = {
  total_cost: 0,
  total_paid: 0,
  outstanding: 0,
  last_visit: null,
  last_treatment: null,
  total_visits: 0,
};

export function patientFromDoc(id: string, data: Record<string, unknown>): Patient {
  const stats = (data.stats as Record<string, unknown>) ?? {};
  return {
    id,
    patient_number: nullable(data.patientNumber as string | undefined),
    full_name: data.fullName as string,
    phone: data.phone as string,
    normalized_phone: data.normalizedPhone as string,
    email: nullable(data.email as string | undefined),
    date_of_birth: nullable(data.dateOfBirth as string | undefined),
    gender: nullable(data.gender as Patient["gender"] | undefined),
    address: nullable(data.address as string | undefined),
    medical_notes: nullable(data.medicalNotes as string | undefined),
    allergies: nullable(data.allergies as string | undefined),
    emergency_contact: nullable(data.emergencyContact as string | undefined),
    created_at: tsToIso(data.createdAt),
    updated_at: tsToIso(data.updatedAt),
    stats: {
      total_cost: (stats.totalCost as number) ?? emptyStats.total_cost,
      total_paid: (stats.totalPaid as number) ?? emptyStats.total_paid,
      outstanding: (stats.outstanding as number) ?? emptyStats.outstanding,
      last_visit: nullable(stats.lastVisitDate as string | undefined),
      last_treatment: nullable(stats.lastTreatmentName as string | undefined),
      total_visits: (stats.totalVisits as number) ?? emptyStats.total_visits,
    },
  };
}

export function appointmentFromDoc(
  id: string,
  data: Record<string, unknown>,
): Appointment {
  return {
    id,
    patient_id: data.patientId as string,
    patient_name: data.patientName as string,
    patient_phone: data.patientPhone as string,
    dentist_id: nullable(data.dentistId as string | undefined),
    dentist_name: nullable(data.dentistName as string | undefined),
    appointment_date: data.appointmentDate as string,
    start_time: data.startTime as string,
    end_time: nullable(data.endTime as string | undefined),
    appointment_type: data.appointmentType as Appointment["appointment_type"],
    status: data.status as Appointment["status"],
    reason: nullable(data.reason as string | undefined),
    notes: nullable(data.notes as string | undefined),
    created_by: nullable(data.createdBy as string | undefined),
    created_at: tsToIso(data.createdAt),
    updated_at: tsToIso(data.updatedAt),
  };
}

export function treatmentFromDoc(
  id: string,
  data: Record<string, unknown>,
): Treatment {
  return {
    id,
    patient_id: data.patientId as string,
    appointment_id: nullable(data.appointmentId as string | undefined),
    dentist_id: nullable(data.dentistId as string | undefined),
    treatment_type: nullable(data.treatmentType as Treatment["treatment_type"] | undefined),
    treatment_name: data.treatmentName as string,
    tooth_number: nullable(data.toothNumber as string | undefined),
    diagnosis: nullable(data.diagnosis as string | undefined),
    status: data.status as Treatment["status"],
    notes: nullable(data.notes as string | undefined),
    treatment_date: nullable(data.treatmentDate as string | undefined),
    cost: (data.cost as number) ?? 0,
    follow_up_date: nullable(data.followUpDate as string | undefined),
    created_at: tsToIso(data.createdAt),
    updated_at: tsToIso(data.updatedAt),
  };
}

export function treatmentPriceFromDoc(
  id: string,
  data: Record<string, unknown>,
): TreatmentPrice {
  return {
    treatment_type: id as TreatmentPrice["treatment_type"],
    default_fee: (data.defaultFee as number) ?? 0,
    dentist_fees: (data.dentistFees as Record<string, number>) ?? {},
    updated_at: tsToIso(data.updatedAt),
  };
}

export function prescriptionFromDoc(
  id: string,
  data: Record<string, unknown>,
): Prescription {
  return {
    id,
    patient_id: data.patientId as string,
    treatment_id: nullable(data.treatmentId as string | undefined),
    appointment_id: nullable(data.appointmentId as string | undefined),
    dentist_id: nullable(data.dentistId as string | undefined),
    dentist_name: nullable(data.dentistName as string | undefined),
    medicines: (data.medicines as Medicine[]) ?? [],
    notes: nullable(data.notes as string | undefined),
    created_at: tsToIso(data.createdAt),
    created_by: nullable(data.createdBy as string | undefined),
  };
}

export function paymentFromDoc(id: string, data: Record<string, unknown>): Payment {
  return {
    id,
    patient_id: data.patientId as string,
    appointment_id: nullable(data.appointmentId as string | undefined),
    treatment_id: nullable(data.treatmentId as string | undefined),
    amount: (data.amount as number) ?? 0,
    payment_method: data.paymentMethod as Payment["payment_method"],
    payment_status: data.paymentStatus as Payment["payment_status"],
    transaction_reference: nullable(data.transactionReference as string | undefined),
    payment_date: data.paymentDate as string,
    notes: nullable(data.notes as string | undefined),
    created_by: nullable(data.createdBy as string | undefined),
    created_at: tsToIso(data.createdAt),
  };
}

export function medicineCatalogFromDoc(
  id: string,
  data: Record<string, unknown>,
): MedicineCatalogItem {
  return {
    id,
    name: data.name as string,
    generic_name: nullable(data.genericName as string | undefined),
    category: (data.category as string) ?? "Other",
    strength: (data.strength as string) ?? "",
    form: (data.form as string) ?? "",
    manufacturer: nullable(data.manufacturer as string | undefined),
    description: nullable(data.description as string | undefined),
    usage_instructions: nullable(data.usageInstructions as string | undefined),
    notes: nullable(data.notes as string | undefined),
    active: (data.active as boolean) ?? true,
    created_at: tsToIso(data.createdAt),
    updated_at: tsToIso(data.updatedAt),
  };
}

export function notificationFromDoc(
  id: string,
  data: Record<string, unknown>,
): AppNotification {
  return {
    id,
    title: data.title as string,
    body: (data.body as string) ?? "",
    url: nullable(data.url as string | undefined),
    created_at: tsToIso(data.createdAt),
    read_by: (data.readBy as string[]) ?? [],
  };
}

export function attendanceFromDoc(
  id: string,
  data: Record<string, unknown>,
): AttendanceRecord {
  return {
    id,
    staff_id: data.staffId as string,
    staff_name: (data.staffName as string) ?? "",
    date: data.date as string,
    check_in: nullableTs(data.checkIn),
    check_out: nullableTs(data.checkOut),
    total_minutes: (data.totalMinutes as number | null | undefined) ?? null,
    late_minutes: (data.lateMinutes as number) ?? 0,
    overtime_minutes: (data.overtimeMinutes as number) ?? 0,
    early_checkout_minutes: (data.earlyCheckoutMinutes as number) ?? 0,
    status: (data.status as AttendanceRecord["status"]) ?? "present",
    notes: nullable(data.notes as string | undefined),
    created_at: tsToIso(data.createdAt),
    updated_at: tsToIso(data.updatedAt),
  };
}
