import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const series = mysqlTable("series", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  isVisible: mysqlEnum("isVisible", ["true", "false"]).default("true").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  seriesId: int("seriesId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  startingPrice: int("startingPrice").notNull(),
  imageUrl: text("imageUrl"),
  gallery: text("gallery"),
  isCustom: mysqlEnum("isCustom", ["true", "false"]).default("true").notNull(),
  isVisible: mysqlEnum("isVisible", ["true", "false"]).default("true").notNull(),
  isFeatured: mysqlEnum("isFeatured", ["true", "false"]).default("false").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const productVariants = mysqlTable("productVariants", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  price: int("price").notNull(),
  sku: varchar("sku", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const customConfigurations = mysqlTable("customConfigurations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  shape: varchar("shape", { length: 100 }).notNull(),
  fabric: varchar("fabric", { length: 100 }).notNull(),
  colour: varchar("colour", { length: 100 }).notNull(),
  size: varchar("size", { length: 100 }).notNull(),
  totalPrice: int("totalPrice").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  shippingAddress: text("shippingAddress").notNull(),
  itemsJson: text("itemsJson").notNull(),
  totalAmount: int("totalAmount").notNull(),
  status: mysqlEnum("status", ["pending", "processing", "shipped", "delivered", "cancelled"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const inquiries = mysqlTable("inquiries", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  category: mysqlEnum("category", ["Residential", "Commercial", "Product Inquiry"]).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["new", "read", "replied"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const newsletterSubscribers = mysqlTable("newsletterSubscribers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const contentPlacements = mysqlTable("contentPlacements", {
  id: int("id").autoincrement().primaryKey(),
  slot: varchar("slot", { length: 120 }).notNull(),
  entityType: mysqlEnum("entityType", ["product", "series", "custom"]).notNull(),
  entityId: int("entityId"),
  heading: varchar("heading", { length: 255 }),
  subheading: text("subheading"),
  imageUrl: text("imageUrl"),
  ctaLabel: varchar("ctaLabel", { length: 120 }),
  ctaHref: varchar("ctaHref", { length: 255 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  isVisible: mysqlEnum("isVisible", ["true", "false"]).default("true").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const productReviews = mysqlTable("productReviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  userId: int("userId"),
  authorName: varchar("authorName", { length: 160 }).notNull(),
  rating: int("rating").notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  verifiedPurchase: mysqlEnum("verifiedPurchase", ["true", "false"]).default("false").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const carts = mysqlTable("carts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  sessionKey: varchar("sessionKey", { length: 160 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  itemsJson: text("itemsJson").notNull(),
  subtotal: int("subtotal").default(0).notNull(),
  status: mysqlEnum("status", ["active", "converted", "abandoned"]).default("active").notNull(),
  reminderConsent: mysqlEnum("reminderConsent", ["true", "false"]).default("false").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const customerReminders = mysqlTable("customerReminders", {
  id: int("id").autoincrement().primaryKey(),
  cartId: int("cartId"),
  userId: int("userId"),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  channel: mysqlEnum("channel", ["email", "internal"]).default("email").notNull(),
  status: mysqlEnum("status", ["draft", "queued", "sent", "failed"]).default("draft").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  sentAt: timestamp("sentAt"),
});

export const adminAuditLogs = mysqlTable("adminAuditLogs", {
  id: int("id").autoincrement().primaryKey(),
  adminUserId: int("adminUserId").notNull(),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entityType", { length: 120 }).notNull(),
  entityId: int("entityId"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Series = typeof series.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type CustomConfiguration = typeof customConfigurations.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type ContentPlacement = typeof contentPlacements.$inferSelect;
export type ProductReview = typeof productReviews.$inferSelect;
export type Cart = typeof carts.$inferSelect;
export type CustomerReminder = typeof customerReminders.$inferSelect;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
