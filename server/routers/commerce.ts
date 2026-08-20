import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import { z } from "zod";
import { getDb } from "../db";
import { series, products, contentPlacements, carts, productReviews, customConfigurations, orders, inquiries, newsletterSubscribers } from "../../drizzle/schema";
import { and, eq, desc } from "drizzle-orm";
import { fallbackProductsForSeries, fallbackSeries, findFallbackProduct } from "../catalogFallback";

export const commerceRouter = router({
  getSeries: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return fallbackSeries;
    try {
      const rows = await db.select().from(series).where(eq(series.isVisible, "true")).orderBy(series.sortOrder, series.name);
      return rows.length > 0 ? rows : fallbackSeries;
    } catch (error) {
      console.warn("[Commerce] Series query unavailable; using catalog fallback.", error);
      return fallbackSeries;
    }
  }),

  getProducts: publicProcedure
    .input(z.object({ seriesId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return fallbackProductsForSeries(input?.seriesId);
      try {
        const rows = input?.seriesId
          ? await db.select().from(products).where(and(eq(products.isVisible, "true"), eq(products.seriesId, input.seriesId))).orderBy(products.sortOrder, products.name)
          : await db.select().from(products).where(eq(products.isVisible, "true")).orderBy(products.sortOrder, products.name);
        return rows.length > 0 ? rows : fallbackProductsForSeries(input?.seriesId);
      } catch (error) {
        console.warn("[Commerce] Products query unavailable; using catalog fallback.", error);
        return fallbackProductsForSeries(input?.seriesId);
      }
    }),

  getProductBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return findFallbackProduct(input.slug);
      try {
        const rows = await db.select().from(products).where(eq(products.isVisible, "true")).orderBy(products.sortOrder, products.name);
        const found = rows.find((p) => p.slug === input.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === input.slug || input.slug.includes(p.slug));
        return found || rows[0] || findFallbackProduct(input.slug);
      } catch (error) {
        console.warn("[Commerce] Product detail query unavailable; using catalog fallback.", error);
        return findFallbackProduct(input.slug);
      }
    }),

  getPlacements: publicProcedure
    .input(z.object({ slot: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      try {
        return input?.slot
          ? await db.select().from(contentPlacements).where(and(eq(contentPlacements.isVisible, "true"), eq(contentPlacements.slot, input.slot))).orderBy(contentPlacements.sortOrder)
          : await db.select().from(contentPlacements).where(eq(contentPlacements.isVisible, "true")).orderBy(contentPlacements.slot, contentPlacements.sortOrder);
      } catch (error) {
        console.warn("[Commerce] Content placements unavailable.", error);
        return [];
      }
    }),

  getApprovedReviews: publicProcedure
    .input(z.object({ productId: z.number().int().positive().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      try {
        return input?.productId
          ? await db.select().from(productReviews).where(and(eq(productReviews.productId, input.productId), eq(productReviews.status, "approved"))).orderBy(desc(productReviews.createdAt))
          : await db.select().from(productReviews).where(eq(productReviews.status, "approved")).orderBy(desc(productReviews.createdAt));
      } catch (error) {
        console.warn("[Commerce] Approved reviews unavailable.", error);
        return [];
      }
    }),

  trackCart: publicProcedure
    .input(z.object({
      sessionKey: z.string().min(8).max(160),
      itemsJson: z.string().max(20000),
      subtotal: z.number().int().nonnegative(),
      reminderConsent: z.enum(["true", "false"]).default("false"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { saved: false };
      try {
        const userId = ctx.user?.id ?? null;
        const existing = userId
          ? await db.select().from(carts).where(eq(carts.userId, userId)).limit(1)
          : await db.select().from(carts).where(eq(carts.sessionKey, input.sessionKey)).limit(1);
        const values = {
          sessionKey: input.sessionKey,
          customerEmail: ctx.user?.email ?? null,
          itemsJson: input.itemsJson,
          subtotal: input.subtotal,
          status: "active" as const,
          reminderConsent: input.reminderConsent,
        };
        if (existing[0]) {
          await db.update(carts).set(values).where(eq(carts.id, existing[0].id));
        } else {
          await db.insert(carts).values({ ...values, userId });
        }
        return { saved: true };
      } catch (error) {
        console.warn("[Commerce] Cart activity was not persisted.", error);
        return { saved: false };
      }
    }),

  saveConfiguration: publicProcedure
    .input(z.object({
      shape: z.string(),
      fabric: z.string(),
      colour: z.string(),
      size: z.string(),
      totalPrice: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const userId = ctx.user?.id || null;
      await db.insert(customConfigurations).values({
        userId,
        shape: input.shape,
        fabric: input.fabric,
        colour: input.colour,
        size: input.size,
        totalPrice: input.totalPrice,
      });
      return { success: true };
    }),

  createOrder: publicProcedure
    .input(z.object({
      customerName: z.string(),
      customerEmail: z.string(),
      shippingAddress: z.string(),
      itemsJson: z.string(),
      totalAmount: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const userId = ctx.user?.id || null;
      await db.insert(orders).values({
        userId,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        shippingAddress: input.shippingAddress,
        itemsJson: input.itemsJson,
        totalAmount: input.totalAmount,
        status: "pending",
      });
      return { success: true };
    }),

  submitInquiry: publicProcedure
    .input(z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string(),
      category: z.enum(["Residential", "Commercial", "Product Inquiry"]),
      message: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(inquiries).values({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        category: input.category,
        message: input.message,
      });
      return { success: true };
    }),

  subscribeNewsletter: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      try {
        await db.insert(newsletterSubscribers).values({ email: input.email });
        // Send owner notification
        await notifyOwner({
          title: "New Newsletter Subscriber",
          content: `New subscriber email: ${input.email}`,
        });
      } catch (e) {
        // already subscribed or notification error
      }
      return { success: true };
    }),

  getOrders: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(orders).where(eq(orders.userId, ctx.user.id)).orderBy(desc(orders.createdAt));
  }),

  getConfiguratorSaves: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(customConfigurations).where(eq(customConfigurations.userId, ctx.user.id)).orderBy(desc(customConfigurations.createdAt));
  }),
});

export type CommerceRouter = typeof commerceRouter;
