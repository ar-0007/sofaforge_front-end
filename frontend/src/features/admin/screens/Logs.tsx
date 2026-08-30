"use client";

import { ScrollText } from "lucide-react";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminShell from "../AdminShell";
import { formatDateTime, relativeTime } from "../adminUtils";
import { Badge, Card, EmptyState, Notice, PageHead, Stack, TableSkeleton, TableWrap } from "../ui";

/** Colour by what the action did, not by which entity it touched. */
function toneFor(action: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (action.includes("deleted")) return "danger";
  if (action.includes("created")) return "success";
  if (action.includes("updated") || action.includes("status")) return "info";
  if (action.includes("reminder")) return "warning";
  return "neutral";
}

export default function Logs() {
  const logs = trpc.admin.listAuditLogs.useQuery(undefined, { retry: false });
  const users = trpc.admin.listUsers.useQuery(undefined, { retry: false });
  const [search, setSearch] = useState("");

  const rows = logs.data ?? [];
  const actorName = (id: number) => users.data?.find(user => user.id === id)?.name ?? `User #${id}`;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      row => row.action.toLowerCase().includes(term) || row.entityType.toLowerCase().includes(term),
    );
  }, [rows, search]);

  return (
    <AdminShell title="Activity log" breadcrumb="Tools">
      <PageHead
        title="Activity log"
        description="Who changed what, and when. The last fifty administrative actions."
      />

      <Stack gap={16}>
        {logs.error ? (
          <Notice tone="warning" title="The database is not connected.">
            Administrative actions are recorded here once the connection is live.
          </Notice>
        ) : null}

        <Notice tone="info" title="Secrets never appear in this log.">
          When a Conversions API token is saved, the log records that the setting changed and nothing about its value.
        </Notice>

        <Card
          flush
          title="Recent activity"
          actions={
            <input
              className="sfa-input"
              style={{ width: 220 }}
              placeholder="Filter by action"
              aria-label="Filter activity log"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          }
        >
          {logs.isLoading ? (
            <TableSkeleton rows={6} columns={4} />
          ) : visible.length === 0 ? (
            <EmptyState title={rows.length === 0 ? "Nothing logged yet" : "Nothing matches that"} icon={ScrollText}>
              Every create, update and delete made from this admin is recorded here.
            </EmptyState>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Record</th>
                  <th>By</th>
                  <th>Detail</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(row => (
                  <tr key={row.id}>
                    <td>
                      <Badge tone={toneFor(row.action)} dot>
                        {row.action.replace(/[._]/g, " ")}
                      </Badge>
                    </td>
                    <td className="sfa-table__muted">
                      {row.entityType}
                      {row.entityId ? ` #${row.entityId}` : ""}
                    </td>
                    <td className="sfa-table__muted">{actorName(row.adminUserId)}</td>
                    <td className="sfa-table__muted sfa-mono" style={{ maxWidth: 280, fontSize: 11.5 }}>
                      {row.metadata ?? "—"}
                    </td>
                    <td className="sfa-table__muted" title={formatDateTime(row.createdAt)}>
                      {relativeTime(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      </Stack>
    </AdminShell>
  );
}
