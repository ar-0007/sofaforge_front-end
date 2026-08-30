"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { AnalyticsEventName, AnalyticsPayload } from "@shared/analytics/events";
import { trpc } from "@/lib/trpc";
import { readConsent, readCookie, sessionKey, writeConsent, type ConsentAnswer, type ConsentMode } from "./consent";
import { loadMetaPixel, trackMeta } from "./providers/facebook-pixel";
import { loadTikTokPixel, trackTikTok } from "./providers/tiktok-pixel";
import { loadGoogleTags, trackGoogle } from "./providers/ga4";

type TrackFn = (event: AnalyticsEventName, payload?: AnalyticsPayload) => void;

type TrackingContextValue = {
  track: TrackFn;
  consent: ConsentAnswer;
  consentMode: ConsentMode;
  grantConsent: () => void;
  denyConsent: () => void;
  bannerText: string;
  privacyUrl?: string;
};

const TrackingContext = createContext<TrackingContextValue | null>(null);

/** A per-event id shared by the browser pixel and the server copy. */
function mintEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `e_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/**
 * One `track()` for the whole storefront.
 *
 * A call fans out to every enabled browser pixel and, in parallel, to our own
 * backend — which forwards the same event to Meta's Conversions API and
 * TikTok's Events API carrying the same event id. The platforms merge the pair,
 * so a conversion still lands when an ad blocker kills the browser copy.
 *
 * Which platforms are on comes from the admin's saved settings, not from a
 * build-time environment variable, so connecting a pixel needs no redeploy.
 */
export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const settings = trpc.settings.public.useQuery(undefined, { staleTime: 5 * 60_000, retry: false });
  const trackMutation = trpc.analytics.track.useMutation();
  const pathname = usePathname() ?? "/";

  const values = settings.data ?? {};
  const consentMode = (values["consent.mode"] as ConsentMode) ?? "banner";

  const [consent, setConsent] = useState<ConsentAnswer>("unknown");

  // Consent is read after mount: it lives in localStorage, which the server
  // render cannot see without the two disagreeing.
  useEffect(() => {
    setConsent(readConsent(consentMode));
  }, [consentMode]);

  const allowed = consent === "granted";

  // Pixels only load once the visitor has actually allowed it. Loading the
  // script itself already sets cookies, so this has to gate the load, not just
  // the events.
  useEffect(() => {
    if (!allowed) return;
    if (values["meta.enabled"] === "true" && values["meta.pixelId"]) loadMetaPixel(values["meta.pixelId"]);
    if (values["tiktok.enabled"] === "true" && values["tiktok.pixelCode"]) loadTikTokPixel(values["tiktok.pixelCode"]);
    if (values["google.enabled"] === "true") {
      loadGoogleTags(values["google.ga4MeasurementId"] ?? "", values["google.adsConversionId"]);
    }
  }, [allowed, values]);

  const track = useCallback<TrackFn>(
    (event, payload = {}) => {
      const eventId = mintEventId();
      const currency = payload.currency ?? values["checkout.currency"] ?? "CAD";
      const enriched: AnalyticsPayload = { ...payload, currency };

      if (allowed) {
        if (values["meta.enabled"] === "true") trackMeta(event, enriched, eventId);
        if (values["tiktok.enabled"] === "true") trackTikTok(event, enriched, eventId);
        if (values["google.enabled"] === "true") {
          trackGoogle(event, enriched, {
            adsConversionId: values["google.adsConversionId"],
            adsPurchaseLabel: values["google.adsPurchaseLabel"],
          });
        }
      }

      // The server copy is sent either way. Without consent it is stored as a
      // first-party record only and is never forwarded to an ad platform —
      // the backend enforces that, not this call.
      trackMutation.mutate(
        {
          event,
          eventId,
          path: pathname,
          sourceUrl: typeof window === "undefined" ? undefined : window.location.href,
          referrer: typeof document === "undefined" ? undefined : document.referrer || undefined,
          sessionKey: sessionKey(),
          value: enriched.value,
          currency,
          items: enriched.items,
          searchTerm: enriched.searchTerm,
          orderId: enriched.orderId ? Number(enriched.orderId) : undefined,
          contentName: enriched.contentName,
          contentCategory: enriched.contentCategory,
          consent: allowed,
          fbp: readCookie("_fbp"),
          fbc: readCookie("_fbc"),
          ttp: readCookie("_ttp"),
        },
        {
          // Tracking must never surface an error to a shopper mid-checkout.
          onError: error => console.warn("[Analytics] Event not recorded.", error),
        },
      );
    },
    [allowed, pathname, trackMutation, values],
  );

  // One page_view per path. The ref stops React's double-invoked effects in
  // development from reporting every page twice.
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (settings.isLoading) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    track("page_view");
  }, [pathname, settings.isLoading, track]);

  const context = useMemo<TrackingContextValue>(
    () => ({
      track,
      consent,
      consentMode,
      grantConsent: () => {
        writeConsent("granted");
        setConsent("granted");
      },
      denyConsent: () => {
        writeConsent("denied");
        setConsent("denied");
      },
      bannerText:
        values["consent.bannerText"] ??
        "We use cookies to measure how our campaigns perform. You can decline and still use the whole store.",
      privacyUrl: values["consent.privacyUrl"],
    }),
    [track, consent, consentMode, values],
  );

  return <TrackingContext.Provider value={context}>{children}</TrackingContext.Provider>;
}

/**
 * Storefront components call this to report what a shopper did.
 *
 * Safe outside the provider: it returns a no-op tracker rather than throwing,
 * so a component can be rendered in a test or in the admin without wiring
 * analytics first.
 */
export function useTracking(): TrackingContextValue {
  return (
    useContext(TrackingContext) ?? {
      track: () => {},
      consent: "unknown",
      consentMode: "banner",
      grantConsent: () => {},
      denyConsent: () => {},
      bannerText: "",
    }
  );
}
