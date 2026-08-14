"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, ShieldAlert } from "lucide-react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui";

const ADMIN_ROLES = ["owner", "admin"];

export function AdminLoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // Role lives in the ID token's custom claims (set by
      // provisionStaffUserAction), so this is checkable without an extra
      // Firestore read — and checked *before* minting a session cookie, so
      // a non-admin staff member never gets one just by trying this form.
      const idTokenResult = await cred.user.getIdTokenResult();
      const role = idTokenResult.claims.role as string | undefined;
      if (!role || !ADMIN_ROLES.includes(role)) {
        await signOut(auth);
        setError("This account doesn’t have admin access.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: idTokenResult.token }),
      });
      if (!res.ok) throw new Error("session");
      router.replace("/admin");
    } catch {
      setError("Those details didn’t match. Check your email and password.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(198,41,126,0.25), transparent 40%), radial-gradient(circle at 80% 70%, rgba(138,18,87,0.25), transparent 45%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-float"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-3xl bg-gradient-to-br from-brand-600 to-accent shadow-card">
            <Image src="/icons/tooth-mark-white.png" alt="" width={28} height={28} priority />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            <span className="text-ink">care</span>
            <span className="text-brand-600">well</span>
          </h1>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            The Dental Experts
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            <ShieldAlert size={12} /> Admin portal
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-500">
            <Mail size={18} className="text-brand-600" />
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@clinic.com"
              className="h-[52px] w-full bg-transparent py-3.5 text-base outline-none placeholder:text-slate-300"
              style={{ fontSize: 16 }}
            />
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-500">
            <Lock size={18} className="text-brand-600" />
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-transparent py-3.5 text-base outline-none placeholder:text-slate-300"
              style={{ fontSize: 16 }}
            />
          </div>

          {error && (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
            {!loading && <ArrowRight size={18} />}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Admin access only. Clinic staff should use the regular app sign-in.
        </p>
      </motion.div>
    </div>
  );
}
