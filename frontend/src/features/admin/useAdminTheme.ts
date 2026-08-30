"use client";

import { useCallback, useEffect, useState } from "react";
import { readLocal, writeLocal } from "@/lib/browserStorage";

const THEME_KEY = "sfa-theme";

export type AdminTheme = "light" | "dark";

/**
 * The admin's own light/dark preference.
 *
 * Deliberately separate from the storefront `ThemeProvider`: the shop window is
 * always the warm cream brand, while whoever works in the back office all day
 * gets to choose. The value is applied as `data-theme` on the `.sfa` root, so
 * it can never reach a storefront page.
 */
export function useAdminTheme(): { theme: AdminTheme; toggle: () => void } {
  // Starts light on the server and on first paint, then adopts the stored
  // preference after mount — otherwise SSR and the client disagree.
  const [theme, setThemeState] = useState<AdminTheme>("light");

  useEffect(() => {
    const stored = readLocal(THEME_KEY);
    if (stored === "dark" || stored === "light") {
      setThemeState(stored);
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      setThemeState("dark");
    }
  }, []);

  const toggle = useCallback(() => {
    setThemeState(previous => {
      const next: AdminTheme = previous === "dark" ? "light" : "dark";
      writeLocal(THEME_KEY, next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
