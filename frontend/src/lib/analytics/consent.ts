"use client";

import { readLocal, writeLocal } from "@/lib/browserStorage";

const CONSENT_KEY = "sofa-tracking-consent";

export type ConsentMode = "off" | "banner" | "strict";
export type ConsentAnswer = "granted" | "denied" | "unknown";

/**
 * Whether this visitor may be tracked by ad platforms.
 *
 * The owner picks the rule in the admin; this reads their answer against it:
 *  - off     no gate, everyone is tracked
 *  - banner  ask once, remember the answer
 *  - strict  ask every visit, never remember a yes
 *
 * Our own first-party events are recorded either way — they carry no
 * identifiers — but nothing reaches Meta or TikTok without a `granted`.
 */
export function readConsent(mode: ConsentMode): ConsentAnswer {
  if (mode === "off") return "granted";
  // Strict deliberately ignores the stored answer, so a remembered yes cannot
  // outlive the visit it was given in.
  if (mode === "strict") return "unknown";
  const stored = readLocal(CONSENT_KEY);
  if (stored === "granted" || stored === "denied") return stored;
  return "unknown";
}

export function writeConsent(answer: Exclude<ConsentAnswer, "unknown">): void {
  writeLocal(CONSENT_KEY, answer);
}

/** A stable per-visit id, used to tie events together without a login. */
export function sessionKey(): string {
  const KEY = "sofa-session-key";
  const existing = readLocal(KEY);
  if (existing) return existing;
  const minted = `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  writeLocal(KEY, minted);
  return minted;
}

/** Reads a first-party cookie the ad platforms set themselves (_fbp, _ttp). */
export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.split("; ").find(entry => entry.startsWith(`${name}=`));
  return match?.slice(name.length + 1);
}
