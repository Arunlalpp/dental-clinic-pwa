"use server";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentProfile } from "@/lib/auth";
import * as notificationService from "@/services/notificationService";
import type { AppNotification } from "@/lib/types";

export async function registerFcmTokenAction(token: string): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };

  await adminDb
    .collection("profiles")
    .doc(profile.id)
    .update({ fcmTokens: FieldValue.arrayUnion(token) });
  return { ok: true };
}

export async function unregisterFcmTokenAction(token: string): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };

  await adminDb
    .collection("profiles")
    .doc(profile.id)
    .update({ fcmTokens: FieldValue.arrayRemove(token) });
  return { ok: true };
}

export async function listRecentNotificationsAction(): Promise<AppNotification[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];
  return notificationService.listRecentNotifications();
}

export async function markNotificationReadAction(id: string): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };
  await notificationService.markNotificationRead(id, profile.id);
  return { ok: true };
}

export async function markAllNotificationsReadAction(
  ids: string[],
): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };
  await notificationService.markAllNotificationsRead(profile.id, ids);
  return { ok: true };
}
