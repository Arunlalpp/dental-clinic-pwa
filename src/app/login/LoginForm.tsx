"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

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
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("session");
      router.replace(next);
      router.refresh();
    } catch {
      setError("Those details didn’t match. Check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col justify-center bg-canvas px-6"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-600 to-accent shadow-float">
            <Image src="/icons/tooth-mark-white.png" alt="" width={34} height={34} priority />
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Live with beautiful smile
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-ink">care</span>
            <span className="text-brand-600">well</span>
          </h1>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            The Dental Experts
          </p>
          <p className="mt-3 text-sm text-slate-500">Sign in to reception</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 shadow-card ring-1 ring-slate-100 focus-within:ring-2 focus-within:ring-brand-500">
            <Mail size={18} className="text-brand-600" />
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@clinic.com"
              className="h-[52px] w-full bg-transparent py-3.5 text-base outline-none placeholder:text-slate-300"
              style={{ fontSize: 16 }}
            />
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 shadow-card ring-1 ring-slate-100 focus-within:ring-2 focus-within:ring-brand-500">
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
          Staff access only. Contact your clinic admin for an account.
        </p>
      </motion.div>
    </div>
  );
}
