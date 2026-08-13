import { getApps, getApp, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

// FIREBASE_SERVICE_ACCOUNT_KEY holds the full service-account JSON (as a
// single-line string) from Firebase console -> Project settings -> Service
// accounts -> Generate new private key. Server-only; never exposed to the
// client (no NEXT_PUBLIC_ prefix).
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);

const app = getApps().length
  ? getApp()
  : initializeApp({ credential: cert(serviceAccount) });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminMessaging = getMessaging(app);
