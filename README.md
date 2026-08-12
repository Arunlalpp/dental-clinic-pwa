# CAREWELL The Dental Experts — Clinic Management & Booking PWA

A mobile-first, installable PWA for dental reception. Built around one hot path:
**phone number → instant patient recognition → history → booking** in seconds.

Stack: Next.js 15 (App Router, RSC) · TypeScript (strict) · Firebase (Firestore,
Auth, Security Rules) · Tailwind · Framer Motion · Recharts.

---

## 1. Prerequisites

- Node.js 18.18+ (20+ recommended)
- A Firebase project (Spark/free plan is fine — this app uses no Cloud Functions)

## 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in from **Firebase console → Project settings → General → Your apps** (add
a Web app via the `</>` icon if you haven't yet):

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

And from **Project settings → Service accounts → Generate new private key**
(server-only — never prefix this with `NEXT_PUBLIC_`):

```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"..."}
```

Paste the downloaded JSON as a single line, e.g. `jq -c . serviceAccountKey.json`.
This is required even to run `npm run build` — Next.js evaluates the Admin SDK
at build time for any route that uses it.

## 3. Enable Firestore + Auth

In the Firebase console: **Build → Firestore Database → Create database**
(any region), and **Build → Authentication → Sign-in method → Email/Password
→ Enable**. No other products are needed — this app has no file uploads, so
Firebase Storage isn't used.

## 4. Deploy Security Rules + indexes

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

(`.firebaserc` already points at the project created earlier in this app's
history — update it if you're targeting a different project.)

## 5. Create your first user

The app is staff-only; there's no public sign-up screen. Accounts are created
via a Server Action, not the Firebase console UI (so the matching Firestore
`profiles` doc + role custom-claim get set correctly). Easiest path: add a
temporary call to `provisionStaffUserAction` (`src/app/actions/staff.ts`) from
a scratch script or a protected route, e.g.:

```ts
import { provisionStaffUserAction } from "@/app/actions/staff";
await provisionStaffUserAction({ email: "you@clinic.com", name: "Your Name", role: "owner" });
```

It returns a `passwordResetLink` — open that link to set your password, then
sign in normally. (There's no email-sending integration yet, so the link is
handed back directly rather than emailed.)

## 6. Migrating from an existing Supabase project

If you have real data in Supabase already, see `scripts/migrate-to-firebase.ts`
— a one-off script (not part of the deployed app) that copies auth users,
profiles, patients, dentists, appointments, treatments, and payments across,
preserving IDs. Run it once per environment during a short maintenance window:

```bash
SUPABASE_MIGRATION_URL=https://xxxx.supabase.co \
SUPABASE_MIGRATION_SERVICE_ROLE_KEY=... \
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}' \
npm run migrate:firebase
```

Passwords can't migrate (Supabase doesn't expose usable hashes) — every
migrated account needs a Firebase password-reset email before they can sign
in again.

## 7. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 and sign in. The service worker + install prompt
only activate in a production build (`npm run build && npm start`).

---

## Architecture

```
src/
  app/
    (app)/            Protected shell (top bar · page transitions · bottom nav)
      dashboard/      Stats, quick actions, today's schedule (realtime)
      new-booking/    The hot path — lookup → recognise/create → book
      patients/       Search + patient profile (tabs, timeline, payments)
      appointments/   Schedule + waiting room + status transitions (realtime)
      payments/       Recent payments
      reports/        Revenue + treatment charts
      settings/       Profile, role, sign out
    actions/          Server actions (writes) — patients, appointments,
                       payments, staff provisioning
    api/auth/session/ Route handler that mints/clears the session cookie
    login/            Email/password auth (Firebase Auth)
  services/           Data layer. Server-only files (Admin SDK, no suffix)
                       vs. client-only files (*.client.ts, client SDK) — see
                       "Server vs. client services" below.
  hooks/              Client hooks — debounced search, realtime (onSnapshot)
  lib/firebase/        client.ts / admin.ts (two SDKs, not interchangeable),
                       session.ts (Edge-safe cookie check for middleware),
                       verify-session.ts (Node-only full verification),
                       converters.ts (Firestore doc <-> domain type mapping)
  lib/types.ts        Domain types (snake_case — unchanged shape from before
                       the migration, so most components didn't need edits)
  components/         UI primitives + feature components
middleware.ts         Cheap session-cookie presence check (Edge runtime) —
                       real verification happens in getCurrentProfile()
firestore.rules        Security Rules (role-based, via custom claims)
firestore.indexes.json Composite indexes this app's queries need
scripts/               One-off data migration tooling (not deployed)
public/                manifest.webmanifest · sw.js · icons
```

**Principles**

- Server Components fetch data; Client Components handle interaction.
- Components never call Firestore directly — everything goes through `services/`.
- **Server vs. client services**: Firestore has two separate SDKs (Admin SDK
  for trusted server code, client SDK for the browser) that aren't
  interchangeable the way one Supabase client was. Server-only service files
  (e.g. `patientService.ts`) use the Admin SDK and back Server
  Components/Actions; client-only files (e.g. `patientService.client.ts`) use
  the client SDK and back interactive search/booking UI, protected by
  `firestore.rules` as their only defense (no server round trip).
- Writes go through **Server Actions**, which run entirely server-side via the
  Admin SDK (bypassing Security Rules — the action itself checks the caller's
  role via their verified session).
- No Cloud Functions. Firestore has no triggers, so logic that would live in a
  Postgres trigger (auto patient numbers, phone-uniqueness, balance totals,
  double-booking prevention) instead runs inline inside the relevant Server
  Action, using Admin SDK transactions — possible because 100% of writes in
  this app already go through Server Actions.
- Phone numbers are normalized to digits in one place (`normalizePhone`),
  used consistently for the `phoneIndex` uniqueness doc and lookup queries.
- Patient search is **prefix-only** (Firestore has no substring/trigram
  search) — typing the start of a name/phone/ID/email matches; typing the
  middle or last few digits of a phone number won't. This is a deliberate,
  accepted tradeoff of the Firebase migration.

---

## What's complete vs. a starting point

**Complete and wired end-to-end**

- Firestore schema, Security Rules, duplicate-phone protection (via
  `phoneIndex`), denormalized patient balance stats
- Auth (Firebase Auth + session cookies), protected routes, role-aware shell,
  sign out
- The booking hot path: debounced lookup, instant recognition, create-patient
  with duplicate guard, live slot availability, conflict-safe booking
  (including a fix so cancelling an appointment correctly frees its slot,
  unlike the old Postgres-constraint behavior)
- Patient profile with history timeline and record-payment
- Dashboard + schedule with realtime updates (Firestore `onSnapshot`) and
  check-in / start / complete
- Reports (revenue area, treatment mix) from live data
- PWA: manifest, icons, offline-shell service worker, iOS safe-area handling

**Deliberately left as a baseline to extend**

- Prescriptions, document upload, in-app notifications, and an audit log were
  all unused in the Supabase-era code and were dropped rather than ported —
  add them back as new Firestore collections + rules if you need them
- An in-app "Add staff" screen (`provisionStaffUserAction` exists as a Server
  Action; there's no UI calling it yet)
- Per-dentist patient assignment (dentists currently read clinic-wide)
- Full appointment editing/rescheduling and cancellation reasons
- Settings screens beyond profile (clinic hours, staff management)
- Search beyond prefix-matching, if last-N-digits/substring search turns out
  to matter in practice (see Architecture notes above for the tradeoff)

The icons in `public/icons` are generated placeholders — swap in real brand art
before shipping.
