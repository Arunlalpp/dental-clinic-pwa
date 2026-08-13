"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { onForegroundPush } from "@/lib/firebase/messaging";

/**
 * FCM only delivers to the service worker's onBackgroundMessage handler
 * (public/sw.js) when the tab/app isn't focused. When it *is* focused,
 * delivery goes through onMessage in page JS instead, and FCM deliberately
 * doesn't auto-show a system notification for that case (it assumes an
 * on-screen app doesn't need one) — so nothing shows up at all unless
 * something both listens for it and decides to display it. Mounted once in
 * the authenticated shell so it's live on every page while signed in.
 *
 * Clinic staff asked for a real system notification even while the app is
 * open (they may have it open but not be looking at it), not just the
 * in-app toast — so this shows both: the toast for immediate in-context
 * feedback, and a manually-triggered notification via the same service
 * worker registration used for background pushes, so tapping it reuses
 * sw.js's notificationclick handler (focus/open to the right page) just
 * like a real background push would.
 */
export function PushListener() {
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    onForegroundPush((title, body, url) => {
      toast.push(body ? `${title} — ${body}` : title);
      router.refresh();

      if ("serviceWorker" in navigator && Notification.permission === "granted") {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            data: { url },
          });
        });
      }
    }).then((unsub) => {
      if (cancelled) unsub();
      else unsubscribe = unsub;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
