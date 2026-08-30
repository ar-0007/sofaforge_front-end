import { router, publicProcedure, protectedProcedure } from "../../core/trpc";
import { notifyOwner } from "../../core/notification";
import { z } from "zod";
import { getDb } from "../../db";
import { series, products, contentPlacements, carts, productReviews, customConfigurations, orders, inquiries, newsletterSubscribers } from "../../db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { fallbackProductsForSeries, fallbackSeries, findFallbackProduct } from "./catalog.fallback";
import { publicProductOptionsProcedure, publicStudioStepsProcedure } from "../catalog/productOptions.router";

export const commerceRouter = router({
  /**
   * The configurator questions for a product page: depth, material, cushion
   * style and whatever else the owner defined in the admin, each choice
   * carrying what it adds to the price.
   */
  getProductOptions: publicProductOptionsProcedure,

  /** The Custom Studio's steps, in the order the owner arranged them. */
  getStudioSteps: publicStudioStepsProcedure,

  /**
   * The shop's browse tree: top-level categories, each with the collections
   * inside it and how many products sit under each.
   *
   * The storefront renders categories first, then collections, then products —
   * so this is the one query that drives the whole browse path.
   */
  getCategoryTree: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      // Without a database the fallback catalogue is flat; present it as one
      // level rather than inventing a hierarchy that does not exist.
      return fallbackSeries.map(entry => ({
        id: entry.id,
        name: entry.name,
        slug: entry.slug,
        description: entry.description ?? null,
        imageUrl: entry.imageUrl ?? null,
        productCount: 0,
        children: [] as Array<{
          id: number;
          name: string;
          slug: string;
          description: string | null;
          imageUrl: string | null;
          productCount: number;
        }>,
      }));
    }

    try {
      const rows = await db
        .select()
        .from(series)
        .where(eq(series.isVisible, "true"))
        .orderBy(series.sortOrder, series.name);

      const counts = await db
        .select({ seriesId: products.seriesId, total: sql<number>`count(*)` })
        .from(products)
        .where(eq(products.isVisible, "true"))
        .groupBy(products.seriesId);
      const countBySeries = new Map(counts.map(row => [row.seriesId, Number(row.total)]));

      const shape = (row: (typeof rows)[number]) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        imageUrl: row.imageUrl,
        productCount: countBySeries.get(row.id) ?? 0,
      });

      const childrenByParent = new Map<number, ReturnType<typeof shape>[]>();
      for (const row of rows) {
        if (row.parentId === null) continue;
        const list = childrenByParent.get(row.parentId) ?? [];
        list.push(shape(row));
        childrenByParent.set(row.parentId, list);
      }

      return rows
        .filter(row => row.parentId === null)
        .map(row => {
          const children = childrenByParent.get(row.id) ?? [];
          return {
            ...shape(row),
            // A category's count includes everything beneath it, which is what
            // a shopper reads "Sectionals (14)" to mean.
            productCount: shape(row).productCount + children.reduce((sum, child) => sum + child.productCount, 0),
            children,
          };
        });
    } catch (error) {
      console.warn("[Commerce] Category tree unavailable.", error);
      return [];
    }
  }),

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
      const result = await db.insert(orders).values({
        userId,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        shippingAddress: input.shippingAddress,
        itemsJson: input.itemsJson,
        totalAmount: input.totalAmount,
        status: "pending",
      });
      // The id goes back so the storefront can name the order on its `purchase`
      // event. Meta and TikTok deduplicate a browser pixel against its server
      // copy by order id, so a purchase without one can be counted twice.
      return { success: true, orderId: Number(result[0].insertId) };
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
