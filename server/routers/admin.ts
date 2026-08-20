import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  adminAuditLogs,
  carts,
  contentPlacements,
  customerReminders,
  inquiries,
  orders,
  productReviews,
  productVariants,
  products,
  series,
  users,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { notifyOwner } from "../_core/notification";
import { adminProcedure, router } from "../_core/trpc";

const visibility = z.enum(["true", "false"]);
const productPayload = z.object({
  seriesId: z.number().int().positive(),
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(255),
  description: z.string().max(5000).nullable().optional(),
  startingPrice: z.number().int().nonnegative(),
  imageUrl: z.string().url().nullable().optional(),
  gallery: z.string().max(10000).nullable().optional(),
  isCustom: visibility.default("true"),
  isVisible: visibility.default("true"),
  isFeatured: visibility.default("false"),
  sortOrder: z.number().int().min(0).default(0),
});

const seriesPayload = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100),
  description: z.string().max(2000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  isVisible: visibility.default("true"),
  sortOrder: z.number().int().min(0).default(0),
});

const variantPayload = z.object({
  productId: z.number().int().positive(),
  name: z.string().min(2).max(255),
  price: z.number().int().nonnegative(),
  sku: z.string().max(100).nullable().optional(),
});

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The database is temporarily unavailable." });
  return db;
}

async function addAuditLog(db: Awaited<ReturnType<typeof getDb>>, adminUserId: number, action: string, entityType: string, entityId?: number, metadata?: Record<string, unknown>) {
  if (!db) return;
  await db.insert(adminAuditLogs).values({
    adminUserId,
    action,
    entityType,
    entityId,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

export const adminRouter = router({
  overview: adminProcedure.query(async () => {
    const db = await requireDb();
    const [productCount, orderCount, inquiryCount, reviewCount, activeCartCount, reminderCount] = await Promise.all([
      db.select({ value: sql<number>`count(*)` }).from(products),
      db.select({ value: sql<number>`count(*)` }).from(orders),
      db.select({ value: sql<number>`count(*)` }).from(inquiries),
      db.select({ value: sql<number>`count(*)` }).from(productReviews).where(eq(productReviews.status, "pending")),
      db.select({ value: sql<number>`count(*)` }).from(carts).where(eq(carts.status, "active")),
      db.select({ value: sql<number>`count(*)` }).from(customerReminders).where(eq(customerReminders.status, "draft")),
    ]);
    return {
      products: Number(productCount[0]?.value ?? 0),
      orders: Number(orderCount[0]?.value ?? 0),
      inquiries: Number(inquiryCount[0]?.value ?? 0),
      pendingReviews: Number(reviewCount[0]?.value ?? 0),
      activeCarts: Number(activeCartCount[0]?.value ?? 0),
      reminderDrafts: Number(reminderCount[0]?.value ?? 0),
    };
  }),

  listProducts: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(products).orderBy(products.sortOrder, products.name);
  }),
  createProduct: adminProcedure.input(productPayload).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const result = await db.insert(products).values(input);
    const id = Number(result[0].insertId);
    await addAuditLog(db, ctx.user.id, "product.created", "product", id, { name: input.name });
    return { id };
  }),
  updateProduct: adminProcedure.input(productPayload.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const { id, ...changes } = input;
    await db.update(products).set(changes).where(eq(products.id, id));
    await addAuditLog(db, ctx.user.id, "product.updated", "product", id, { name: changes.name });
    return { success: true };
  }),
  deleteProduct: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await db.delete(productVariants).where(eq(productVariants.productId, input.id));
    await db.delete(contentPlacements).where(and(eq(contentPlacements.entityType, "product"), eq(contentPlacements.entityId, input.id)));
    await db.delete(products).where(eq(products.id, input.id));
    await addAuditLog(db, ctx.user.id, "product.deleted", "product", input.id);
    return { success: true };
  }),

  listVariants: adminProcedure.input(z.object({ productId: z.number().int().positive().optional() }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    return input?.productId
      ? db.select().from(productVariants).where(eq(productVariants.productId, input.productId)).orderBy(productVariants.name)
      : db.select().from(productVariants).orderBy(productVariants.productId, productVariants.name);
  }),
  createVariant: adminProcedure.input(variantPayload).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const result = await db.insert(productVariants).values(input);
    const id = Number(result[0].insertId);
    await addAuditLog(db, ctx.user.id, "variant.created", "productVariant", id, { productId: input.productId, name: input.name });
    return { id };
  }),
  updateVariant: adminProcedure.input(variantPayload.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const { id, ...changes } = input;
    await db.update(productVariants).set(changes).where(eq(productVariants.id, id));
    await addAuditLog(db, ctx.user.id, "variant.updated", "productVariant", id, { productId: changes.productId, name: changes.name });
    return { success: true };
  }),
  deleteVariant: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await db.delete(productVariants).where(eq(productVariants.id, input.id));
    await addAuditLog(db, ctx.user.id, "variant.deleted", "productVariant", input.id);
    return { success: true };
  }),

  listSeries: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(series).orderBy(series.sortOrder, series.name);
  }),
  createSeries: adminProcedure.input(seriesPayload).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const result = await db.insert(series).values(input);
    const id = Number(result[0].insertId);
    await addAuditLog(db, ctx.user.id, "series.created", "series", id, { name: input.name });
    return { id };
  }),
  updateSeries: adminProcedure.input(seriesPayload.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const { id, ...changes } = input;
    await db.update(series).set(changes).where(eq(series.id, id));
    await addAuditLog(db, ctx.user.id, "series.updated", "series", id, { name: changes.name });
    return { success: true };
  }),
  deleteSeries: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const linkedProduct = await db.select({ id: products.id }).from(products).where(eq(products.seriesId, input.id)).limit(1);
    if (linkedProduct[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "Remove or reassign products in this series before deleting it." });
    await db.delete(contentPlacements).where(and(eq(contentPlacements.entityType, "series"), eq(contentPlacements.entityId, input.id)));
    await db.delete(series).where(eq(series.id, input.id));
    await addAuditLog(db, ctx.user.id, "series.deleted", "series", input.id);
    return { success: true };
  }),

  listPlacements: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(contentPlacements).orderBy(contentPlacements.slot, contentPlacements.sortOrder);
  }),
  savePlacement: adminProcedure.input(z.object({
    id: z.number().int().positive().optional(),
    slot: z.string().min(2).max(120),
    entityType: z.enum(["product", "series", "custom"]),
    entityId: z.number().int().positive().nullable().optional(),
    heading: z.string().max(255).nullable().optional(),
    subheading: z.string().max(3000).nullable().optional(),
    imageUrl: z.string().url().nullable().optional(),
    ctaLabel: z.string().max(120).nullable().optional(),
    ctaHref: z.string().max(255).nullable().optional(),
    sortOrder: z.number().int().min(0).default(0),
    isVisible: visibility.default("true"),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const { id, ...placement } = input;
    if (id) {
      await db.update(contentPlacements).set(placement).where(eq(contentPlacements.id, id));
      await addAuditLog(db, ctx.user.id, "placement.updated", "contentPlacement", id, { slot: placement.slot });
      return { id };
    }
    const result = await db.insert(contentPlacements).values(placement);
    const createdId = Number(result[0].insertId);
    await addAuditLog(db, ctx.user.id, "placement.created", "contentPlacement", createdId, { slot: placement.slot });
    return { id: createdId };
  }),
  deletePlacement: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await db.delete(contentPlacements).where(eq(contentPlacements.id, input.id));
    await addAuditLog(db, ctx.user.id, "placement.deleted", "contentPlacement", input.id);
    return { success: true };
  }),

  listOrders: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }),
  updateOrderStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]) })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await db.update(orders).set({ status: input.status }).where(eq(orders.id, input.id));
    await addAuditLog(db, ctx.user.id, "order.status_updated", "order", input.id, { status: input.status });
    return { success: true };
  }),
  listInquiries: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
  }),
  updateInquiryStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["new", "read", "replied"]) })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await db.update(inquiries).set({ status: input.status }).where(eq(inquiries.id, input.id));
    await addAuditLog(db, ctx.user.id, "inquiry.status_updated", "inquiry", input.id, { status: input.status });
    return { success: true };
  }),
  listReviews: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(productReviews).orderBy(desc(productReviews.createdAt));
  }),
  updateReviewStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "approved", "rejected"]) })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await db.update(productReviews).set({ status: input.status }).where(eq(productReviews.id, input.id));
    await addAuditLog(db, ctx.user.id, "review.status_updated", "productReview", input.id, { status: input.status });
    return { success: true };
  }),

  listCarts: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(carts).orderBy(desc(carts.updatedAt));
  }),
  listUsers: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(users).orderBy(desc(users.lastSignedIn));
  }),
  listReminders: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(customerReminders).orderBy(desc(customerReminders.createdAt));
  }),
  createReminderDraft: adminProcedure.input(z.object({
    cartId: z.number().int().positive().nullable().optional(),
    userId: z.number().int().positive().nullable().optional(),
    recipientEmail: z.string().email(),
    subject: z.string().min(3).max(255),
    message: z.string().min(5).max(5000),
    consentConfirmed: z.literal(true),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    if (input.cartId) {
      const matchedCart = await db.select().from(carts).where(and(eq(carts.id, input.cartId), eq(carts.reminderConsent, "true"))).limit(1);
      if (!matchedCart[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "A reminder can only be drafted for a cart with recorded reminder consent." });
    }
    const { consentConfirmed: _consentConfirmed, ...reminder } = input;
    const result = await db.insert(customerReminders).values({ ...reminder, createdBy: ctx.user.id, status: "draft" });
    const id = Number(result[0].insertId);
    await addAuditLog(db, ctx.user.id, "reminder.drafted", "customerReminder", id, { recipientEmail: input.recipientEmail });
    await notifyOwner({ title: "Customer reminder draft prepared", content: `A reminder draft for ${input.recipientEmail} is ready for delivery review in Sofa Co. Admin.` });
    return { id, status: "draft" as const };
  }),
  listAuditLogs: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(50);
  }),
});
