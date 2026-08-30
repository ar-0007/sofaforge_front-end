import { META_EVENT_NAMES } from "@shared/analytics/events";
import type { SettingsMap } from "../../modules/settings/settings.service";
import { hashIdentifier, hashPhone } from "./hash";
import { dropEmpty, post } from "./transport";
import type { PixelDispatchResult, ServerEvent } from "./types";

const GRAPH_VERSION = "v21.0";

/**
 * Meta Conversions API.
 *
 * The browser pixel already reports most of this, but roughly a third of
 * shoppers block it. This is the server-side copy: it always arrives, it
 * carries hashed identifiers the browser cannot see, and it shares an
 * `event_id` with the browser event so Meta merges the two instead of
 * double-counting.
 */
export async function sendMetaEvent(
  settings: SettingsMap,
  event: ServerEvent,
): Promise<PixelDispatchResult | null> {
  const pixelId = settings["meta.pixelId"];
  const token = settings["meta.capiToken"];
  if (settings["meta.enabled"] !== "true" || !pixelId || !token) return null;

  const eventName = META_EVENT_NAMES[event.name];
  if (!eventName) return null;

  const userData = dropEmpty({
    em: hashIdentifier(event.user.email),
    ph: hashPhone(event.user.phone),
    external_id: hashIdentifier(event.user.externalId),
    client_ip_address: event.user.ip ?? undefined,
    client_user_agent: event.user.userAgent ?? undefined,
    fbp: event.user.fbp ?? undefined,
    fbc: event.user.fbc ?? undefined,
  });

  const { value, currency, items, searchTerm, orderId, contentName, contentCategory } = event.payload;
  const customData = dropEmpty({
    value,
    currency,
    order_id: orderId,
    search_string: searchTerm,
    content_name: contentName,
    content_category: contentCategory,
    content_type: items?.length ? "product" : undefined,
    content_ids: items?.map(item => item.id),
    contents: items?.map(item => ({ id: item.id, quantity: item.quantity ?? 1, item_price: item.price })),
  });

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: eventName,
        event_time: event.eventTime,
        event_id: event.eventId,
        event_source_url: event.sourceUrl,
        action_source: "website",
        user_data: userData,
        custom_data: customData,
      },
    ],
  };
  const testCode = settings["meta.testEventCode"];
  if (testCode) body.test_event_code = testCode;

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`;
  return post("meta", url, {}, body);
}

/**
 * Fires a throwaway event so the owner can confirm the connection from the
 * admin without waiting for a real shopper. Meta records it against the test
 * event code when one is set.
 */
export async function testMetaConnection(settings: SettingsMap): Promise<PixelDispatchResult> {
  if (!settings["meta.pixelId"]) return { provider: "meta", ok: false, message: "Add your Meta Pixel ID first." };
  if (!settings["meta.capiToken"]) return { provider: "meta", ok: false, message: "Add a Conversions API access token first." };

  const result = await sendMetaEvent(
    { ...settings, "meta.enabled": "true" },
    {
      name: "page_view",
      eventId: `admin-test-${Date.now()}`,
      eventTime: Math.floor(Date.now() / 1000),
      payload: {},
      user: {},
    },
  );
  return result ?? { provider: "meta", ok: false, message: "The test event could not be built from these settings." };
}
