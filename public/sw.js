// Minimal offline-shell service worker, plus Firebase Cloud Messaging's
// background handler. Both live in this one file because only one service
// worker can control a given scope at a time — a separate
// firebase-messaging-sw.js at the same "/" scope would fight this one.
const CACHE = "carewell-v1";
const SHELL = ["/dashboard", "/manifest.webmanifest", "/icons/icon-192.png"];

// These are the NEXT_PUBLIC_ Firebase web config values — already shipped to
// every client bundle, so hardcoding them here (a static file the build
// can't inject env vars into) exposes nothing new.
importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCXHBTxRwahVDRQdBIhmx7CjT2BWhuxPuQ",
  authDomain: "dental-clinic-pwa-9f211.firebaseapp.com",
  projectId: "dental-clinic-pwa-9f211",
  storageBucket: "dental-clinic-pwa-9f211.firebasestorage.app",
  messagingSenderId: "780418168200",
  appId: "1:780418168200:web:59c975bb4f790238b8b63d",
});

const messaging = firebase.messaging();

// Fires when a push arrives while the app isn't focused/open. Foreground
// messages are handled separately in src/lib/firebase/messaging.ts.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "Carewell";
  const body = payload.notification?.body ?? "";
  const url = payload.fcmOptions?.link ?? payload.data?.url ?? "/dashboard";
  self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Never cache Firebase / API traffic.
  if (url.origin !== self.location.origin) return;

  // Network-first for navigations, fall back to cached shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/dashboard"))
    );
    return;
  }

  // Cache-first for same-origin static assets.
  event.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return res;
      })
    )
  );
});
