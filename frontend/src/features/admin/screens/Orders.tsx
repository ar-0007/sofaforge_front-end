"use client";

import { ChevronDown, ChevronRight, MapPin, Search, ShoppingCart } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminShell from "../AdminShell";
import { ORDER_STATUSES, formatDateTime, useMoney, type OrderStatus } from "../adminUtils";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FilterBar,
  Grid,
  Notice,
  PageHead,
  Stack,
  Stat,
  TableSkeleton,
  TableWrap,
} from "../ui";

type OrderLine = { name?: string; quantity?: number; price?: number; options?: Record<string, string> };

/** Order lines are stored as JSON text; a malformed row must not break the page. */
function readLines(raw: string): OrderLine[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OrderLine[]) : [];
  } catch {
    return [];
  }
}

export default function Orders() {
  const utils = trpc.useUtils();
  const { format } = useMoney();
  const orders = trpc.admin.listOrders.useQuery(undefined, { retry: false });
  const updateStatus = trpc.admin.updateOrderStatus.useMutation();

  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const databaseReady = Boolean(orders.data) && !orders.error;
  const rows = orders.data ?? [];

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(ORDER_STATUSES.map(status => [status, 0])) as Record<OrderStatus, number>;
    for (const row of rows) byStatus[row.status as OrderStatus] += 1;
    return byStatus;
  }, [rows]);

  const revenue = useMemo(
    () => rows.filter(row => row.status !== "cancelled").reduce((sum, row) => sum + row.totalAmount, 0),
    [rows],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(row => {
      if (filter !== "all" && row.status !== filter) return false;
      if (!term) return true;
      return (
        row.customerName.toLowerCase().includes(term) ||
        row.customerEmail.toLowerCase().includes(term) ||
        String(row.id).includes(term)
      );
    });
  }, [rows, filter, search]);

  const changeStatus = async (id: number, status: OrderStatus) => {
    if (!databaseReady) return;
    try {
      await updateStatus.mutateAsync({ id, status });
      await Promise.all([utils.admin.listOrders.invalidate(), utils.admin.overview.invalidate()]);
      toast.success(`Order #${id} marked ${status}`);
    } catch (error) {
      toast.error("Status could not be changed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <AdminShell title="Orders" breadcrumb="Store">
      <PageHead
        title="Orders"
        description="Every order placed, with the configuration the shopper chose and where it is in fulfilment."
        badge={databaseReady ? <Badge tone="neutral">{rows.length}</Badge> : null}
      />

      <Stack gap={16}>
        {!databaseReady ? (
          <Notice tone="warning" title="The database is not connected.">
            Orders will populate this screen once the connection is live.
          </Notice>
        ) : null}

        <Grid min={200}>
          <Stat label="Revenue booked" value={format(revenue)} loading={orders.isLoading} />
          <Stat label="Awaiting processing" value={counts.pending ?? 0} loading={orders.isLoading} />
          <Stat label="In transit" value={counts.shipped ?? 0} loading={orders.isLoading} />
          <Stat label="Delivered" value={counts.delivered ?? 0} loading={orders.isLoading} />
        </Grid>

        <Card
          flush
          title="All orders"
          actions={
            <div style={{ position: "relative", width: 240, maxWidth: "100%" }}>
              <Search
                size={14}
                aria-hidden="true"
                style={{ position: "absolute", insetInlineStart: 10, insetBlockStart: 10, color: "var(--sfa-text-muted)" }}
              />
              <input
                className="sfa-input"
                style={{ paddingInlineStart: 30 }}
                placeholder="Name, email or order number"
                aria-label="Search orders"
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>
          }
        >
          <div style={{ padding: "12px 16px 0" }}>
            <FilterBar
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All", count: rows.length },
                ...ORDER_STATUSES.map(status => ({
                  value: status,
                  label: status.charAt(0).toUpperCase() + status.slice(1),
                  count: counts[status] ?? 0,
                })),
              ]}
            />
          </div>

          {orders.isLoading ? (
            <TableSkeleton rows={6} columns={5} />
          ) : visible.length === 0 ? (
            <EmptyState title={rows.length === 0 ? "No orders yet" : "Nothing matches that"} icon={ShoppingCart}>
              {rows.length === 0
                ? "Orders appear here the moment a shopper checks out."
                : "Try another search term or status."}
            </EmptyState>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th style={{ width: 34 }} aria-label="Expand" />
                  <th>Order</th>
                  <th>Customer</th>
                  <th className="sfa-table__num">Total</th>
                  <th>Placed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(row => {
                  const lines = readLines(row.itemsJson);
                  const isOpen = expanded === row.id;
                  return (
                    <Fragment key={row.id}>
                      <tr>
                        <td>
                          <button
                            type="button"
                            aria-label={isOpen ? "Hide order detail" : "Show order detail"}
                            aria-expanded={isOpen}
                            onClick={() => setExpanded(isOpen ? null : row.id)}
                            style={{ background: "none", border: 0, cursor: "pointer", color: "var(--sfa-text-muted)" }}
                          >
                            {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                        </td>
                        <td className="sfa-table__primary sfa-mono">#{row.id}</td>
                        <td>
                          <div className="sfa-table__primary">{row.customerName}</div>
                          <div className="sfa-table__muted" style={{ fontSize: 12 }}>
                            {row.customerEmail}
                          </div>
                        </td>
                        <td className="sfa-table__num">{format(row.totalAmount)}</td>
                        <td className="sfa-table__muted">{formatDateTime(row.createdAt)}</td>
                        <td>
                          <select
                            className="sfa-select"
                            style={{ width: 140 }}
                            value={row.status}
                            disabled={!databaseReady || updateStatus.isPending}
                            aria-label={`Status of order ${row.id}`}
                            onChange={event => void changeStatus(row.id, event.target.value as OrderStatus)}
                          >
                            {ORDER_STATUSES.map(status => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr>
                          <td colSpan={6} style={{ background: "var(--sfa-surface-2)" }}>
                            <Grid min={280}>
                              <div>
                                <p style={{ fontWeight: 650, fontSize: 12.5, marginBlockEnd: 8 }}>Items</p>
                                {lines.length === 0 ? (
                                  <p className="sfa-help">No line detail was stored with this order.</p>
                                ) : (
                                  <Stack gap={8}>
                                    {lines.map((line, index) => (
                                      <div key={index}>
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                          <span style={{ fontSize: 13 }}>
                                            {line.name ?? "Item"} × {line.quantity ?? 1}
                                          </span>
                                          <span className="sfa-table__num">{format(line.price ?? 0)}</span>
                                        </div>
                                        {line.options ? (
                                          <p className="sfa-help">
                                            {Object.entries(line.options)
                                              .map(([key, value]) => `${key}: ${value}`)
                                              .join(" · ")}
                                          </p>
                                        ) : null}
                                      </div>
                                    ))}
                                  </Stack>
                                )}
                              </div>
                              <div>
                                <p style={{ fontWeight: 650, fontSize: 12.5, marginBlockEnd: 8, display: "flex", gap: 6 }}>
                                  <MapPin size={14} aria-hidden="true" />
                                  Shipping address
                                </p>
                                <p className="sfa-help" style={{ whiteSpace: "pre-wrap" }}>
                                  {row.shippingAddress}
                                </p>
                                <div style={{ marginBlockStart: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  {ORDER_STATUSES.filter(status => status !== row.status).map(status => (
                                    <Button
                                      key={status}
                                      size="sm"
                                      disabled={!databaseReady || updateStatus.isPending}
                                      onClick={() => void changeStatus(row.id, status)}
                                    >
                                      Mark {status}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </Grid>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Card>

        <Notice tone="info">
          Status changes are recorded in the activity log with who made them, so fulfilment history stays auditable.
        </Notice>
      </Stack>
    </AdminShell>
  );
}
