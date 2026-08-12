"use server";

import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getCurrentProfile } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

export interface ProvisionStaffInput {
  email: string;
  name: string;
  role: UserRole;
  /** Only used when role === "dentist" — creates the linked dentists doc. */
  specialization?: string | null;
}

export type ProvisionStaffResult =
  | { ok: true; uid: string; passwordResetLink: string }
  | { ok: false; error: string };

/**
 * Replaces the Postgres handle_new_user trigger: there's no self-signup UI
 * ("Staff access only. Contact your clinic admin for an account."), so an
 * admin/owner creates accounts explicitly. Runs entirely server-side via the
 * Admin SDK — no Cloud Function needed, since this app already has no
 * writes originating outside its own Server Actions.
 */
export async function provisionStaffUserAction(
  input: ProvisionStaffInput,
): Promise<ProvisionStaffResult> {
  const caller = await getCurrentProfile();
  if (!caller || !["owner", "admin"].includes(caller.role)) {
    return { ok: false, error: "Only an owner or admin can add staff." };
  }
  if (!input.email?.trim() || !input.name?.trim()) {
    return { ok: false, error: "Name and email are required." };
  }

  try {
    const tempPassword = randomUUID();
    const userRecord = await adminAuth.createUser({
      email: input.email.trim(),
      password: tempPassword,
      displayName: input.name.trim(),
      emailVerified: false,
    });

    await adminAuth.setCustomUserClaims(userRecord.uid, { role: input.role });

    const now = FieldValue.serverTimestamp();
    await adminDb
      .collection("profiles")
      .doc(userRecord.uid)
      .set({
        name: input.name.trim(),
        email: input.email.trim(),
        role: input.role,
        avatarUrl: null,
        createdAt: now,
        updatedAt: now,
      });

    if (input.role === "dentist") {
      await adminDb.collection("dentists").add({
        profileId: userRecord.uid,
        profileName: input.name.trim(),
        specialization: input.specialization ?? null,
        licenseNumber: null,
        bio: null,
        active: true,
        createdAt: now,
      });
    }

    // Admin SDK only generates the link — it does not send email. There's no
    // email-sending integration in this app yet, so the caller (an admin,
    // via script or a future "Add Staff" screen) is responsible for getting
    // this link to the new user, rather than handing them the temp password.
    const passwordResetLink = await adminAuth.generatePasswordResetLink(
      input.email.trim(),
    );

    return { ok: true, uid: userRecord.uid, passwordResetLink };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
