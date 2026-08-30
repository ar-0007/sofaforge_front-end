import type { AnalyticsEventName, AnalyticsPayload } from "@shared/analytics/events";

/**
 * What a server-side pixel needs to send one event. Assembled once in the
 * analytics router and handed to every enabled provider unchanged.
 */
export type ServerEvent = {
  name: AnalyticsEventName;
  /** Shared with the browser pixel so the platform de-duplicates the pair. */
  eventId: string;
  /** Unix seconds. */
  eventTime: number;
  sourceUrl?: string;
  referrer?: string;
  payload: AnalyticsPayload;
  user: {
    email?: string | null;
    phone?: string | null;
    externalId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    /** Meta browser cookies, forwarded from the client when present. */
    fbp?: string | null;
    fbc?: string | null;
    /** TikTok's browser cookie. */
    ttp?: string | null;
    ttclid?: string | null;
  };
};

export type PixelDispatchResult = {
  provider: "meta" | "tiktok";
  ok: boolean;
  /** Present when the platform rejected the event; safe to show an admin. */
  message?: string;
};
