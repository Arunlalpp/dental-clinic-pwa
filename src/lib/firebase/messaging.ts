"use client";

import { getApps, getApp, initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  deleteToken as deleteMessagingToken,
  onMessage,
  isSupported,
  type Messaging,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let messagingPromise: Promise<Messaging | null> | null = null;

/** Messaging needs its own service-worker-backed instance and isn't
 * available in every browser (Safari < 16, non-HTTPS, etc.) — isSupported()
 * guards that. Memoized since isSupported() itself is async. */
function getMessagingInstance(): Promise<Messaging | null> {
  if (!messagingPromise) {
    messagingPromise = isSupported().then((supported) => {
      if (!supported) return null;
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      return getMessaging(app);
    });
  }
  return messagingPromise;
}

export type PushPermissionResult =
  | { ok: true; token: string }
  | { ok: false; reason: "unsupported" | "denied" | "no-vapid-key" | "error" };

/**
 * Requests notification permission (must be called from a user gesture —
 * a click handler, not on mount) and returns an FCM registration token tied
 * to this browser's existing /sw.js registration.
 */
export async function requestPushPermission(): Promise<PushPermissionResult> {
  const messaging = await getMessagingInstance();
  if (!messaging) return { ok: false, reason: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return { ok: false, reason: "no-vapid-key" };

  try {
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    return { ok: true, token };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Invalidates this browser's current FCM token (call before/alongside
 * unregisterFcmTokenAction so the dead token isn't just removed server-side
 * but also stops working if it somehow leaked elsewhere). */
export async function disablePush(): Promise<void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return;
  try {
    await deleteMessagingToken(messaging);
  } catch {
    /* best-effort */
  }
}

/** Foreground-only — background/closed-tab notifications are shown by the
 * onBackgroundMessage handler in public/sw.js instead. FCM won't surface a
 * system notification for these on its own (that's by design — it assumes
 * an on-screen app doesn't need one), so `handler` gets the raw payload and
 * decides for itself what to show. */
export async function onForegroundPush(
  handler: (title: string, body: string, url: string) => void,
) {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? "Carewell";
    const body = payload.notification?.body ?? "";
    const url = payload.fcmOptions?.link ?? payload.data?.url ?? "/dashboard";
    handler(title, body, url);
  });
}
