/**
 * SSR-safe wrappers around Web Storage.
 *
 * Under Next.js these modules also render on the server, where `localStorage`
 * and `sessionStorage` do not exist. Every access goes through here so a render
 * on the server degrades to a no-op instead of throwing.
 */

const canUse = (store: "localStorage" | "sessionStorage") => {
  if (typeof window === "undefined") return null;
  try {
    return window[store];
  } catch {
    return null;
  }
};

export function readLocal(key: string): string | null {
  try {
    return canUse("localStorage")?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string): void {
  try {
    canUse("localStorage")?.setItem(key, value);
  } catch {
    // storage full, disabled, or unavailable — non-fatal
  }
}

export function readSession(key: string): string | null {
  try {
    return canUse("sessionStorage")?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function removeSession(key: string): void {
  try {
    canUse("sessionStorage")?.removeItem(key);
  } catch {
    // non-fatal
  }
}
