"use client";

import React, { FormEvent, useMemo, useState } from "react";
import DashboardLayout, { type DashboardMenuItem } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { prepareReminderDraft, submitReminderDraft } from "@/lib/adminReminder";
import { toast } from "sonner";
import { Boxes, ClipboardList, LayoutDashboard, MessageSquareText, PackageOpen, Plus, RefreshCw, Send, ShoppingCart, Star, UsersRound } from "lucide-react";

const adminMenu: DashboardMenuItem[] = [
  { icon: LayoutDashboard, label: "Admin centre", path: "/admin" },
  { icon: PackageOpen, label: "View storefront", path: "/" },
];

type ProductForm = { id?: number; seriesId: number; name: string; slug: string; description: string; startingPrice: number; imageUrl: string; gallery: string; isCustom: "true" | "false"; isVisible: "true" | "false"; isFeatured: "true" | "false"; sortOrder: number };
type SeriesForm = { id?: number; name: string; slug: string; description: string; imageUrl: string; isVisible: "true" | "false"; sortOrder: number };
type VariantForm = { id?: number; productId: number; name: string; price: number; sku: string };
const blankProduct: ProductForm = { id: undefined, seriesId: 1, name: "", slug: "", description: "", startingPrice: 0, imageUrl: "", gallery: "", isCustom: "true", isVisible: "true", isFeatured: "false", sortOrder: 0 };
const blankSeries: SeriesForm = { id: undefined, name: "", slug: "", description: "", imageUrl: "", isVisible: "true", sortOrder: 0 };
const blankVariant: VariantForm = { id: undefined, productId: 1, name: "", price: 0, sku: "" };
type PlacementForm = { id?: number; slot: string; entityType: "product" | "series" | "custom"; entityId?: number; heading: string; subheading: string; imageUrl: string; ctaLabel: string; ctaHref: string; sortOrder: number; isVisible: "true" | "false" };
const blankPlacement: PlacementForm = { id: undefined, slot: "home.featured", entityType: "product", entityId: undefined, heading: "", subheading: "", imageUrl: "", ctaLabel: "", ctaHref: "", sortOrder: 0, isVisible: "true" };

function formatCurrency(cents: number) { return `$${(cents / 100).toLocaleString()}`; }
function formatDate(value: Date | string) { return new Date(value).toLocaleDateString(); }

export default function AdminPanel() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = isAuthenticated && user?.role === "admin";
  const utils = trpc.useUtils();
  const [productForm, setProductForm] = useState(blankProduct);
  const [seriesForm, setSeriesForm] = useState(blankSeries);
  const [variantForm, setVariantForm] = useState(blankVariant);
  const [placementForm, setPlacementForm] = useState(blankPlacement);
  const [reminder, setReminder] = useState({ recipientEmail: "", subject: "A note from Sofa Co.", message: "Your selected pieces are still waiting for you.", consentConfirmed: false });

  const overview = trpc.admin.overview.useQuery(undefined, { enabled: isAdmin });
  const products = trpc.admin.listProducts.useQuery(undefined, { enabled: isAdmin });
  const series = trpc.admin.listSeries.useQuery(undefined, { enabled: isAdmin });
  const variants = trpc.admin.listVariants.useQuery(undefined, { enabled: isAdmin });
  const placements = trpc.admin.listPlacements.useQuery(undefined, { enabled: isAdmin });
  const orders = trpc.admin.listOrders.useQuery(undefined, { enabled: isAdmin });
  const inquiries = trpc.admin.listInquiries.useQuery(undefined, { enabled: isAdmin });
  const reviews = trpc.admin.listReviews.useQuery(undefined, { enabled: isAdmin });
  const carts = trpc.admin.listCarts.useQuery(undefined, { enabled: isAdmin });
  const customers = trpc.admin.listUsers.useQuery(undefined, { enabled: isAdmin });
  const reminders = trpc.admin.listReminders.useQuery(undefined, { enabled: isAdmin });
  const auditLogs = trpc.admin.listAuditLogs.useQuery(undefined, { enabled: isAdmin });

  const createProduct = trpc.admin.createProduct.useMutation();
  const updateProduct = trpc.admin.updateProduct.useMutation();
  const createSeries = trpc.admin.createSeries.useMutation();
  const updateSeries = trpc.admin.updateSeries.useMutation();
  const createVariant = trpc.admin.createVariant.useMutation();
  const updateVariant = trpc.admin.updateVariant.useMutation();
  const deleteVariant = trpc.admin.deleteVariant.useMutation();
  const savePlacement = trpc.admin.savePlacement.useMutation();
  const updateOrder = trpc.admin.updateOrderStatus.useMutation();
  const updateInquiry = trpc.admin.updateInquiryStatus.useMutation();
  const updateReview = trpc.admin.updateReviewStatus.useMutation();
  const createReminder = trpc.admin.createReminderDraft.useMutation();

  const errors = useMemo(() => [overview.error, products.error, series.error, placements.error, orders.error, inquiries.error, reviews.error, carts.error, customers.error, reminders.error, auditLogs.error].filter(Boolean), [overview.error, products.error, series.error, placements.error, orders.error, inquiries.error, reviews.error, carts.error, customers.error, reminders.error, auditLogs.error]);
  const databaseReady = errors.length === 0 && Boolean(overview.data);
  const notifyDatabaseHold = () => toast.info("Database connection required", { description: "This admin workflow is built and ready. Connect the database to save live changes." });

  const refreshAdmin = async () => {
    await Promise.all([overview.refetch(), products.refetch(), series.refetch(), placements.refetch(), orders.refetch(), inquiries.refetch(), reviews.refetch(), carts.refetch(), customers.refetch(), reminders.refetch(), auditLogs.refetch()]);
    toast.success("Admin data refreshed");
  };

  const invalidateCatalog = async () => {
    await Promise.all([utils.admin.listProducts.invalidate(), utils.admin.listSeries.invalidate(), utils.admin.listVariants.invalidate(), utils.admin.listPlacements.invalidate(), utils.admin.overview.invalidate(), utils.commerce.getProducts.invalidate(), utils.commerce.getSeries.invalidate(), utils.commerce.getPlacements.invalidate()]);
  };

  const submitProduct = async (event: FormEvent) => {
    event.preventDefault();
    if (!databaseReady) return notifyDatabaseHold();
    const payload = { ...productForm, description: productForm.description || null, imageUrl: productForm.imageUrl || null, gallery: productForm.gallery || null };
    try {
      if (productForm.id) await updateProduct.mutateAsync({ ...payload, id: productForm.id });
      else await createProduct.mutateAsync(payload);
      await invalidateCatalog(); setProductForm(blankProduct); toast.success("Product saved to the catalog");
    } catch (error) { toast.error("Product could not be saved", { description: error instanceof Error ? error.message : "Please try again." }); }
  };

  const submitSeries = async (event: FormEvent) => {
    event.preventDefault();
    if (!databaseReady) return notifyDatabaseHold();
    const payload = { ...seriesForm, description: seriesForm.description || null, imageUrl: seriesForm.imageUrl || null };
    try {
      if (seriesForm.id) await updateSeries.mutateAsync({ ...payload, id: seriesForm.id });
      else await createSeries.mutateAsync(payload);
      await invalidateCatalog(); setSeriesForm(blankSeries); toast.success("Series saved");
    } catch (error) { toast.error("Series could not be saved", { description: error instanceof Error ? error.message : "Please try again." }); }
  };

  const submitVariant = async (event: FormEvent) => {
    event.preventDefault();
    if (!databaseReady) return notifyDatabaseHold();
    const payload = { ...variantForm, sku: variantForm.sku || null };
    try {
      if (variantForm.id) await updateVariant.mutateAsync({ ...payload, id: variantForm.id });
      else await createVariant.mutateAsync(payload);
      await utils.admin.listVariants.invalidate();
      setVariantForm(blankVariant);
      toast.success("Variant saved");
    } catch (error) { toast.error("Variant could not be saved", { description: error instanceof Error ? error.message : "Please try again." }); }
  };

  const submitPlacement = async (event: FormEvent) => {
    event.preventDefault();
    if (!databaseReady) return notifyDatabaseHold();
    try {
      await savePlacement.mutateAsync({ ...placementForm, entityId: placementForm.entityId || null, heading: placementForm.heading || null, subheading: placementForm.subheading || null, imageUrl: placementForm.imageUrl || null, ctaLabel: placementForm.ctaLabel || null, ctaHref: placementForm.ctaHref || null });
      await invalidateCatalog(); setPlacementForm(blankPlacement); toast.success("Storefront placement saved");
    } catch (error) { toast.error("Placement could not be saved", { description: error instanceof Error ? error.message : "Please try again." }); }
  };

  const submitReminder = async (event: FormEvent) => {
    event.preventDefault();
    const decision = prepareReminderDraft(reminder, databaseReady);
    if (!decision.allowed) return decision.reason === "database-required" ? notifyDatabaseHold() : toast.error("Customer consent is required", { description: "Confirm recorded consent before preparing a reminder draft." });
    try {
      await submitReminderDraft(reminder, databaseReady, createReminder.mutateAsync);
      await Promise.all([utils.admin.listReminders.invalidate(), utils.admin.listAuditLogs.invalidate(), utils.admin.overview.invalidate()]);
      setReminder({ recipientEmail: "", subject: "A note from Sofa Co.", message: "Your selected pieces are still waiting for you.", consentConfirmed: false });
      toast.success("Reminder draft created", { description: "It is logged for delivery review; no customer email was sent automatically." });
    } catch (error) { toast.error("Reminder draft could not be created", { description: error instanceof Error ? error.message : "Please try again." }); }
  };

  if (!isAdmin) return <DashboardLayout menuItems={adminMenu} title="Sofa Co. Admin" requireAdmin><div /></DashboardLayout>;

  const stats = [
    { label: "Catalog products", value: databaseReady ? overview.data?.products ?? 0 : "—", icon: PackageOpen },
    { label: "Orders", value: databaseReady ? overview.data?.orders ?? 0 : "—", icon: ClipboardList },
    { label: "Active carts", value: databaseReady ? overview.data?.activeCarts ?? 0 : "—", icon: ShoppingCart },
    { label: "Pending reviews", value: databaseReady ? overview.data?.pendingReviews ?? 0 : "—", icon: Star },
    { label: "Inquiries", value: databaseReady ? overview.data?.inquiries ?? 0 : "—", icon: MessageSquareText },
    { label: "Reminder drafts", value: databaseReady ? overview.data?.reminderDrafts ?? 0 : "—", icon: Send },
  ];

  return <DashboardLayout menuItems={adminMenu} title="Sofa Co. Admin" requireAdmin>
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <header className="flex flex-col justify-between gap-5 border-b border-[#decfbd] pb-7 sm:flex-row sm:items-end"><div><p className="eyebrow">Control centre</p><h1 className="font-display mt-3 text-5xl tracking-[-0.04em]">Run the showroom.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#766b5d]">Manage the live catalog, decide where products appear, review commerce activity, and keep customer communication organized.</p></div><Button type="button" variant="outline" onClick={refreshAdmin} className="rounded-none border-[#cdbda9] bg-transparent"><RefreshCw size={15} className="mr-2" />Refresh data</Button></header>

      <div data-testid="admin-database-status" role="status" className={`border p-5 text-sm ${databaseReady ? "border-[#a5b4a0] bg-[#f1f6ef] text-[#39543d]" : "border-[#d69b7c] bg-[#fff5ed] text-[#6f3e25]"}`}>
        {databaseReady ? <><strong>Database connected.</strong><span className="ml-2">Live catalog, content, operations, and customer-management actions are available.</span></> : <><strong>Database connection is on hold.</strong><span className="ml-2">The complete admin interface is in place. Connect the database later to unlock live data, publishing, order operations, cart analytics, reviews, and reminder-draft storage.</span></>}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{stats.map(({ label, value, icon: Icon }) => <article key={label} className="soft-card p-5"><div className="flex items-start justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#766b5d]">{label}</span><Icon size={18} className="text-[#9b6e4b]" /></div><strong className="font-display mt-7 block text-5xl leading-none">{value}</strong></article>)}</section>

      <Tabs defaultValue="catalog" className="space-y-6"><TabsList className="scrollbar-subtle h-auto w-full justify-start overflow-x-auto rounded-none border-y border-[#decfbd] bg-transparent p-0"><TabsTrigger value="catalog" className="rounded-none px-4 py-4 text-[10px] uppercase tracking-[0.14em]">Catalog</TabsTrigger><TabsTrigger value="placement" className="rounded-none px-4 py-4 text-[10px] uppercase tracking-[0.14em]">Placements</TabsTrigger><TabsTrigger value="operations" className="rounded-none px-4 py-4 text-[10px] uppercase tracking-[0.14em]">Operations</TabsTrigger><TabsTrigger value="reviews" className="rounded-none px-4 py-4 text-[10px] uppercase tracking-[0.14em]">Reviews</TabsTrigger><TabsTrigger value="customers" className="rounded-none px-4 py-4 text-[10px] uppercase tracking-[0.14em]">Customers & carts</TabsTrigger><TabsTrigger value="reminders" className="rounded-none px-4 py-4 text-[10px] uppercase tracking-[0.14em]">Reminders</TabsTrigger><TabsTrigger value="audit" className="rounded-none px-4 py-4 text-[10px] uppercase tracking-[0.14em]">Audit</TabsTrigger></TabsList>

        <TabsContent value="catalog" className="space-y-8"><div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]"><form onSubmit={submitProduct} className="soft-card space-y-4 p-6"><div className="flex items-center justify-between"><h2 className="font-display text-3xl">{productForm.id ? "Edit product" : "New product"}</h2><Button type="button" variant="ghost" onClick={() => setProductForm(blankProduct)} className="text-xs">Reset</Button></div><Input required value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value, slug: productForm.slug || event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} placeholder="Product name" /><Input required value={productForm.slug} onChange={(event) => setProductForm({ ...productForm, slug: event.target.value })} placeholder="Product slug" /><select value={productForm.seriesId} onChange={(event) => setProductForm({ ...productForm, seriesId: Number(event.target.value) })} className="h-10 w-full border border-[#decfbd] bg-transparent px-3 text-sm">{series.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Textarea value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} placeholder="Product description" /><Input type="number" min="0" value={productForm.startingPrice} onChange={(event) => setProductForm({ ...productForm, startingPrice: Number(event.target.value) })} placeholder="Starting price in cents" /><Input value={productForm.imageUrl} onChange={(event) => setProductForm({ ...productForm, imageUrl: event.target.value })} placeholder="Primary image URL" /><Input type="number" min="0" value={productForm.sortOrder} onChange={(event) => setProductForm({ ...productForm, sortOrder: Number(event.target.value) })} placeholder="Display order" /><div className="grid grid-cols-2 gap-3"><select value={productForm.isVisible} onChange={(event) => setProductForm({ ...productForm, isVisible: event.target.value as "true" | "false" })} className="h-10 border border-[#decfbd] bg-transparent px-3 text-sm"><option value="true">Visible</option><option value="false">Hidden</option></select><select value={productForm.isFeatured} onChange={(event) => setProductForm({ ...productForm, isFeatured: event.target.value as "true" | "false" })} className="h-10 border border-[#decfbd] bg-transparent px-3 text-sm"><option value="false">Standard</option><option value="true">Featured</option></select></div><Button type="submit" disabled={createProduct.isPending || updateProduct.isPending} className="w-full rounded-none bg-[#25221d] text-[#f8f4ec]">{productForm.id ? "Save product" : "Add product"}</Button></form>
          <div className="overflow-hidden border border-[#decfbd]"><div className="flex items-center justify-between border-b border-[#decfbd] px-5 py-4"><h2 className="font-display text-3xl">Live catalog</h2><span className="text-xs text-[#766b5d]">{products.data?.length ?? 0} items</span></div><div className="scrollbar-subtle max-h-[620px] overflow-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-[#efe4d6] text-[10px] uppercase tracking-[0.14em] text-[#766b5d]"><tr><th className="p-4">Piece</th><th className="p-4">Price</th><th className="p-4">Visibility</th><th className="p-4">Action</th></tr></thead><tbody>{products.data?.map((item) => <tr key={item.id} className="border-t border-[#eee1d0]"><td className="p-4"><strong>{item.name}</strong><span className="mt-1 block text-xs text-[#766b5d]">{item.slug}</span></td><td className="p-4">{formatCurrency(item.startingPrice)}</td><td className="p-4"><span className={item.isVisible === "true" ? "text-[#54745b]" : "text-[#a05b41]"}>{item.isVisible === "true" ? "Visible" : "Hidden"}</span></td><td className="p-4"><Button type="button" variant="ghost" onClick={() => setProductForm({ id: item.id, seriesId: item.seriesId, name: item.name, slug: item.slug, description: item.description || "", startingPrice: item.startingPrice, imageUrl: item.imageUrl || "", gallery: item.gallery || "", isCustom: item.isCustom, isVisible: item.isVisible, isFeatured: item.isFeatured, sortOrder: item.sortOrder })}>Edit</Button></td></tr>)}</tbody></table></div></div></div>
          <form onSubmit={submitSeries} className="soft-card max-w-xl space-y-4 p-6"><div className="flex items-center justify-between"><h2 className="font-display text-3xl">{seriesForm.id ? "Edit series" : "New series"}</h2><Button type="button" variant="ghost" onClick={() => setSeriesForm(blankSeries)} className="text-xs">Reset</Button></div><Input required value={seriesForm.name} onChange={(event) => setSeriesForm({ ...seriesForm, name: event.target.value, slug: seriesForm.slug || event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} placeholder="Series name" /><Input required value={seriesForm.slug} onChange={(event) => setSeriesForm({ ...seriesForm, slug: event.target.value })} placeholder="Series slug" /><Textarea value={seriesForm.description} onChange={(event) => setSeriesForm({ ...seriesForm, description: event.target.value })} placeholder="Series description" /><Input value={seriesForm.imageUrl} onChange={(event) => setSeriesForm({ ...seriesForm, imageUrl: event.target.value })} placeholder="Series image URL" /><Button type="submit" disabled={createSeries.isPending || updateSeries.isPending} className="rounded-none bg-[#25221d] text-[#f8f4ec]">{seriesForm.id ? "Save series" : "Add series"}</Button></form></TabsContent>

        <TabsContent value="placement" className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]"><form onSubmit={submitPlacement} className="soft-card space-y-4 p-6"><div className="flex items-center justify-between"><h2 className="font-display text-3xl">Storefront placement</h2><Button type="button" variant="ghost" onClick={() => setPlacementForm(blankPlacement)} className="text-xs">Reset</Button></div><Input required value={placementForm.slot} onChange={(event) => setPlacementForm({ ...placementForm, slot: event.target.value })} placeholder="Slot, e.g. home.featured" /><select value={placementForm.entityType} onChange={(event) => setPlacementForm({ ...placementForm, entityType: event.target.value as "product" | "series" | "custom" })} className="h-10 w-full border border-[#decfbd] bg-transparent px-3 text-sm"><option value="product">Product</option><option value="series">Series</option><option value="custom">Custom content</option></select><select value={placementForm.entityId ?? ""} onChange={(event) => setPlacementForm({ ...placementForm, entityId: event.target.value ? Number(event.target.value) : undefined })} className="h-10 w-full border border-[#decfbd] bg-transparent px-3 text-sm"><option value="">No linked entity</option>{placementForm.entityType === "series" ? series.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>) : products.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Input value={placementForm.heading} onChange={(event) => setPlacementForm({ ...placementForm, heading: event.target.value })} placeholder="Optional heading override" /><Textarea value={placementForm.subheading} onChange={(event) => setPlacementForm({ ...placementForm, subheading: event.target.value })} placeholder="Optional supporting copy" /><Input value={placementForm.imageUrl} onChange={(event) => setPlacementForm({ ...placementForm, imageUrl: event.target.value })} placeholder="Optional image URL override" /><div className="grid grid-cols-2 gap-3"><Input value={placementForm.ctaLabel} onChange={(event) => setPlacementForm({ ...placementForm, ctaLabel: event.target.value })} placeholder="CTA label" /><Input value={placementForm.ctaHref} onChange={(event) => setPlacementForm({ ...placementForm, ctaHref: event.target.value })} placeholder="CTA link" /></div><Button type="submit" disabled={savePlacement.isPending} className="w-full rounded-none bg-[#25221d] text-[#f8f4ec]">Save placement</Button></form><div className="space-y-3">{placements.data?.map((item) => <article key={item.id} className="soft-card flex items-start justify-between gap-4 p-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9b6e4b]">{item.slot}</p><h3 className="font-display mt-2 text-2xl">{item.heading || item.entityType}</h3><p className="mt-1 text-xs text-[#766b5d]">{item.isVisible === "true" ? "Visible" : "Hidden"} · Order {item.sortOrder}</p></div><Button type="button" variant="ghost" onClick={() => setPlacementForm({ id: item.id, slot: item.slot, entityType: item.entityType, entityId: item.entityId ?? undefined, heading: item.heading || "", subheading: item.subheading || "", imageUrl: item.imageUrl || "", ctaLabel: item.ctaLabel || "", ctaHref: item.ctaHref || "", sortOrder: item.sortOrder, isVisible: item.isVisible })}>Edit</Button></article>)}</div></TabsContent>

        <TabsContent value="operations" className="grid gap-8 xl:grid-cols-2"><section className="soft-card overflow-hidden"><div className="border-b border-[#decfbd] p-5"><h2 className="font-display text-3xl">Orders</h2></div><div className="scrollbar-subtle max-h-[560px] overflow-auto">{orders.data?.length ? orders.data.map((item) => <div key={item.id} className="border-b border-[#eee1d0] p-5"><div className="flex items-start justify-between gap-4"><div><strong>Order #{item.id}</strong><p className="mt-1 text-xs text-[#766b5d]">{item.customerName} · {item.customerEmail}</p><p className="mt-2 text-sm">{formatCurrency(item.totalAmount)}</p></div><select value={item.status} onChange={async (event) => { await updateOrder.mutateAsync({ id: item.id, status: event.target.value as "pending" | "processing" | "shipped" | "delivered" | "cancelled" }); await utils.admin.listOrders.invalidate(); toast.success("Order status updated"); }} className="border border-[#decfbd] bg-transparent px-2 py-2 text-xs"><option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></div><details className="mt-3 text-xs text-[#766b5d]"><summary className="cursor-pointer">View order items and address</summary><pre className="mt-2 whitespace-pre-wrap font-sans">{item.itemsJson}\n{item.shippingAddress}</pre></details></div>) : <p className="p-6 text-sm text-[#766b5d]">No orders yet.</p>}</div></section><section className="soft-card overflow-hidden"><div className="border-b border-[#decfbd] p-5"><h2 className="font-display text-3xl">Inquiries</h2></div><div className="scrollbar-subtle max-h-[560px] overflow-auto">{inquiries.data?.length ? inquiries.data.map((item) => <div key={item.id} className="border-b border-[#eee1d0] p-5"><div className="flex items-start justify-between gap-4"><div><strong>{item.firstName} {item.lastName}</strong><p className="mt-1 text-xs text-[#766b5d]">{item.email} · {item.category}</p></div><select value={item.status} onChange={async (event) => { await updateInquiry.mutateAsync({ id: item.id, status: event.target.value as "new" | "read" | "replied" }); await utils.admin.listInquiries.invalidate(); toast.success("Inquiry status updated"); }} className="border border-[#decfbd] bg-transparent px-2 py-2 text-xs"><option value="new">New</option><option value="read">Read</option><option value="replied">Replied</option></select></div><p className="mt-3 text-sm leading-6 text-[#766b5d]">{item.message}</p></div>) : <p className="p-6 text-sm text-[#766b5d]">No inquiries yet.</p>}</div></section></TabsContent>

        <TabsContent value="reviews" className="space-y-5"><div className="border-l-2 border-[#c58d5d] bg-[#fff8ed] p-5 text-sm leading-6 text-[#766b5d]">Only real customer reviews collected through the storefront should appear here. This panel is for moderation; it does not create or fabricate testimonials.</div><div className="grid gap-4 xl:grid-cols-2">{reviews.data?.length ? reviews.data.map((item) => <article key={item.id} className="soft-card p-5"><div className="flex items-start justify-between gap-4"><div><strong>{item.authorName}</strong><p className="mt-1 text-xs text-[#766b5d]">Product #{item.productId} · {item.rating}/5 · {formatDate(item.createdAt)}</p></div><select value={item.status} onChange={async (event) => { await updateReview.mutateAsync({ id: item.id, status: event.target.value as "pending" | "approved" | "rejected" }); await utils.admin.listReviews.invalidate(); toast.success("Review status updated"); }} className="border border-[#decfbd] bg-transparent px-2 py-2 text-xs"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div><p className="mt-4 text-sm leading-6 text-[#766b5d]">{item.body}</p></article>) : <p className="text-sm text-[#766b5d]">No customer reviews are awaiting moderation.</p>}</div></TabsContent>

        <TabsContent value="customers" className="grid gap-8 xl:grid-cols-2"><section className="soft-card overflow-hidden"><div className="border-b border-[#decfbd] p-5"><h2 className="font-display text-3xl">Active carts</h2></div><div className="scrollbar-subtle max-h-[560px] overflow-auto">{carts.data?.length ? carts.data.map((item) => <div key={item.id} className="border-b border-[#eee1d0] p-5"><div className="flex items-center justify-between"><strong>{item.customerEmail || "Guest visitor"}</strong><span className="text-sm">{formatCurrency(item.subtotal)}</span></div><p className="mt-2 text-xs text-[#766b5d]">{item.status} · Updated {formatDate(item.updatedAt)}</p><details className="mt-3 text-xs text-[#766b5d]"><summary className="cursor-pointer">View cart items</summary><pre className="mt-2 whitespace-pre-wrap font-sans">{item.itemsJson}</pre></details></div>) : <p className="p-6 text-sm text-[#766b5d]">Cart activity will appear here as visitors add items.</p>}</div></section><section className="soft-card overflow-hidden"><div className="border-b border-[#decfbd] p-5"><h2 className="font-display text-3xl">Customer accounts</h2></div><div className="scrollbar-subtle max-h-[560px] overflow-auto">{customers.data?.map((item) => <div key={item.id} className="flex items-center justify-between border-b border-[#eee1d0] p-5"><div><strong>{item.name || "Customer"}</strong><p className="mt-1 text-xs text-[#766b5d]">{item.email || "No email"}</p></div><span className="text-[10px] uppercase tracking-[0.14em] text-[#9b6e4b]">{item.role}</span></div>)}</div></section></TabsContent>

        <TabsContent value="reminders" className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]"><form onSubmit={submitReminder} className="soft-card space-y-4 p-6"><p className="eyebrow">Manual delivery workflow</p><h2 className="font-display text-3xl">Prepare a reminder.</h2><p className="text-sm leading-6 text-[#766b5d]">This creates an auditable email draft and notifies the store owner for review. Automatic customer delivery requires a connected email provider and consent-aware setup.</p><Input required type="email" value={reminder.recipientEmail} onChange={(event) => setReminder({ ...reminder, recipientEmail: event.target.value })} placeholder="Customer email" /><Input required value={reminder.subject} onChange={(event) => setReminder({ ...reminder, subject: event.target.value })} placeholder="Email subject" /><Textarea required rows={7} value={reminder.message} onChange={(event) => setReminder({ ...reminder, message: event.target.value })} placeholder="Reminder message" /><label className="flex items-start gap-3 border border-[#decfbd] p-3 text-xs leading-5 text-[#766b5d]"><input type="checkbox" checked={reminder.consentConfirmed} onChange={(event) => setReminder({ ...reminder, consentConfirmed: event.target.checked })} className="mt-1 h-4 w-4 accent-[#25221d]" /><span>I confirm this customer has given permission to receive this reminder. This creates a draft for owner review and does not send an email automatically.</span></label><Button type="submit" disabled={!databaseReady || !reminder.consentConfirmed || createReminder.isPending} className="w-full rounded-none bg-[#25221d] text-[#f8f4ec]"><Send size={15} className="mr-2" />{databaseReady ? reminder.consentConfirmed ? "Create delivery draft" : "Confirm consent to continue" : "Connect database to create draft"}</Button></form><section className="soft-card overflow-hidden"><div className="border-b border-[#decfbd] p-5"><h2 className="font-display text-3xl">Reminder queue</h2></div><div className="scrollbar-subtle max-h-[560px] overflow-auto">{reminders.data?.length ? reminders.data.map((item) => <div key={item.id} className="border-b border-[#eee1d0] p-5"><div className="flex items-start justify-between gap-4"><div><strong>{item.recipientEmail}</strong><p className="mt-1 text-xs text-[#766b5d]">{item.subject}</p></div><span className="text-[10px] uppercase tracking-[0.14em] text-[#9b6e4b]">{item.status}</span></div><p className="mt-3 text-sm leading-6 text-[#766b5d]">{item.message}</p></div>) : <p className="p-6 text-sm text-[#766b5d]">No reminder drafts yet.</p>}</div></section></TabsContent>

        <TabsContent value="audit" className="space-y-4">{auditLogs.data?.length ? auditLogs.data.map((item) => <article key={item.id} className="soft-card flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9b6e4b]">{item.action}</p><p className="mt-2 text-sm text-[#766b5d]">{item.entityType}{item.entityId ? ` #${item.entityId}` : ""}</p></div><span className="text-xs text-[#766b5d]">{formatDate(item.createdAt)}</span></article>) : <p className="text-sm text-[#766b5d]">Admin changes will be recorded here.</p>}</TabsContent>
      </Tabs>
    </div>
  </DashboardLayout>;
}