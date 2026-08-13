"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Lottie from "lottie-react";
import toothAnimation from "@/lib/animations/splash-tooth.json";

const MIN_VISIBLE_MS = 950;
const STORAGE_KEY = "carewell-splash-shown";

/**
 * Brief animated brand splash on cold load. Only runs once per browser
 * session (sessionStorage) so client-side navigations never re-trigger it.
 *
 * `shouldShow` is decided once via a lazy useState initializer rather than
 * inside the effect below. Deciding it inside the effect would break under
 * React Strict Mode's dev-only mount→cleanup→remount cycle: the first
 * invocation would mark the session as "shown" in sessionStorage, then the
 * second (kept) invocation would read that same flag back and bail out
 * before ever scheduling a new hide-timer — leaving the splash stuck
 * visible forever. Reading it once up front keeps the effect idempotent.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [shouldShow] = useState(
    () => typeof window !== "undefined" && !sessionStorage.getItem(STORAGE_KEY),
  );

  useEffect(() => {
    if (!shouldShow) return;
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [shouldShow]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-brand-600 to-accent"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="h-36 w-36"
          >
            <Lottie animationData={toothAnimation} loop={false} autoplay />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="-mt-2 text-lg font-semibold tracking-wide text-white"
          >
            Carewell
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-white/70"
          >
            The Dental Experts
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
