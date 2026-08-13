"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { onForegroundPush } from "@/lib/firebase/messaging";

/**
 * FCM only delivers to the service worker's onBackgroundMessage handler
 * (public/sw.js) when the tab/app isn't focused. When it *is* focused,
 * delivery goes through onMessage in page JS instead — nothing shows up
 * unless something is listening for that here. Mounted once in the
 * authenticated shell so it's live on every page while signed in.
 */
export function PushListener() {
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    onForegroundPush((title, body) => {
      toast.push(body ? `${title} — ${body}` : title);
      router.refresh();
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
