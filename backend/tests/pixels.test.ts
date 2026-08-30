import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMetaEvent } from "../src/integrations/pixels/facebook-capi";
import { sendTikTokEvent } from "../src/integrations/pixels/tiktok-events";
import { hashIdentifier, hashPhone } from "../src/integrations/pixels/hash";
import type { ServerEvent } from "../src/integrations/pixels/types";

const baseEvent: ServerEvent = {
  name: "purchase",
  eventId: "evt-123",
  eventTime: 1_700_000_000,
  sourceUrl: "https://sofaco.example/checkout",
  payload: { value: 4299.5, currency: "CAD", orderId: "18", items: [{ id: "sku-1", quantity: 2, price: 2149.75 }] },
  user: { email: "  Shopper@Example.COM ", phone: "+1 (604) 555-0100", ip: "203.0.113.9", userAgent: "Mozilla/5.0" },
};

const liveMeta = { "meta.enabled": "true", "meta.pixelId": "1234567890123456", "meta.capiToken": "token-abc" };
const liveTikTok = { "tiktok.enabled": "true", "tiktok.pixelCode": "C1A2B3C4D5", "tiktok.accessToken": "token-xyz" };

type FetchInit = { headers: Record<string, string>; body: string };

function stubFetch(response: { ok?: boolean; status?: number; body?: unknown } = {}) {
  const spy = vi.fn(async (_url: string, _init: FetchInit) => ({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    text: async () => JSON.stringify(response.body ?? { events_received: 1 }),
  }));
  vi.stubGlobal("fetch", spy);
  return spy;
}

type SentBody = {
  test_event_code?: string;
  event_source?: string;
  data: Array<{
    event?: string;
    event_name?: string;
    event_id?: string;
    action_source?: string;
    user?: { email?: string };
  }>;
};

/** The JSON body of the nth call, already parsed. */
function bodyOf(spy: ReturnType<typeof stubFetch>, index = 0): SentBody {
  return JSON.parse(spy.mock.calls[index]![1].body) as SentBody;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hashing", () => {
  it("normalises before hashing, so casing and spacing cannot split one person into two", () => {
    expect(hashIdentifier(" Shopper@Example.COM ")).toBe(hashIdentifier("shopper@example.com"));
  });

  it("strips punctuation from phone numbers", () => {
    expect(hashPhone("+1 (604) 555-0100")).toBe(hashPhone("16045550100"));
  });

  it("returns undefined rather than hashing nothing", () => {
    expect(hashIdentifier("")).toBeUndefined();
    expect(hashIdentifier(null)).toBeUndefined();
    expect(hashPhone("---")).toBeUndefined();
  });
});

describe("Meta Conversions API", () => {
  it("stays silent when the platform is not switched on", async () => {
    const spy = stubFetch();
    const result = await sendMetaEvent({ ...liveMeta, "meta.enabled": "false" }, baseEvent);
    expect(result).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("stays silent without a token, rather than sending an unauthenticated request", async () => {
    const spy = stubFetch();
    expect(await sendMetaEvent({ ...liveMeta, "meta.capiToken": "" }, baseEvent)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("never puts a raw email or phone number on the wire", async () => {
    const spy = stubFetch();
    await sendMetaEvent(liveMeta, baseEvent);
    const body = spy.mock.calls[0]![1].body;
    expect(body).not.toContain("shopper@example.com");
    expect(body).not.toContain("6045550100");
    expect(body).toContain(hashIdentifier("shopper@example.com"));
  });

  it("sends the shared event id so Meta can de-duplicate against the browser pixel", async () => {
    const spy = stubFetch();
    await sendMetaEvent(liveMeta, baseEvent);
    const body = bodyOf(spy);
    expect(body.data[0].event_id).toBe("evt-123");
    expect(body.data[0].event_name).toBe("Purchase");
    expect(body.data[0].action_source).toBe("website");
  });

  it("includes a test event code only while one is configured", async () => {
    const withCode = stubFetch();
    await sendMetaEvent({ ...liveMeta, "meta.testEventCode": "TEST123" }, baseEvent);
    expect(bodyOf(withCode).test_event_code).toBe("TEST123");

    vi.unstubAllGlobals();
    const withoutCode = stubFetch();
    await sendMetaEvent(liveMeta, baseEvent);
    expect(bodyOf(withoutCode).test_event_code).toBeUndefined();
  });

  it("skips events Meta has no equivalent for", async () => {
    const spy = stubFetch();
    expect(await sendMetaEvent(liveMeta, { ...baseEvent, name: "remove_from_cart" })).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("reports a rejection instead of throwing, so a checkout is never taken down by tracking", async () => {
    stubFetch({ ok: false, status: 400, body: { error: { message: "Invalid access token" } } });
    const result = await sendMetaEvent(liveMeta, baseEvent);
    expect(result).toEqual({ provider: "meta", ok: false, message: "Invalid access token" });
  });

  it("survives a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    const result = await sendMetaEvent(liveMeta, baseEvent);
    expect(result?.ok).toBe(false);
  });
});

describe("TikTok Events API", () => {
  it("authenticates with the Access-Token header, not a query string", async () => {
    const spy = stubFetch({ body: { code: 0 } });
    await sendTikTokEvent(liveTikTok, baseEvent);
    const [url, init] = spy.mock.calls[0]!;
    expect(url).not.toContain("token-xyz");
    expect(init.headers["Access-Token"]).toBe("token-xyz");
  });

  it("maps purchase to CompletePayment and carries the shared event id", async () => {
    const spy = stubFetch({ body: { code: 0 } });
    await sendTikTokEvent(liveTikTok, baseEvent);
    const body = bodyOf(spy);
    expect(body.event_source).toBe("web");
    expect(body.data[0].event).toBe("CompletePayment");
    expect(body.data[0].event_id).toBe("evt-123");
  });

  it("hashes identifiers the same way Meta requires", async () => {
    const spy = stubFetch({ body: { code: 0 } });
    await sendTikTokEvent(liveTikTok, baseEvent);
    const body = bodyOf(spy);
    expect(body.data[0].user?.email).toBe(hashIdentifier("shopper@example.com"));
    expect(spy.mock.calls[0]![1].body).not.toContain("shopper@example.com");
  });

  it("treats a non-zero code in a 200 response as the rejection it is", async () => {
    stubFetch({ ok: true, status: 200, body: { code: 40001, message: "Invalid pixel code" } });
    const result = await sendTikTokEvent(liveTikTok, baseEvent);
    expect(result).toEqual({ provider: "tiktok", ok: false, message: "Invalid pixel code" });
  });
});
