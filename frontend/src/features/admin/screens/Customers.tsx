"use client";

import { Search, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminShell from "../AdminShell";
import { formatDate, relativeTime, useMoney } from "../adminUtils";
import {
  Badge,
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

export default function Customers() {
  const { format } = useMoney();
  const users = trpc.admin.listUsers.useQuery(undefined, { retry: false });
  const orders = trpc.admin.listOrders.useQuery(undefined, { retry: false });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "buyers" | "admins">("all");

  const databaseReady = Boolean(users.data) && !users.error;
  const rows = users.data ?? [];

  // Spend is derived from orders rather than stored on the user, so it can
  // never drift from the orders table.
  const spendByEmail = useMemo(() => {
    const totals = new Map<string, { spend: number; count: number; last: Date | string | null }>();
    for (const order of orders.data ?? []) {
      if (order.status === "cancelled") continue;
      const key = order.customerEmail.toLowerCase();
      const entry = totals.get(key) ?? { spend: 0, count: 0, last: null };
      entry.spend += order.totalAmount;
      entry.count += 1;
      if (!entry.last || new Date(order.createdAt) > new Date(entry.last)) entry.last = order.createdAt;
      totals.set(key, entry);
    }
    return totals;
  }, [orders.data]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      buyers: rows.filter(row => spendByEmail.has((row.email ?? "").toLowerCase())).length,
      admins: rows.filter(row => row.role === "admin").length,
    }),
    [rows, spendByEmail],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(row => {
      if (filter === "admins" && row.role !== "admin") return false;
      if (filter === "buyers" && !spendByEmail.has((row.email ?? "").toLowerCase())) return false;
      if (!term) return true;
      return (row.name ?? "").toLowerCase().includes(term) || (row.email ?? "").toLowerCase().includes(term);
    });
  }, [rows, filter, search, spendByEmail]);

  const totalSpend = useMemo(
    () => [...spendByEmail.values()].reduce((sum, entry) => sum + entry.spend, 0),
    [spendByEmail],
  );

  return (
    <AdminShell title="All customers" breadcrumb="Customers">
      <PageHead
        title="Customers"
        description="Everyone with an account, what they have spent and when they were last here."
        badge={databaseReady ? <Badge tone="neutral">{rows.length}</Badge> : null}
      />

      <Stack gap={16}>
        {!databaseReady ? (
          <Notice tone="warning" title="The database is not connected.">
            Customer records appear here once the connection is live.
          </Notice>
        ) : null}

        <Grid min={200}>
          <Stat label="Accounts" value={rows.length} icon={Users} loading={users.isLoading} />
          <Stat label="Have ordered" value={counts.buyers} loading={users.isLoading} />
          <Stat label="Lifetime revenue" value={format(totalSpend)} loading={orders.isLoading} />
          <Stat label="Administrators" value={counts.admins} icon={ShieldCheck} loading={users.isLoading} />
        </Grid>

        <Card
          flush
          title="Customer list"
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
                placeholder="Search by name or email"
                aria-label="Search customers"
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
                { value: "all", label: "All", count: counts.all },
                { value: "buyers", label: "Have ordered", count: counts.buyers },
                { value: "admins", label: "Admins", count: counts.admins },
              ]}
            />
          </div>

          {users.isLoading ? (
            <TableSkeleton rows={6} columns={5} />
          ) : visible.length === 0 ? (
            <EmptyState title={rows.length === 0 ? "No customers yet" : "Nothing matches that"} icon={Users}>
              {rows.length === 0 ? "Accounts appear here as shoppers sign in." : "Try another search term."}
            </EmptyState>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Role</th>
                  <th className="sfa-table__num">Orders</th>
                  <th className="sfa-table__num">Spend</th>
                  <th>Last signed in</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(row => {
                  const stats = spendByEmail.get((row.email ?? "").toLowerCase());
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="sfa-table__primary">{row.name ?? "Unnamed"}</div>
                        <div className="sfa-table__muted" style={{ fontSize: 12 }}>
                          {row.email ?? "No email on file"}
                        </div>
                      </td>
                      <td>
                        <Badge tone={row.role === "admin" ? "accent" : "neutral"}>{row.role}</Badge>
                      </td>
                      <td className="sfa-table__num">{stats?.count ?? 0}</td>
                      <td className="sfa-table__num">{format(stats?.spend ?? 0)}</td>
                      <td className="sfa-table__muted">{relativeTime(row.lastSignedIn)}</td>
                      <td className="sfa-table__muted">{formatDate(row.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Card>

        <Notice tone="info" title="Roles are changed on the server.">
          Promoting someone to administrator is deliberately not a click in this screen. Run the{" "}
          <code className="sfa-mono">create-admin</code> script so the change is logged and intentional.
        </Notice>
      </Stack>
    </AdminShell>
  );
}
