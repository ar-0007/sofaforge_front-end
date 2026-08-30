"use client";

import { ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminShell from "../AdminShell";
import { relativeTime, useMoney } from "../adminUtils";
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

const STATUS_TONE = { active: "info", converted: "success", abandoned: "warning" } as const;

/**
 * Open and abandoned carts.
 *
 * Reminder consent is shown per row on purpose: it is the one fact that decides
 * whether the owner may contact that shopper at all, so it belongs next to the
 * cart rather than buried in the reminder screen.
 */
export default function Carts() {
  const { format } = useMoney();
  const carts = trpc.admin.listCarts.useQuery(undefined, { retry: false });
  const [filter, setFilter] = useState<"all" | "active" | "abandoned" | "converted">("all");

  const databaseReady = Boolean(carts.data) && !carts.error;
  const rows = carts.data ?? [];

  const counts = useMemo(
    () => ({
      all: rows.length,
      active: rows.filter(row => row.status === "active").length,
      abandoned: rows.filter(row => row.status === "abandoned").length,
      converted: rows.filter(row => row.status === "converted").length,
    }),
    [rows],
  );

  const openValue = useMemo(
    () => rows.filter(row => row.status !== "converted").reduce((sum, row) => sum + row.subtotal, 0),
    [rows],
  );

  const visible = filter === "all" ? rows : rows.filter(row => row.status === filter);

  return (
    <AdminShell title="Carts" breadcrumb="Customers">
      <PageHead
        title="Carts"
        description="What shoppers have in their baskets right now, and what was left behind."
      />

      <Stack gap={16}>
        {!databaseReady ? (
          <Notice tone="warning" title="The database is not connected.">
            Cart activity appears here once the connection is live.
          </Notice>
        ) : null}

        <Grid min={200}>
          <Stat label="Open carts" value={counts.active} icon={ShoppingBag} loading={carts.isLoading} />
          <Stat label="Abandoned" value={counts.abandoned} loading={carts.isLoading} />
          <Stat label="Value still open" value={format(openValue)} loading={carts.isLoading} />
          <Stat label="Converted" value={counts.converted} loading={carts.isLoading} />
        </Grid>

        <Card flush title="Cart activity">
          <div style={{ padding: "12px 16px 0" }}>
            <FilterBar
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All", count: counts.all },
                { value: "active", label: "Active", count: counts.active },
                { value: "abandoned", label: "Abandoned", count: counts.abandoned },
                { value: "converted", label: "Converted", count: counts.converted },
              ]}
            />
          </div>

          {carts.isLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : visible.length === 0 ? (
            <EmptyState title="No carts to show" icon={ShoppingBag}>
              Carts appear as soon as a shopper adds something.
            </EmptyState>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>Cart</th>
                  <th>Shopper</th>
                  <th className="sfa-table__num">Subtotal</th>
                  <th>Status</th>
                  <th>Reminders</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(row => (
                  <tr key={row.id}>
                    <td className="sfa-table__primary sfa-mono">#{row.id}</td>
                    <td className="sfa-table__muted">{row.customerEmail ?? "Guest"}</td>
                    <td className="sfa-table__num">{format(row.subtotal)}</td>
                    <td>
                      <Badge tone={STATUS_TONE[row.status as keyof typeof STATUS_TONE]} dot>
                        {row.status}
                      </Badge>
                    </td>
                    <td>
                      {row.reminderConsent === "true" ? (
                        <Badge tone="success">Consented</Badge>
                      ) : (
                        <span className="sfa-table__muted" style={{ fontSize: 12.5 }}>
                          No consent
                        </span>
                      )}
                    </td>
                    <td className="sfa-table__muted">{relativeTime(row.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>

        <Notice tone="info" title="Only consented carts can be reminded.">
          A reminder can be drafted only for a shopper who agreed to receive one. Rows marked “No consent” are excluded
          by the server, not just hidden here.
        </Notice>
      </Stack>
    </AdminShell>
  );
}
