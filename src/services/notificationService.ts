import { FieldValue } from "firebase-admin/firestore";
import type { MulticastMessage } from "firebase-admin/messaging";
import { adminDb, adminMessaging } from "@/lib/firebase/admin";
import { notificationFromDoc } from "@/lib/firebase/converters";
import type { AppNotification } from "@/lib/types";

export interface PushPayload {
  title: string;
  body: string;
  /** In-app path to open on tap, e.g. "/appointments". */
  url?: string;
}

const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

/**
 * Pushes to every signed-in staff member with at least one registered
 * device, and always writes a durable record to `notifications` regardless
 * of push delivery (so the admin bell has history even with no devices
 * registered, or if a push silently fails). Best-effort: failures here
 * should never fail the caller's underlying action (booking/checkin/etc.),
 * so this never throws — errors are swallowed after an attempt.
 */
export async function notifyStaff(payload: PushPayload): Promise<void> {
  try {
    await adminDb.collection("notifications").add({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? null,
      readBy: [],
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch {
    // Recording history is best-effort too — still attempt the push below.
  }

  try {
    const snap = await adminDb.collection("profiles").get();

    const targets: { uid: string; token: string }[] = [];
    for (const doc of snap.docs) {
      const tokens = (doc.data().fcmTokens as string[] | undefined) ?? [];
      for (const token of tokens) targets.push({ uid: doc.id, token });
    }
    if (targets.length === 0) return;

    const message: MulticastMessage = {
      tokens: targets.map((t) => t.token),
      notification: { title: payload.title, body: payload.body },
      webpush: { notification: { icon: "/icons/icon-192.png" } },
    };
    if (payload.url) {
      message.data = { url: payload.url };
      message.webpush = { ...message.webpush, fcmOptions: { link: payload.url } };
    }

    const response = await adminMessaging.sendEachForMulticast(message);

    const deadByUid = new Map<string, string[]>();
    response.responses.forEach((res, i) => {
      if (res.success || !res.error || !DEAD_TOKEN_CODES.has(res.error.code)) return;
      const { uid, token } = targets[i];
      const list = deadByUid.get(uid) ?? [];
      list.push(token);
      deadByUid.set(uid, list);
    });

    await Promise.all(
      Array.from(deadByUid.entries()).map(([uid, tokens]) =>
        adminDb
          .collection("profiles")
          .doc(uid)
          .update({ fcmTokens: FieldValue.arrayRemove(...tokens) }),
      ),
    );
  } catch {
    // Push delivery is a nice-to-have, never worth failing the caller over.
  }
}

export async function listRecentNotifications(limitCount = 20): Promise<AppNotification[]> {
  const snap = await adminDb
    .collection("notifications")
    .orderBy("createdAt", "desc")
    .limit(limitCount)
    .get();
  return snap.docs.map((d) => notificationFromDoc(d.id, d.data()));
}

export async function markNotificationRead(id: string, uid: string): Promise<void> {
  await adminDb
    .collection("notifications")
    .doc(id)
    .update({ readBy: FieldValue.arrayUnion(uid) });
}

export async function markAllNotificationsRead(uid: string, ids: string[]): Promise<void> {
  const batch = adminDb.batch();
  for (const id of ids) {
    batch.update(adminDb.collection("notifications").doc(id), {
      readBy: FieldValue.arrayUnion(uid),
    });
  }
  await batch.commit();
}
