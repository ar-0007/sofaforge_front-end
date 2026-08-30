import { TIKTOK_EVENT_NAMES } from "@shared/analytics/events";
import type { SettingsMap } from "../../modules/settings/settings.service";
import { hashIdentifier, hashPhone } from "./hash";
import { dropEmpty, post } from "./transport";
import type { PixelDispatchResult, ServerEvent } from "./types";

const EVENTS_API_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

/**
 * TikTok Events API.
 *
 * Same idea as Meta's CAPI: a server-side copy of the browser event, sharing
 * `event_id` so TikTok de-duplicates rather than counting a conversion twice.
 */
export async function sendTikTokEvent(
  settings: SettingsMap,
  event: ServerEvent,
): Promise<PixelDispatchResult | null> {
  const pixelCode = settings["tiktok.pixelCode"];
  const token = settings["tiktok.accessToken"];
  if (settings["tiktok.enabled"] !== "true" || !pixelCode || !token) return null;

  const eventName = TIKTOK_EVENT_NAMES[event.name];
  if (!eventName) return null;

  const user = dropEmpty({
    email: hashIdentifier(event.user.email),
    phone: hashPhone(event.user.phone),
    external_id: hashIdentifier(event.user.externalId),
    ip: event.user.ip ?? undefined,
    user_agent: event.user.userAgent ?? undefined,
    ttp: event.user.ttp ?? undefined,
    ttclid: event.user.ttclid ?? undefined,
  });

  const { value, currency, items, searchTerm, orderId, contentName, contentCategory } = event.payload;
  const properties = dropEmpty({
    value,
    currency,
    order_id: orderId,
    query: searchTerm,
    content_type: items?.length ? "product" : undefined,
    contents: items?.map(item => ({
      content_id: item.id,
      content_name: item.name,
      content_category: item.category,
      price: item.price,
      quantity: item.quantity ?? 1,
    })),
    content_name: contentName,
    content_category: contentCategory,
  });

  const body: Record<string, unknown> = {
    event_source: "web",
    event_source_id: pixelCode,
    data: [
      dropEmpty({
        event: eventName,
        event_time: event.eventTime,
        event_id: event.eventId,
        user,
        page: dropEmpty({ url: event.sourceUrl, referrer: event.referrer }),
        properties,
      }),
    ],
  };
  const testCode = settings["tiktok.testEventCode"];
  if (testCode) body.test_event_code = testCode;

  return post("tiktok", EVENTS_API_URL, { "Access-Token": token }, body);
}

/** Confirms the pixel code and token pair from the admin, without a shopper. */
export async function testTikTokConnection(settings: SettingsMap): Promise<PixelDispatchResult> {
  if (!settings["tiktok.pixelCode"]) return { provider: "tiktok", ok: false, message: "Add your TikTok pixel code first." };
  if (!settings["tiktok.accessToken"]) return { provider: "tiktok", ok: false, message: "Add an Events API access token first." };

  const result = await sendTikTokEvent(
    { ...settings, "tiktok.enabled": "true" },
    {
      name: "page_view",
      eventId: `admin-test-${Date.now()}`,
      eventTime: Math.floor(Date.now() / 1000),
      payload: {},
      user: {},
    },
  );
  return result ?? { provider: "tiktok", ok: false, message: "The test event could not be built from these settings." };
}
