"use client";

import { trpc } from "@/lib/trpc";

/**
 * Prices are stored in minor units everywhere (an int, never a float), so the
 * only place that divides by 100 is here. The symbol comes from settings, so
 * changing currency in the admin changes every figure in the back office.
 */
export function useMoney() {
  const settings = trpc.settings.public.useQuery(undefined, { staleTime: 5 * 60_000, retry: false });
  const symbol = settings.data?.["checkout.currencySymbol"] ?? "$";
  const currency = settings.data?.["checkout.currency"] ?? "CAD";

  const format = (minorUnits: number | null | undefined) => {
    if (minorUnits === null || minorUnits === undefined) return "—";
    const major = minorUnits / 100;
    return `${symbol}${major.toLocaleString(undefined, { minimumFractionDigits: major % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
  };

  /** Compact form for stat tiles: $12.4k rather than $12,430. */
  const formatCompact = (minorUnits: number | null | undefined) => {
    if (minorUnits === null || minorUnits === undefined) return "—";
    const major = minorUnits / 100;
    if (Math.abs(major) >= 1_000_000) return `${symbol}${(major / 1_000_000).toFixed(1)}M`;
    if (Math.abs(major) >= 10_000) return `${symbol}${(major / 1000).toFixed(1)}k`;
    return format(minorUnits);
  };

  return { symbol, currency, format, formatCompact };
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function relativeTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

/** "Sunlit Ivory Sofa" -> "sunlit-ivory-sofa", for slug fields that auto-fill. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function parseGallery(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    // Older rows stored newline-separated URLs rather than JSON.
    return raw.split("\n").map(line => line.trim()).filter(Boolean);
  }
}

/**
 * Whether the admin has a live database behind it.
 *
 * Every screen degrades the same way: controls stay visible and explained, but
 * refuse to pretend they saved something. Pass the queries a screen depends on.
 */
export function databaseIsReady(queries: Array<{ data?: unknown; error?: unknown }>): boolean {
  return queries.every(query => query.data !== undefined && !query.error);
}

export const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_TONE: Record<OrderStatus, "neutral" | "success" | "warning" | "danger" | "info" | "accent"> = {
  pending: "warning",
  processing: "info",
  shipped: "accent",
  delivered: "success",
  cancelled: "danger",
};
