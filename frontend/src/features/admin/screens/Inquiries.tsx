"use client";

import { Mail, MailOpen, MessageSquareText, Reply } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminShell from "../AdminShell";
import { formatDateTime, relativeTime } from "../adminUtils";
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
} from "../ui";

const STATUSES = ["new", "read", "replied"] as const;
type InquiryStatus = (typeof STATUSES)[number];
const TONE: Record<InquiryStatus, "warning" | "info" | "success"> = { new: "warning", read: "info", replied: "success" };

export default function Inquiries() {
  const utils = trpc.useUtils();
  const inquiries = trpc.admin.listInquiries.useQuery(undefined, { retry: false });
  const updateStatus = trpc.admin.updateInquiryStatus.useMutation();
  const [filter, setFilter] = useState<InquiryStatus | "all">("new");

  const databaseReady = Boolean(inquiries.data) && !inquiries.error;
  const rows = inquiries.data ?? [];

  const counts = useMemo(() => {
    const byStatus = { new: 0, read: 0, replied: 0 } as Record<InquiryStatus, number>;
    for (const row of rows) byStatus[row.status as InquiryStatus] += 1;
    return byStatus;
  }, [rows]);

  const visible = filter === "all" ? rows : rows.filter(row => row.status === filter);

  const setStatus = async (id: number, status: InquiryStatus) => {
    if (!databaseReady) return;
    try {
      await updateStatus.mutateAsync({ id, status });
      await Promise.all([utils.admin.listInquiries.invalidate(), utils.admin.overview.invalidate()]);
      toast.success(`Marked ${status}`);
    } catch (error) {
      toast.error("Could not update the inquiry", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <AdminShell title="Inquiries" breadcrumb="Store">
      <PageHead
        title="Inquiries"
        description="Messages sent through the contact form. Replies go out from your own email client."
        badge={counts.new > 0 ? <Badge tone="warning">{counts.new} unread</Badge> : null}
      />

      <Stack gap={16}>
        {!databaseReady ? (
          <Notice tone="warning" title="The database is not connected.">
            Contact form messages arrive here once the connection is live.
          </Notice>
        ) : null}

        <Grid min={200}>
          <Stat label="Unread" value={counts.new} icon={Mail} loading={inquiries.isLoading} />
          <Stat label="Read" value={counts.read} icon={MailOpen} loading={inquiries.isLoading} />
          <Stat label="Replied" value={counts.replied} icon={Reply} loading={inquiries.isLoading} />
          <Stat label="Total" value={rows.length} loading={inquiries.isLoading} />
        </Grid>

        <Card title="Inbox">
          <FilterBar
            value={filter}
            onChange={setFilter}
            options={[
              { value: "new", label: "Unread", count: counts.new },
              { value: "read", label: "Read", count: counts.read },
              { value: "replied", label: "Replied", count: counts.replied },
              { value: "all", label: "All", count: rows.length },
            ]}
          />

          {inquiries.isLoading ? (
            <TableSkeleton rows={3} columns={2} />
          ) : visible.length === 0 ? (
            <EmptyState title={filter === "new" ? "Inbox is clear" : "Nothing here"} icon={MessageSquareText}>
              Messages from the storefront contact form land in this list.
            </EmptyState>
          ) : (
            <Stack gap={12}>
              {visible.map(row => (
                <article
                  key={row.id}
                  style={{
                    border: "1px solid var(--sfa-border)",
                    borderRadius: "var(--sfa-radius-sm)",
                    padding: 14,
                    background: row.status === "new" ? "var(--sfa-accent-soft)" : "var(--sfa-surface-2)",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <p style={{ fontWeight: 650, fontSize: 14 }}>
                        {row.firstName} {row.lastName}
                      </p>
                      <p className="sfa-help">
                        <a href={`mailto:${row.email}`} style={{ color: "var(--sfa-accent)" }}>
                          {row.email}
                        </a>
                        {" · "}
                        {row.category}
                        {" · "}
                        <span title={formatDateTime(row.createdAt)}>{relativeTime(row.createdAt)}</span>
                      </p>
                    </div>
                    <Badge tone={TONE[row.status as InquiryStatus]} dot>
                      {row.status}
                    </Badge>
                  </div>

                  <p style={{ marginBlockStart: 10, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {row.message}
                  </p>

                  <div style={{ display: "flex", gap: 6, marginBlockStart: 12, flexWrap: "wrap" }}>
                    <a
                      className="sfa-btn sfa-btn--primary sfa-btn--sm"
                      href={`mailto:${row.email}?subject=${encodeURIComponent(`Re: your ${row.category} inquiry`)}`}
                      // Marking replied on click is the honest signal: we know an
                      // email client opened, not that a message was actually sent.
                      onClick={() => void setStatus(row.id, "replied")}
                    >
                      <Reply size={14} aria-hidden="true" />
                      Reply by email
                    </a>
                    {row.status === "new" ? (
                      <Button size="sm" icon={MailOpen} disabled={!databaseReady} onClick={() => void setStatus(row.id, "read")}>
                        Mark read
                      </Button>
                    ) : null}
                    {row.status !== "replied" ? (
                      <Button size="sm" disabled={!databaseReady} onClick={() => void setStatus(row.id, "replied")}>
                        Mark replied
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))}
            </Stack>
          )}
        </Card>
      </Stack>
    </AdminShell>
  );
}
