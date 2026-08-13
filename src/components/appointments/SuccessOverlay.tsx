"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import checkAnimation from "@/lib/animations/success-check.json";

const AUTO_CLOSE_MS = 1650;

/** Full-screen success beat shown after a mutation completes, then auto-advances. */
function SuccessOverlay({
  title,
  subtitle,
  onDone,
}: {
  title: string;
  subtitle: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, AUTO_CLOSE_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="w-40">
        <Lottie animationData={checkAnimation} loop={false} autoplay />
      </div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-2 text-lg font-semibold tracking-tight text-ink"
      >
        {title}
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-1 text-sm text-slate-500"
      >
        {subtitle}
      </motion.p>
    </motion.div>
  );
}

export function BookingSuccessOverlay({ onDone }: { onDone: () => void }) {
  return (
    <SuccessOverlay title="Appointment booked" subtitle="See you then!" onDone={onDone} />
  );
}

export function ConsultationSuccessOverlay({ onDone }: { onDone: () => void }) {
  return (
    <SuccessOverlay
      title="Consultation completed"
      subtitle="Treatment and notes saved."
      onDone={onDone}
    />
  );
}
