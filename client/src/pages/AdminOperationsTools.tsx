import React, { FormEvent, useMemo, useState } from "react";
import DashboardLayout, { type DashboardMenuItem } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { prepareReminderDraft, submitReminderDraft } from "@/lib/adminReminder";
import { AlertTriangle, LayoutDashboard, Mail, PackageOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";

const menuItems: DashboardMenuItem[] = [
  { icon: LayoutDashboard, label: "Admin centre", path: "/admin" },
  { icon: PackageOpen, label: "Catalog tools", path: "/admin/catalog-tools" },
  { icon: AlertTriangle, label: "Operations tools", path: "/admin/operations-tools" },
  { icon: PackageOpen, label: "View storefront", path: "/" },
];

export default function AdminOperationsTools() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = isAuthenticated && user?.role === "admin";
  const utils = trpc.useUtils();
  const products = trpc.admin.listProducts.useQuery(undefined, { enabled: isAdmin });
  const series = trpc.admin.listSeries.useQuery(undefined, { enabled: isAdmin });
  const placements = trpc.admin.listPlacements.useQuery(undefined, { enabled: isAdmin });
  const deleteProduct = trpc.admin.deleteProduct.useMutation();
  const deleteSeries = trpc.admin.deleteSeries.useMutation();
  const deletePlacement = trpc.admin.deletePlacement.useMutation();
  const createReminder = trpc.admin.createReminderDraft.useMutation();
  const [reminder, setReminder] = useState({ recipientEmail: "", subject: "A note from Sofa Co.", message: "Your selected pieces are still waiting for you.", consentConfirmed: false });
  const databaseReady = Boolean(products.data) && !products.error && !series.error && !placements.error;
  const heldMessage = () => toast.info("Database connection required", { description: "This workflow will activate as soon as the database is connected." });
  const operations = useMemo(() => [
    { label: "Products", items: products.data ?? [], remove: async (id: number) => deleteProduct.mutateAsync({ id }), invalidate: () => Promise.all([utils.admin.listProducts.invalidate(), utils.admin.listVariants.invalidate(), utils.admin.listPlacements.invalidate(), utils.commerce.getProducts.invalidate()]) },
    { label: "Series", items: series.data ?? [], remove: async (id: number) => deleteSeries.mutateAsync({ id }), invalidate: () => Promise.all([utils.admin.listSeries.invalidate(), utils.admin.listPlacements.invalidate(), utils.commerce.getSeries.invalidate()]) },
    { label: "Storefront placements", items: placements.data ?? [], remove: async (id: number) => deletePlacement.mutateAsync({ id }), invalidate: () => Promise.all([utils.admin.listPlacements.invalidate(), utils.commerce.getPlacements.invalidate()]) },
  ], [products.data, series.data, placements.data, deleteProduct, deleteSeries, deletePlacement, utils]);

  const submitReminder = async (event: FormEvent) => {
    event.preventDefault();
    const decision = prepareReminderDraft(reminder, databaseReady);
    if (!decision.allowed) return decision.reason === "database-required" ? heldMessage() : toast.error("Customer consent is required", { description: "Only prepare a reminder when the customer has agreed to receive it." });
    try {
      await submitReminderDraft(reminder, databaseReady, createReminder.mutateAsync);
      setReminder({ recipientEmail: "", subject: "A note from Sofa Co.", message: "Your selected pieces are still waiting for you.", consentConfirmed: false });
      await Promise.all([utils.admin.listReminders.invalidate(), utils.admin.listAuditLogs.invalidate()]);
      toast.success("Reminder draft prepared", { description: "It is stored for owner review; no automated customer email is sent." });
    } catch (error) { toast.error("Reminder draft could not be created", { description: error instanceof Error ? error.message : "Please try again." }); }
  };

  if (!isAdmin) return <DashboardLayout menuItems={menuItems} title="Operations tools" requireAdmin><div /></DashboardLayout>;

  return <DashboardLayout menuItems={menuItems} title="Operations tools" requireAdmin><main className="mx-auto max-w-6xl space-y-8 pb-12"><header className="border-b border-[#decfbd] pb-7"><p className="eyebrow">Admin workspace</p><h1 className="font-display mt-3 text-5xl tracking-[-0.04em]">Careful operations.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#766b5d]">Delete catalog records only when appropriate, and prepare customer reminders with explicit consent confirmation.</p></header><div role="status" className={`border p-5 text-sm ${databaseReady ? "border-[#a5b4a0] bg-[#f1f6ef] text-[#39543d]" : "border-[#d69b7c] bg-[#fff5ed] text-[#6f3e25]"}`}>{databaseReady ? "Database connected. These operations are live." : "Database connection is on hold. All controls are implemented and will remain safely disabled until data storage is connected."}</div><section className="grid gap-8 xl:grid-cols-2"><form onSubmit={submitReminder} className="soft-card space-y-4 p-6"><div className="flex items-center gap-3"><Mail size={19} className="text-[#9b6e4b]" /><h2 className="font-display text-3xl">Consent-first reminder</h2></div><p className="text-sm leading-6 text-[#766b5d]">This creates a reviewable draft only. It never sends a customer email automatically.</p><Input required type="email" value={reminder.recipientEmail} onChange={(event) => setReminder({ ...reminder, recipientEmail: event.target.value })} placeholder="Customer email" /><Input required value={reminder.subject} onChange={(event) => setReminder({ ...reminder, subject: event.target.value })} placeholder="Email subject" /><Textarea required rows={6} value={reminder.message} onChange={(event) => setReminder({ ...reminder, message: event.target.value })} placeholder="Reminder message" /><label className="flex items-start gap-3 border border-[#decfbd] p-3 text-xs leading-5 text-[#766b5d]"><input type="checkbox" checked={reminder.consentConfirmed} onChange={(event) => setReminder({ ...reminder, consentConfirmed: event.target.checked })} className="mt-1 h-4 w-4 accent-[#25221d]" /><span>I confirm this customer has given permission to receive this reminder. I understand it will be created as a draft for review, not sent automatically.</span></label><Button type="submit" disabled={!databaseReady || createReminder.isPending} className="w-full rounded-none bg-[#25221d] text-[#f8f4ec]">{databaseReady ? "Create consent-confirmed draft" : "Connect database to create draft"}</Button></form><div className="soft-card overflow-hidden"><div className="border-b border-[#decfbd] p-5"><h2 className="font-display text-3xl">Destructive actions</h2><p className="mt-2 text-sm text-[#766b5d]">Series with linked products must be emptied or reassigned first.</p></div><div className="scrollbar-subtle max-h-[600px] overflow-auto">{operations.map((group) => <section key={group.label} className="border-b border-[#eee1d0] p-5"><h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9b6e4b]">{group.label}</h3>{group.items.length ? group.items.map((item: { id: number; name?: string; slot?: string }) => <div key={item.id} className="mt-3 flex items-center justify-between gap-4"><span className="text-sm">{item.name || item.slot || `Record #${item.id}`}</span><Button type="button" variant="ghost" disabled={!databaseReady || deleteProduct.isPending || deleteSeries.isPending || deletePlacement.isPending} onClick={async () => { if (!databaseReady) return heldMessage(); if (!window.confirm(`Delete ${item.name || item.slot || `record #${item.id}`}? This cannot be undone.`)) return; try { await group.remove(item.id); await group.invalidate(); toast.success("Record deleted"); } catch (error) { toast.error("Record could not be deleted", { description: error instanceof Error ? error.message : "Please try again." }); } }}><Trash2 size={15} className="mr-2" />Delete</Button></div>) : <p className="mt-3 text-sm text-[#766b5d]">No connected records available.</p>}</section>)}</div></div></section></main></DashboardLayout>;
}
