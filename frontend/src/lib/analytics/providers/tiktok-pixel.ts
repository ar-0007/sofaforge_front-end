"use client";

import { TIKTOK_EVENT_NAMES, type AnalyticsEventName, type AnalyticsPayload } from "@shared/analytics/events";

type TikTokPixel = {
  page: () => void;
  track: (event: string, properties?: Record<string, unknown>, options?: Record<string, unknown>) => void;
  load: (pixelCode: string) => void;
  instance?: (pixelCode: string) => TikTokPixel;
};

declare global {
  interface Window {
    ttq?: TikTokPixel;
    TiktokAnalyticsObject?: string;
  }
}

let loadedPixelCode: string | null = null;

/**
 * Loads the TikTok Pixel once, using TikTok's queueing stub so calls made
 * before the script lands are replayed rather than dropped.
 */
export function loadTikTokPixel(pixelCode: string): void {
  if (typeof window === "undefined" || loadedPixelCode === pixelCode) return;
  loadedPixelCode = pixelCode;

  if (!window.ttq) {
    const methods = [
      "page",
      "track",
      "identify",
      "instances",
      "debug",
      "on",
      "off",
      "once",
      "ready",
      "alias",
      "group",
      "enableCookie",
      "disableCookie",
      "holdConsent",
      "revokeConsent",
      "grantConsent",
    ];
    const queue: unknown[][] = [];
    const stub = { _q: queue } as unknown as TikTokPixel & { _q: unknown[][] };
    for (const method of methods) {
      (stub as unknown as Record<string, unknown>)[method] = (...args: unknown[]) => {
        queue.push([method, ...args]);
        return stub;
      };
    }
    stub.load = (code: string) => {
      queue.push(["load", code]);
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(code)}&lib=ttq`;
      document.head.appendChild(script);
    };
    window.TiktokAnalyticsObject = "ttq";
    window.ttq = stub;
  }

  window.ttq?.load(pixelCode);
}

export function trackTikTok(
  event: AnalyticsEventName,
  payload: AnalyticsPayload,
  eventId: string,
): void {
  const name = TIKTOK_EVENT_NAMES[event];
  if (!name || typeof window === "undefined" || !window.ttq) return;

  if (event === "page_view") {
    window.ttq.page();
    return;
  }

  const properties: Record<string, unknown> = {};
  if (payload.value !== undefined) properties.value = payload.value;
  if (payload.currency) properties.currency = payload.currency;
  if (payload.searchTerm) properties.query = payload.searchTerm;
  if (payload.contentName) properties.content_name = payload.contentName;
  if (payload.contentCategory) properties.content_category = payload.contentCategory;
  if (payload.items?.length) {
    properties.content_type = "product";
    properties.contents = payload.items.map(item => ({
      content_id: item.id,
      content_name: item.name,
      price: item.price,
      quantity: item.quantity ?? 1,
    }));
  }

  // event_id pairs this with the Events API copy so TikTok de-duplicates.
  window.ttq.track(name, properties, { event_id: eventId });
}
