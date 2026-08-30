"use client";

import { useReducedMotion } from "framer-motion";

/**
 * Whether this visitor should get the full motion treatment.
 *
 * Respecting `prefers-reduced-motion` is the right default for real visitors,
 * but the OS-level "show animations" toggle is often off for reasons that have
 * nothing to do with vestibular sensitivity — and then nobody on that machine
 * can review the animation work. `NEXT_PUBLIC_FORCE_MOTION=true` overrides the
 * query for local review only; leave it unset (or false) in production.
 */
export function useSiteMotion() {
  const prefersReduced = useReducedMotion();
  const forced = process.env.NEXT_PUBLIC_FORCE_MOTION === "true";
  return { animate: forced || !prefersReduced, prefersReduced: Boolean(prefersReduced) };
}
