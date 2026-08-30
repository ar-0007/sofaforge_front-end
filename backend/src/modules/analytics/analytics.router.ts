import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { ANALYTICS_EVENTS, MAX_ANALYTICS_ITEMS } from "@shared/analytics/events";
import type { AnalyticsPayload } from "@shared/analytics/events";
import { getDb } from "../../db";
import { analyticsEvents, orders } from "../../db/schema";
import { sendMetaEvent } from "../../integrations/pixels/facebook-capi";
import { sendTikTokEvent } from "../../integrations/pixels/tiktok-events";
import type { ServerEvent } from "../../integrations/pixels/types";
import type { TrpcContext } from "../../core/context";
import { adminProcedure, publicProcedure, router } from "../../core/trpc";
import { readSettings } from "../settings/settings.service";

const itemInput = z.object({
  id: z.string().max(64),
  name: z.string().max(255).optional(),
  category: z.string().max(120).optional(),
  price: z.number().nonnegative().optional(),
  quantity: z.number().int().positive().max(999).optional(),
});

const trackInput = z.object({
  event: z.enum(ANALYTICS_EVENTS),
  /** Minted in the browser and sent to the browser pixel too, so the platform de-duplicates. */
  eventId: z.string().min(8).max(64),
  path: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
  sourceUrl: z.string().max(500).optional(),
  sessionKey: z.string().max(160).optional(),
  value: z.number().nonnegative().max(10_000_000).optional(),
  currency: z.string().max(8).optional(),
  items: z.array(itemInput).max(MAX_ANALYTICS_ITEMS).optional(),
  searchTerm: z.string().max(200).optional(),
  orderId: z.number().int().positive().optional(),
  contentName: z.string().max(255).optional(),
  contentCategory: z.string().max(120).optional(),
  /** Whether this visitor allowed ad platform tracking. */
  consent: z.boolean().default(false),
  /** First-party cookies the platforms use for attribution. */
  fbp: z.string().max(120).optional(),
  fbc: z.string().max(200).optional(),
  ttp: z.string().max(120).optional(),
  ttclid: z.string().max(200).optional(),
});

/**
 * A crude per-IP ceiling. `track` is unauthenticated by necessity — anonymous
 * shoppers are exactly who we need to measure — so this keeps a scripted client
 * from flooding either our table or the ad platforms' quota.
 */
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 120;
const recentByIp = new Map<string, { count: number; windowStart: number }>();

function withinRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = recentByIp.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    recentByIp.set(ip, { count: 1, windowStart: now });
    if (recentByIp.size > 5_000) {
      for (const [key, value] of recentByIp) {
        if (now - value.windowStart > RATE_WINDOW_MS) recentByIp.delete(key);
      }
    }
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT;
}

export const analyticsRouter = router({
  /**
   * One event in, every enabled destination out.
   *
   * Two rules keep this honest:
   *  - Identity never comes from the request body. The email is read from the
   *    session or from the order row, so a client cannot attach someone else's
   *    address to an event.
   *  - Purchase value is read from the order too. Otherwise anyone could post a
   *    fake conversion and corrupt the ad platform's optimisation.
   */
  track: publicProcedure.input(trackInput).mutation(async ({ ctx, input }) => {
    const ip = readClientIp(ctx.req);
    if (!withinRateLimit(ip)) return { accepted: false as const, reason: "rate-limited" as const };

    const db = await getDb();
    let value = input.value;
    let currency = input.currency;
    let email: string | null = ctx.user?.email ?? null;

    if (input.orderId && db) {
      const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
      // An unknown order id is dropped rather than forwarded: reporting a
      // purchase that did not happen is worse than missing one.
      if (!order) return { accepted: false as const, reason: "unknown-order" as const };
      value = order.totalAmount / 100;
      email = order.customerEmail;
    } else if (input.event === "purchase") {
      return { accepted: false as const, reason: "order-required" as const };
    }

    const settings = await readSettings();
    currency = currency || settings["checkout.currency"] || "CAD";

    // The first-party record is kept regardless of consent, but only ever with
    // what the visitor's own browsing implies — no identifiers.
    if (db) {
      try {
        await db.insert(analyticsEvents).values({
          eventName: input.event,
          eventId: input.eventId,
          userId: ctx.user?.id ?? null,
          sessionKey: input.sessionKey ?? null,
          path: input.path ?? null,
          referrer: input.referrer ?? null,
          value: value === undefined ? null : Math.round(value * 100),
          currency,
          payload: input.items?.length ? JSON.stringify(input.items) : null,
        });
      } catch (error) {
        console.warn("[Analytics] Event could not be stored.", error);
      }
    }

    if (!input.consent) return { accepted: true as const, forwarded: [] as string[] };

    const payload: AnalyticsPayload = {
      value,
      currency,
      items: input.items,
      searchTerm: input.searchTerm,
      orderId: input.orderId ? String(input.orderId) : undefined,
      contentName: input.contentName,
      contentCategory: input.contentCategory,
    };

    const serverEvent: ServerEvent = {
      name: input.event,
      eventId: input.eventId,
      eventTime: Math.floor(Date.now() / 1000),
      sourceUrl: input.sourceUrl ?? input.path,
      referrer: input.referrer,
      payload,
      user: {
        email,
        externalId: ctx.user ? String(ctx.user.id) : input.sessionKey ?? null,
        ip,
        userAgent: ctx.req.headers["user-agent"] ?? null,
        fbp: input.fbp,
        fbc: input.fbc,
        ttp: input.ttp,
        ttclid: input.ttclid,
      },
    };

    const results = await Promise.all([
      sendMetaEvent(settings, serverEvent),
      sendTikTokEvent(settings, serverEvent),
    ]);

    const forwarded: string[] = [];
    for (const result of results) {
      if (!result) continue;
      if (result.ok) forwarded.push(result.provider);
      else console.warn(`[Analytics] ${result.provider} rejected an event: ${result.message}`);
    }

    return { accepted: true as const, forwarded };
  }),

  /** Daily event counts behind the admin dashboard charts. */
  timeline: adminProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(30) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [] as Array<{ day: string; event: string; total: number }>;
      const days = input?.days ?? 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      try {
        const rows = await db
          .select({
            day: sql<string>`date(${analyticsEvents.createdAt})`,
            event: analyticsEvents.eventName,
            total: sql<number>`count(*)`,
          })
          .from(analyticsEvents)
          .where(gte(analyticsEvents.createdAt, since))
          .groupBy(sql`date(${analyticsEvents.createdAt})`, analyticsEvents.eventName);
        return rows.map(row => ({ day: String(row.day), event: row.event, total: Number(row.total) }));
      } catch (error) {
        console.warn("[Analytics] Timeline unavailable.", error);
        return [];
      }
    }),

  /** The last events received, so the owner can confirm tracking is alive. */
  recent: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(25) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      try {
        return await db
          .select()
          .from(analyticsEvents)
          .orderBy(desc(analyticsEvents.createdAt))
          .limit(input?.limit ?? 25);
      } catch (error) {
        console.warn("[Analytics] Recent events unavailable.", error);
        return [];
      }
    }),

  /**
   * How shoppers actually behave: which pages hold them, where they arrive
   * from, when they browse, and which products draw the most attention.
   *
   * All of it comes from our own event table, so it stays available whether or
   * not an ad platform is connected.
   */
  behaviour: adminProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(30) }).optional())
    .query(async ({ input }) => {
      const empty = {
        topPaths: [] as Array<{ path: string; views: number }>,
        sources: [] as Array<{ source: string; visits: number }>,
        hourly: [] as Array<{ hour: number; events: number }>,
        topProducts: [] as Array<{ id: string; name: string; views: number; addedToCart: number }>,
        sessions: 0,
        eventsPerSession: 0,
      };

      const db = await getDb();
      if (!db) return empty;
      const since = new Date(Date.now() - (input?.days ?? 30) * 24 * 60 * 60 * 1000);

      try {
        const [paths, referrers, hours, sessionCount, totalEvents, itemRows] = await Promise.all([
          db
            .select({ path: analyticsEvents.path, views: sql<number>`count(*)` })
            .from(analyticsEvents)
            .where(and(gte(analyticsEvents.createdAt, since), eq(analyticsEvents.eventName, "page_view")))
            .groupBy(analyticsEvents.path)
            .orderBy(desc(sql`count(*)`))
            .limit(12),
          db
            .select({ referrer: analyticsEvents.referrer, visits: sql<number>`count(*)` })
            .from(analyticsEvents)
            .where(and(gte(analyticsEvents.createdAt, since), eq(analyticsEvents.eventName, "page_view")))
            .groupBy(analyticsEvents.referrer),
          db
            .select({ hour: sql<number>`hour(${analyticsEvents.createdAt})`, events: sql<number>`count(*)` })
            .from(analyticsEvents)
            .where(gte(analyticsEvents.createdAt, since))
            .groupBy(sql`hour(${analyticsEvents.createdAt})`),
          db
            .select({ total: sql<number>`count(distinct ${analyticsEvents.sessionKey})` })
            .from(analyticsEvents)
            .where(gte(analyticsEvents.createdAt, since)),
          db
            .select({ total: sql<number>`count(*)` })
            .from(analyticsEvents)
            .where(gte(analyticsEvents.createdAt, since)),
          db
            .select({ eventName: analyticsEvents.eventName, payload: analyticsEvents.payload })
            .from(analyticsEvents)
            .where(
              and(
                gte(analyticsEvents.createdAt, since),
                inArray(analyticsEvents.eventName, ["view_item", "add_to_cart"]),
              ),
            )
            .limit(5000),
        ]);

        // Referrers arrive as full URLs. Grouping by host is what makes the
        // difference between "Instagram sends traffic" and a list of 400 URLs.
        const bySource = new Map<string, number>();
        for (const row of referrers) {
          const source = describeSource(row.referrer);
          bySource.set(source, (bySource.get(source) ?? 0) + Number(row.visits));
        }

        // Item detail lives in a JSON column, so the roll-up happens here
        // rather than in SQL that would differ per database engine.
        const productStats = new Map<string, { name: string; views: number; addedToCart: number }>();
        for (const row of itemRows) {
          for (const item of parseItems(row.payload)) {
            const entry = productStats.get(item.id) ?? { name: item.name ?? item.id, views: 0, addedToCart: 0 };
            if (item.name) entry.name = item.name;
            if (row.eventName === "view_item") entry.views += 1;
            else entry.addedToCart += 1;
            productStats.set(item.id, entry);
          }
        }

        const sessions = Number(sessionCount[0]?.total ?? 0);
        const events = Number(totalEvents[0]?.total ?? 0);

        return {
          topPaths: paths.map(row => ({ path: row.path ?? "(unknown)", views: Number(row.views) })),
          sources: [...bySource.entries()]
            .map(([source, visits]) => ({ source, visits }))
            .sort((a, b) => b.visits - a.visits)
            .slice(0, 8),
          // Every hour is present, so a quiet 3am reads as quiet rather than missing.
          hourly: Array.from({ length: 24 }, (_, hour) => ({
            hour,
            events: Number(hours.find(row => Number(row.hour) === hour)?.events ?? 0),
          })),
          topProducts: [...productStats.entries()]
            .map(([id, stats]) => ({ id, ...stats }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10),
          sessions,
          eventsPerSession: sessions === 0 ? 0 : Number((events / sessions).toFixed(1)),
        };
      } catch (error) {
        console.warn("[Analytics] Behaviour report unavailable.", error);
        return empty;
      }
    }),

  /** Conversion funnel over the window, in the order a shopper walks it. */
  funnel: adminProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(30) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const steps = ["page_view", "view_item", "add_to_cart", "begin_checkout", "purchase"] as const;
      if (!db) return steps.map(step => ({ step, total: 0 }));
      const since = new Date(Date.now() - (input?.days ?? 30) * 24 * 60 * 60 * 1000);
      try {
        const rows = await db
          .select({ event: analyticsEvents.eventName, total: sql<number>`count(*)` })
          .from(analyticsEvents)
          .where(and(gte(analyticsEvents.createdAt, since)))
          .groupBy(analyticsEvents.eventName);
        const byEvent = new Map(rows.map(row => [row.event, Number(row.total)]));
        return steps.map(step => ({ step, total: byEvent.get(step) ?? 0 }));
      } catch (error) {
        console.warn("[Analytics] Funnel unavailable.", error);
        return steps.map(step => ({ step, total: 0 }));
      }
    }),
});

/** Groups referrer URLs by where the visitor actually came from. */
function describeSource(referrer: string | null): string {
  if (!referrer) return "Direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host.includes("facebook") || host.includes("fb.")) return "Facebook";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("tiktok")) return "TikTok";
    if (host.includes("google")) return "Google";
    if (host.includes("pinterest")) return "Pinterest";
    if (host.includes("bing")) return "Bing";
    return host;
  } catch {
    return "Direct";
  }
}

/** Item detail is stored as a JSON string; a malformed row is skipped, not fatal. */
function parseItems(payload: string | null): Array<{ id: string; name?: string }> {
  if (!payload) return [];
  try {
    const parsed: unknown = JSON.parse(payload);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is { id: string; name?: string } =>
        Boolean(item) && typeof item === "object" && typeof (item as { id?: unknown }).id === "string",
    );
  } catch {
    return [];
  }
}

/**
 * The proxy in front of the API rewrites the socket address, so the shopper's
 * real IP is only in the forwarding header. Meta and TikTok both use it for
 * match quality, and a wrong one is worse than none.
 */
function readClientIp(req: TrpcContext["req"]): string {
  const forwarded = req.headers["x-forwarded-for"];
  const firstHop = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof firstHop === "string" && firstHop.length > 0) {
    const first = firstHop.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}
