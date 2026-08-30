"use client";

import { META_EVENT_NAMES, type AnalyticsEventName, type AnalyticsPayload } from "@shared/analytics/events";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: unknown };
    _fbq?: unknown;
  }
}

let loadedPixelId: string | null = null;

/**
 * Loads the Meta Pixel exactly once.
 *
 * The stub is Meta's own: it queues calls made before the script arrives, so an
 * event fired on the very first paint is not lost.
 */
export function loadMetaPixel(pixelId: string): void {
  if (typeof window === "undefined" || loadedPixelId === pixelId) return;
  loadedPixelId = pixelId;

  if (!window.fbq) {
    const stub = function (...args: unknown[]) {
      const self = stub as unknown as { callMethod?: (...a: unknown[]) => void; queue: unknown[] };
      if (self.callMethod) self.callMethod(...args);
      else self.queue.push(args);
    } as unknown as NonNullable<Window["fbq"]>;
    (stub as unknown as { queue: unknown[] }).queue = [];
    stub.loaded = true;
    stub.version = "2.0";
    window.fbq = stub;
    window._fbq = stub;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  // autoConfig off keeps Meta from firing its own button-click events, which
  // would double-count against the ones we send deliberately.
  window.fbq?.("set", "autoConfig", false, pixelId);
  window.fbq?.("init", pixelId);
}

export function trackMeta(
  event: AnalyticsEventName,
  payload: AnalyticsPayload,
  eventId: string,
): void {
  const name = META_EVENT_NAMES[event];
  if (!name || typeof window === "undefined" || !window.fbq) return;

  const custom: Record<string, unknown> = {};
  if (payload.value !== undefined) custom.value = payload.value;
  if (payload.currency) custom.currency = payload.currency;
  if (payload.searchTerm) custom.search_string = payload.searchTerm;
  if (payload.contentName) custom.content_name = payload.contentName;
  if (payload.contentCategory) custom.content_category = payload.contentCategory;
  if (payload.items?.length) {
    custom.content_type = "product";
    custom.content_ids = payload.items.map(item => item.id);
    custom.contents = payload.items.map(item => ({
      id: item.id,
      quantity: item.quantity ?? 1,
      item_price: item.price,
    }));
  }

  // eventID is what lets Meta merge this with the server-side copy.
  window.fbq("track", name, custom, { eventID: eventId });
}
