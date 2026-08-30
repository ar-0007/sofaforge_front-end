"use client";

import { Check, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminShell from "../AdminShell";
import { formatDate } from "../adminUtils";
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

const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
type ReviewStatus = (typeof REVIEW_STATUSES)[number];

const TONE: Record<ReviewStatus, "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export default function Reviews() {
  const utils = trpc.useUtils();
  const reviews = trpc.admin.listReviews.useQuery(undefined, { retry: false });
  const products = trpc.admin.listProducts.useQuery(undefined, { retry: false });
  const updateStatus = trpc.admin.updateReviewStatus.useMutation();

  const [filter, setFilter] = useState<ReviewStatus | "all">("pending");

  const databaseReady = Boolean(reviews.data) && !reviews.error;
  const rows = reviews.data ?? [];

  const counts = useMemo(() => {
    const byStatus = { pending: 0, approved: 0, rejected: 0 } as Record<ReviewStatus, number>;
    for (const row of rows) byStatus[row.status as ReviewStatus] += 1;
    return byStatus;
  }, [rows]);

  const averageRating = useMemo(() => {
    const approved = rows.filter(row => row.status === "approved");
    if (approved.length === 0) return null;
    return approved.reduce((sum, row) => sum + row.rating, 0) / approved.length;
  }, [rows]);

  const productName = (id: number) => products.data?.find(entry => entry.id === id)?.name ?? `Product #${id}`;
  const visible = filter === "all" ? rows : rows.filter(row => row.status === filter);

  const setStatus = async (id: number, status: ReviewStatus) => {
    if (!databaseReady) return;
    try {
      await updateStatus.mutateAsync({ id, status });
      await Promise.all([utils.admin.listReviews.invalidate(), utils.admin.overview.invalidate()]);
      toast.success(status === "approved" ? "Review published" : "Review rejected");
    } catch (error) {
      toast.error("Review could not be updated", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <AdminShell title="Reviews" breadcrumb="Store">
      <PageHead
        title="Reviews"
        description="Nothing appears on the storefront until you approve it."
        badge={counts.pending > 0 ? <Badge tone="warning">{counts.pending} waiting</Badge> : null}
      />

      <Stack gap={16}>
        {!databaseReady ? (
          <Notice tone="warning" title="The database is not connected.">
            Reviews appear here once the connection is live.
          </Notice>
        ) : null}

        <Grid min={200}>
          <Stat label="Waiting on you" value={counts.pending} icon={Star} loading={reviews.isLoading} />
          <Stat label="Published" value={counts.approved} loading={reviews.isLoading} />
          <Stat
            label="Average rating"
            value={averageRating === null ? "—" : `${averageRating.toFixed(1)} / 5`}
            loading={reviews.isLoading}
          />
          <Stat label="Rejected" value={counts.rejected} loading={reviews.isLoading} />
        </Grid>

        <Card flush title="Review queue">
          <div style={{ padding: "12px 16px 0" }}>
            <FilterBar
              value={filter}
              onChange={setFilter}
              options={[
                { value: "pending", label: "Pending", count: counts.pending },
                { value: "approved", label: "Approved", count: counts.approved },
                { value: "rejected", label: "Rejected", count: counts.rejected },
                { value: "all", label: "All", count: rows.length },
              ]}
            />
          </div>

          {reviews.isLoading ? (
            <TableSkeleton rows={4} columns={4} />
          ) : visible.length === 0 ? (
            <EmptyState title={filter === "pending" ? "Nothing waiting for approval" : "No reviews here"} icon={Star}>
              Approved reviews show on the product page with their rating.
            </EmptyState>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>Review</th>
                  <th>Product</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Left</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visible.map(row => (
                  <tr key={row.id}>
                    <td style={{ maxWidth: 380 }}>
                      <div className="sfa-table__primary">
                        {row.authorName}
                        {row.verifiedPurchase === "true" ? (
                          <Badge tone="success" >Verified buyer</Badge>
                        ) : null}
                      </div>
                      <p className="sfa-help" style={{ marginBlockStart: 3 }}>
                        {row.body}
                      </p>
                    </td>
                    <td className="sfa-table__muted">{productName(row.productId)}</td>
                    <td>
                      <span aria-label={`${row.rating} out of 5`} style={{ display: "inline-flex", gap: 1 }}>
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star
                            key={index}
                            size={13}
                            aria-hidden="true"
                            fill={index < row.rating ? "var(--sfa-warn)" : "none"}
                            style={{ color: index < row.rating ? "var(--sfa-warn)" : "var(--sfa-border-strong)" }}
                          />
                        ))}
                      </span>
                    </td>
                    <td>
                      <Badge tone={TONE[row.status as ReviewStatus]} dot>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="sfa-table__muted">{formatDate(row.createdAt)}</td>
                    <td>
                      <div className="sfa-row-actions">
                        {row.status !== "approved" ? (
                          <Button
                            size="sm"
                            icon={Check}
                            disabled={!databaseReady || updateStatus.isPending}
                            onClick={() => void setStatus(row.id, "approved")}
                          >
                            Approve
                          </Button>
                        ) : null}
                        {row.status !== "rejected" ? (
                          <Button
                            size="sm"
                            variant="danger"
                            icon={X}
                            disabled={!databaseReady || updateStatus.isPending}
                            onClick={() => void setStatus(row.id, "rejected")}
                          >
                            Reject
                          </Button>
                        ) : null}
                      </div>
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
