"use client";

import { GA4_EVENT_NAMES, type AnalyticsEventName, type AnalyticsPayload } from "@shared/analytics/events";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loadedMeasurementId: string | null = null;

/** Loads gtag.js once, for GA4 and optionally Google Ads conversions. */
export function loadGoogleTags(measurementId: string, adsConversionId?: string): void {
  if (typeof window === "undefined") return;
  const primaryId = measurementId || adsConversionId;
  if (!primaryId || loadedMeasurementId === primaryId) return;
  loadedMeasurementId = primaryId;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryId)}`;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  if (measurementId) window.gtag("config", measurementId);
  if (adsConversionId) window.gtag("config", adsConversionId);
}

export function trackGoogle(
  event: AnalyticsEventName,
  payload: AnalyticsPayload,
  options: { adsConversionId?: string; adsPurchaseLabel?: string } = {},
): void {
  const name = GA4_EVENT_NAMES[event];
  if (!name || typeof window === "undefined" || !window.gtag) return;

  const parameters: Record<string, unknown> = {};
  if (payload.value !== undefined) parameters.value = payload.value;
  if (payload.currency) parameters.currency = payload.currency;
  if (payload.searchTerm) parameters.search_term = payload.searchTerm;
  if (payload.orderId) parameters.transaction_id = payload.orderId;
  if (payload.items?.length) {
    parameters.items = payload.items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      price: item.price,
      quantity: item.quantity ?? 1,
    }));
  }

  window.gtag("event", name, parameters);

  // Google Ads counts a conversion only against a labelled send_to, which is
  // separate from the GA4 event above.
  if (event === "purchase" && options.adsConversionId && options.adsPurchaseLabel) {
    window.gtag("event", "conversion", {
      send_to: `${options.adsConversionId}/${options.adsPurchaseLabel}`,
      value: payload.value,
      currency: payload.currency,
      transaction_id: payload.orderId,
    });
  }
}
