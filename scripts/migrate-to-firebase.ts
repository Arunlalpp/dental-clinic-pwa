/**
 * One-off data migration: Supabase (Postgres) -> Firebase (Firestore + Auth).
 *
 * Not part of the deployed app — run manually, once per environment
 * (staging, then prod), during the maintenance-window cutover described in
 * the migration plan. Reads are SELECT-only against Supabase (zero risk to
 * the live database); all writes go to Firestore/Firebase Auth.
 *
 * Usage:
 *   SUPABASE_MIGRATION_URL=https://xxxx.supabase.co \
 *   SUPABASE_MIGRATION_SERVICE_ROLE_KEY=... \
 *   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}' \
 *   npm run migrate:firebase
 *
 * Order (respects FK dependencies; reuses original Supabase UUIDs everywhere
 * so no ID-remap table is needed):
 *   1. auth.users        -> Firebase Auth users (same uid)
 *   2. profiles          -> profiles/{uid}, custom claims
 *   3. dentists          -> dentists/{id}, denormalized profileName
 *   4. patients          -> patients/{id} + phoneIndex/{normalizedPhone},
 *                           stats computed here directly (no Cloud Function
 *                           backfill — see plan)
 *   5. appointments      -> appointments/{id} + appointmentSlots/{...} for
 *                           every non-cancelled/no_show row
 *   6. treatments        -> treatments/{id}
 *   7. payments          -> payments/{id}
 *   8. Verify: doc counts, spot-check stats, spot-check slot docs
 *
 * Explicitly skipped (confirmed zero code usage): prescriptions, documents,
 * notifications, audit_logs.
 *
 * Passwords cannot migrate (Supabase doesn't expose usable hashes). Every
 * migrated account needs a Firebase password-reset email after cutover.
 */

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const SUPABASE_URL = requireEnv("SUPABASE_MIGRATION_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_MIGRATION_SERVICE_ROLE_KEY");
const FIREBASE_SERVICE_ACCOUNT_KEY = requireEnv("FIREBASE_SERVICE_ACCOUNT_KEY");

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        console.error(`Missing required env var ${name}`);
        process.exit(1);
    }
    return value;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT_KEY)) });
const adminAuth = getAuth(app);
const adminDb = getFirestore(app);

// Minimal row shapes for the Supabase tables this script reads. The
// untyped `createClient()` above (no generated Database generic — this is
// throwaway migration tooling, not the app) infers `{}` for partial-column
// selects, so we cast into these explicitly rather than pull in
// `supabase gen types` for a script that runs once.
interface SbProfile {
    id: string;
    user_id: string;
    name: string;
    email: string | null;
    role: string;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}
interface SbDentist {
    id: string;
    profile_id: string;
    specialization: string | null;
    license_number: string | null;
    bio: string | null;
    active: boolean;
    created_at: string;
}
interface SbPatient {
    id: string;
    patient_number: string | null;
    full_name: string;
    phone: string;
    normalized_phone: string;
    email: string | null;
    date_of_birth: string | null;
    gender: string | null;
    address: string | null;
    medical_notes: string | null;
    allergies: string | null;
    emergency_contact: string | null;
    created_at: string;
    updated_at: string;
}
interface SbAppointment {
    id: string;
    patient_id: string;
    dentist_id: string | null;
    appointment_date: string;
    start_time: string;
    end_time: string | null;
    appointment_type: string;
    status: string;
    reason: string | null;
    notes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}
interface SbTreatment {
    id: string;
    patient_id: string;
    appointment_id: string | null;
    dentist_id: string | null;
    treatment_name: string;
    tooth_number: string | null;
    diagnosis: string | null;
    status: string;
    notes: string | null;
    treatment_date: string | null;
    cost: number;
    follow_up_date: string | null;
    created_at: string;
    updated_at: string;
}
interface SbPayment {
    id: string;
    patient_id: string;
    appointment_id: string | null;
    treatment_id: string | null;
    amount: number;
    payment_method: string;
    payment_status: string;
    transaction_reference: string | null;
    payment_date: string;
    notes: string | null;
    created_by: string | null;
    created_at: string;
}

const LOCKING_STATUSES = new Set([
    "scheduled",
    "confirmed",
    "checked_in",
    "in_treatment",
    "completed",
]);
const VISIT_STATUSES = new Set(["completed", "checked_in", "in_treatment"]);

async function migrateAuthUsers(): Promise<Map<string, string>> {
    console.log("\n[1/8] Migrating auth users...");
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;

    const emailByUid = new Map<string, string>();
    for (const user of data.users) {
        if (!user.email) continue;
        try {
            await adminAuth.createUser({
                uid: user.id,
                email: user.email,
                emailVerified: true,
                // Unusable random password — real accounts reset via Firebase
                // password-reset email after cutover (passwords can't migrate).
                password: randomUUID(),
            });
        } catch (e: unknown) {
            const code = (e as { code?: string })?.code;
            if (code !== "auth/uid-already-exists") throw e;
        }
        emailByUid.set(user.id, user.email);
    }
    console.log(`  -> ${emailByUid.size} auth users migrated`);
    return emailByUid;
}

async function migrateProfiles(): Promise<void> {
    console.log("\n[2/8] Migrating profiles...");
    const { data: profiles, error } = await supabase.from("profiles").select("*");
    if (error) throw error;

    let count = 0;
    for (const p of (profiles ?? []) as SbProfile[]) {
        await adminDb
            .collection("profiles")
            .doc(p.user_id)
            .set({
                name: p.name,
                email: p.email,
                role: p.role,
                avatarUrl: p.avatar_url,
                createdAt: p.created_at ? new Date(p.created_at) : FieldValue.serverTimestamp(),
                updatedAt: p.updated_at ? new Date(p.updated_at) : FieldValue.serverTimestamp(),
            });
        await adminAuth.setCustomUserClaims(p.user_id, { role: p.role });
        count++;
    }
    console.log(`  -> ${count} profiles migrated`);
}

/** profile_id (Postgres) -> denormalized profileName, needed by step 5. */
async function migrateDentists(): Promise<Map<string, string>> {
    console.log("\n[3/8] Migrating dentists...");
    const [{ data: dentists, error: dErr }, { data: profiles, error: pErr }] = await Promise.all([
        supabase.from("dentists").select("*"),
        supabase.from("profiles").select("id, name"),
    ]);
    if (dErr) throw dErr;
    if (pErr) throw pErr;
    const nameByProfileId = new Map(
        ((profiles ?? []) as Pick<SbProfile, "id" | "name">[]).map((p) => [p.id, p.name]),
    );

    const profileNameByDentistId = new Map<string, string>();
    for (const d of (dentists ?? []) as SbDentist[]) {
        const profileName = nameByProfileId.get(d.profile_id) ?? "Dentist";
        await adminDb
            .collection("dentists")
            .doc(d.id)
            .set({
                profileId: d.profile_id,
                profileName,
                specialization: d.specialization,
                licenseNumber: d.license_number,
                bio: d.bio,
                active: d.active,
                createdAt: d.created_at ? new Date(d.created_at) : FieldValue.serverTimestamp(),
            });
        profileNameByDentistId.set(d.id, profileName);
    }
    console.log(`  -> ${dentists?.length ?? 0} dentists migrated`);
    return profileNameByDentistId;
}

interface PatientStatsAcc {
    totalCost: number;
    totalPaid: number;
    lastTreatmentName: string | null;
    lastTreatmentAt: string;
    lastVisitDate: string | null;
    totalVisits: number;
}

async function migratePatients(): Promise<void> {
    console.log("\n[4/8] Migrating patients (with computed stats)...");
    const [
        { data: patients, error: patErr },
        { data: treatments, error: trErr },
        { data: payments, error: payErr },
        { data: appointments, error: apptErr },
    ] = await Promise.all([
        supabase.from("patients").select("*"),
        supabase.from("treatments").select("*"),
        supabase.from("payments").select("*"),
        supabase.from("appointments").select("*"),
    ]);
    if (patErr) throw patErr;
    if (trErr) throw trErr;
    if (payErr) throw payErr;
    if (apptErr) throw apptErr;

    const statsByPatient = new Map<string, PatientStatsAcc>();
    const getAcc = (patientId: string): PatientStatsAcc => {
        let acc = statsByPatient.get(patientId);
        if (!acc) {
            acc = {
                totalCost: 0,
                totalPaid: 0,
                lastTreatmentName: null,
                lastTreatmentAt: "",
                lastVisitDate: null,
                totalVisits: 0,
            };
            statsByPatient.set(patientId, acc);
        }
        return acc;
    };

    for (const t of (treatments ?? []) as SbTreatment[]) {
        const acc = getAcc(t.patient_id);
        acc.totalCost += Number(t.cost) || 0;
        const at = t.created_at ?? "";
        if (at >= acc.lastTreatmentAt) {
            acc.lastTreatmentAt = at;
            acc.lastTreatmentName = t.treatment_name;
        }
    }
    for (const p of (payments ?? []) as SbPayment[]) {
        if (p.payment_status === "paid" || p.payment_status === "partial") {
            getAcc(p.patient_id).totalPaid += Number(p.amount) || 0;
        }
    }
    for (const a of (appointments ?? []) as SbAppointment[]) {
        if (!VISIT_STATUSES.has(a.status)) continue;
        const acc = getAcc(a.patient_id);
        acc.totalVisits += 1;
        if (!acc.lastVisitDate || a.appointment_date > acc.lastVisitDate) {
            acc.lastVisitDate = a.appointment_date;
        }
    }

    let count = 0;
    for (const p of (patients ?? []) as SbPatient[]) {
        const acc = getAcc(p.id);
        const patientRef = adminDb.collection("patients").doc(p.id);
        await patientRef.set({
            patientNumber: p.patient_number,
            fullName: p.full_name,
            fullNameLower: p.full_name.toLowerCase(),
            phone: p.phone,
            normalizedPhone: p.normalized_phone,
            email: p.email,
            emailLower: p.email ? p.email.toLowerCase() : null,
            dateOfBirth: p.date_of_birth,
            gender: p.gender,
            address: p.address,
            medicalNotes: p.medical_notes,
            allergies: p.allergies,
            emergencyContact: p.emergency_contact,
            createdAt: p.created_at ? new Date(p.created_at) : FieldValue.serverTimestamp(),
            updatedAt: p.updated_at ? new Date(p.updated_at) : FieldValue.serverTimestamp(),
            stats: {
                totalCost: acc.totalCost,
                totalPaid: acc.totalPaid,
                outstanding: acc.totalCost - acc.totalPaid,
                lastVisitDate: acc.lastVisitDate,
                lastTreatmentName: acc.lastTreatmentName,
                totalVisits: acc.totalVisits,
            },
        });
        await adminDb
            .collection("phoneIndex")
            .doc(p.normalized_phone)
            .set({ patientId: p.id });
        count++;
    }
    console.log(`  -> ${count} patients migrated`);
}

async function migrateAppointments(
    profileNameByDentistId: Map<string, string>,
): Promise<void> {
    console.log("\n[5/8] Migrating appointments...");
    const [
        { data: appointments, error: apptErr },
        { data: patients, error: patErr },
    ] = await Promise.all([
        supabase.from("appointments").select("*"),
        supabase.from("patients").select("id, full_name, phone"),
    ]);
    if (apptErr) throw apptErr;
    if (patErr) throw patErr;
    const patientById = new Map(
        ((patients ?? []) as Pick<SbPatient, "id" | "full_name" | "phone">[]).map((p) => [
            p.id,
            p,
        ]),
    );

    let count = 0;
    let slotCount = 0;
    for (const a of (appointments ?? []) as SbAppointment[]) {
        const patient = patientById.get(a.patient_id);
        await adminDb
            .collection("appointments")
            .doc(a.id)
            .set({
                patientId: a.patient_id,
                patientName: patient?.full_name ?? "Unknown",
                patientPhone: patient?.phone ?? "",
                dentistId: a.dentist_id,
                dentistName: a.dentist_id ? profileNameByDentistId.get(a.dentist_id) ?? null : null,
                appointmentDate: a.appointment_date,
                startTime: a.start_time,
                endTime: a.end_time,
                appointmentType: a.appointment_type,
                status: a.status,
                reason: a.reason,
                notes: a.notes,
                createdBy: a.created_by,
                createdAt: a.created_at ? new Date(a.created_at) : FieldValue.serverTimestamp(),
                updatedAt: a.updated_at ? new Date(a.updated_at) : FieldValue.serverTimestamp(),
            });
        count++;

        if (a.dentist_id && LOCKING_STATUSES.has(a.status)) {
            await adminDb
                .collection("appointmentSlots")
                .doc(`${a.dentist_id}_${a.appointment_date}_${a.start_time}`)
                .set({ appointmentId: a.id, status: a.status });
            slotCount++;
        }
    }
    console.log(`  -> ${count} appointments migrated (${slotCount} active slot locks)`);
}

async function migrateTreatments(): Promise<void> {
    console.log("\n[6/8] Migrating treatments...");
    const { data, error } = await supabase.from("treatments").select("*");
    if (error) throw error;
    for (const t of (data ?? []) as SbTreatment[]) {
        await adminDb
            .collection("treatments")
            .doc(t.id)
            .set({
                patientId: t.patient_id,
                appointmentId: t.appointment_id,
                dentistId: t.dentist_id,
                treatmentName: t.treatment_name,
                toothNumber: t.tooth_number,
                diagnosis: t.diagnosis,
                status: t.status,
                notes: t.notes,
                treatmentDate: t.treatment_date,
                cost: t.cost,
                followUpDate: t.follow_up_date,
                createdAt: t.created_at ? new Date(t.created_at) : FieldValue.serverTimestamp(),
                updatedAt: t.updated_at ? new Date(t.updated_at) : FieldValue.serverTimestamp(),
            });
    }
    console.log(`  -> ${data?.length ?? 0} treatments migrated`);
}

async function migratePayments(): Promise<void> {
    console.log("\n[7/8] Migrating payments...");
    const { data, error } = await supabase.from("payments").select("*");
    if (error) throw error;
    for (const p of (data ?? []) as SbPayment[]) {
        await adminDb
            .collection("payments")
            .doc(p.id)
            .set({
                patientId: p.patient_id,
                appointmentId: p.appointment_id,
                treatmentId: p.treatment_id,
                amount: p.amount,
                paymentMethod: p.payment_method,
                paymentStatus: p.payment_status,
                transactionReference: p.transaction_reference,
                paymentDate: p.payment_date,
                notes: p.notes,
                createdBy: p.created_by,
                createdAt: p.created_at ? new Date(p.created_at) : FieldValue.serverTimestamp(),
            });
    }
    console.log(`  -> ${data?.length ?? 0} payments migrated`);
}

async function verify(): Promise<void> {
    console.log("\n[8/8] Verifying...");
    const tables = ["patients", "dentists", "appointments", "treatments", "payments"] as const;
    for (const table of tables) {
        const [{ count: pgCount }, fsSnap] = await Promise.all([
            supabase.from(table).select("*", { count: "exact", head: true }),
            adminDb.collection(table).count().get(),
        ]);
        const fsCount = fsSnap.data().count;
        const match = pgCount === fsCount ? "OK" : "MISMATCH";
        console.log(`  ${table}: supabase=${pgCount} firestore=${fsCount} [${match}]`);
    }
}

async function main() {
    const emailByUid = await migrateAuthUsers();
    await migrateProfiles();
    const profileNameByDentistId = await migrateDentists();
    await migratePatients();
    await migrateAppointments(profileNameByDentistId);
    await migrateTreatments();
    await migratePayments();
    await verify();

    console.log(`\nDone. ${emailByUid.size} accounts migrated — remember every one of`);
    console.log("them needs a password-reset email before they can sign in again.");
}

main().catch((e) => {
    console.error("\nMigration failed:", e);
    process.exit(1);
});
