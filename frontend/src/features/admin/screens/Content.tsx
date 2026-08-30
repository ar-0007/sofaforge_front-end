"use client";

import { LayoutTemplate, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminShell from "../AdminShell";
import { ImageInput } from "../ImagePicker";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Grid,
  Notice,
  PageHead,
  RowActions,
  Stack,
  TableSkeleton,
  TableWrap,
} from "../ui";

/** The slots the storefront reads. Free text is allowed, but these are the ones that exist. */
const KNOWN_SLOTS = [
  "home.hero",
  "home.featured",
  "home.editorial",
  "home.collections",
  "shop.banner",
  "product.upsell",
  "footer.promo",
];

type Draft = {
  id?: number;
  slot: string;
  entityType: "product" | "series" | "custom";
  entityId: string;
  heading: string;
  subheading: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  sortOrder: number;
  isVisible: boolean;
};

const blank = (): Draft => ({
  slot: "home.featured",
  entityType: "custom",
  entityId: "",
  heading: "",
  subheading: "",
  imageUrl: "",
  ctaLabel: "",
  ctaHref: "",
  sortOrder: 0,
  isVisible: true,
});

/**
 * Storefront content placements: what shows in the hero, what is featured on
 * the home page, which banner sits above the shop. Editing here changes the
 * public site without a deploy.
 */
export default function Content() {
  const utils = trpc.useUtils();
  const placements = trpc.admin.listPlacements.useQuery(undefined, { retry: false });
  const products = trpc.admin.listProducts.useQuery(undefined, { retry: false });
  const collections = trpc.admin.listSeries.useQuery(undefined, { retry: false });
  const savePlacement = trpc.admin.savePlacement.useMutation();
  const deletePlacement = trpc.admin.deletePlacement.useMutation();

  const [draft, setDraft] = useState<Draft | null>(null);

  const databaseReady = Boolean(placements.data) && !placements.error;
  const rows = placements.data ?? [];

  const linkedName = (type: string, id: number | null) => {
    if (id === null) return "—";
    if (type === "product") return products.data?.find(entry => entry.id === id)?.name ?? `Product #${id}`;
    if (type === "series") return collections.data?.find(entry => entry.id === id)?.name ?? `Collection #${id}`;
    return "—";
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || !databaseReady) {
      toast.info("Database connection required");
      return;
    }
    try {
      await savePlacement.mutateAsync({
        id: draft.id,
        slot: draft.slot,
        entityType: draft.entityType,
        entityId: draft.entityId ? Number(draft.entityId) : null,
        heading: draft.heading || null,
        subheading: draft.subheading || null,
        imageUrl: draft.imageUrl || null,
        ctaLabel: draft.ctaLabel || null,
        ctaHref: draft.ctaHref || null,
        sortOrder: draft.sortOrder,
        isVisible: draft.isVisible ? "true" : "false",
      });
      await Promise.all([utils.admin.listPlacements.invalidate(), utils.commerce.getPlacements.invalidate()]);
      setDraft(null);
      toast.success("Placement saved");
    } catch (error) {
      toast.error("Placement could not be saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const remove = async (id: number, slot: string) => {
    if (!databaseReady) return;
    if (!window.confirm(`Remove the placement in "${slot}"?`)) return;
    try {
      await deletePlacement.mutateAsync({ id });
      await Promise.all([utils.admin.listPlacements.invalidate(), utils.commerce.getPlacements.invalidate()]);
      toast.success("Placement removed");
    } catch (error) {
      toast.error("Placement could not be removed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <AdminShell title="Storefront content" breadcrumb="Grow">
      <PageHead
        title="Storefront content"
        description="Control the hero, featured rows and banners on the public site — no deploy needed."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setDraft(blank())}>
            Add placement
          </Button>
        }
      />

      <Stack gap={16}>
        {!databaseReady ? (
          <Notice tone="warning" title="The database is not connected.">
            Placements will save and appear on the storefront once the connection is live.
          </Notice>
        ) : null}

        {draft ? (
          <Card
            title={draft.id ? "Edit placement" : "New placement"}
            description="A placement fills one slot on the storefront."
            actions={<Button size="icon" variant="ghost" icon={X} title="Close" onClick={() => setDraft(null)} />}
          >
            <form onSubmit={submit}>
              <Stack gap={16}>
                <Grid min={240}>
                  <Field label="Slot" htmlFor="pl-slot" help="Where on the storefront this appears.">
                    <input
                      id="pl-slot"
                      className="sfa-input sfa-input--mono"
                      required
                      list="sfa-slots"
                      value={draft.slot}
                      onChange={event => setDraft({ ...draft, slot: event.target.value })}
                    />
                    <datalist id="sfa-slots">
                      {KNOWN_SLOTS.map(slot => (
                        <option key={slot} value={slot} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="Links to" htmlFor="pl-type">
                    <select
                      id="pl-type"
                      className="sfa-select"
                      value={draft.entityType}
                      onChange={event =>
                        setDraft({ ...draft, entityType: event.target.value as Draft["entityType"], entityId: "" })
                      }
                    >
                      <option value="custom">Nothing — free content</option>
                      <option value="product">A product</option>
                      <option value="series">A collection</option>
                    </select>
                  </Field>
                  {draft.entityType !== "custom" ? (
                    <Field label={draft.entityType === "product" ? "Product" : "Collection"} htmlFor="pl-entity">
                      <select
                        id="pl-entity"
                        className="sfa-select"
                        value={draft.entityId}
                        onChange={event => setDraft({ ...draft, entityId: event.target.value })}
                      >
                        <option value="">Choose…</option>
                        {(draft.entityType === "product" ? products.data ?? [] : collections.data ?? []).map(entry => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : null}
                  <Field label="Sort order" htmlFor="pl-sort">
                    <input
                      id="pl-sort"
                      className="sfa-input"
                      type="number"
                      min="0"
                      value={draft.sortOrder}
                      onChange={event => setDraft({ ...draft, sortOrder: Number(event.target.value) })}
                    />
                  </Field>
                </Grid>

                <Grid min={240}>
                  <Field label="Heading" htmlFor="pl-heading">
                    <input
                      id="pl-heading"
                      className="sfa-input"
                      value={draft.heading}
                      onChange={event => setDraft({ ...draft, heading: event.target.value })}
                    />
                  </Field>
                  <Field label="Photo">
                    <ImageInput
                      value={draft.imageUrl}
                      onChange={next => setDraft({ ...draft, imageUrl: next })}
                    />
                  </Field>
                  <Field label="Button label" htmlFor="pl-cta">
                    <input
                      id="pl-cta"
                      className="sfa-input"
                      value={draft.ctaLabel}
                      onChange={event => setDraft({ ...draft, ctaLabel: event.target.value })}
                    />
                  </Field>
                  <Field label="Button link" htmlFor="pl-href">
                    <input
                      id="pl-href"
                      className="sfa-input sfa-input--mono"
                      placeholder="/shop"
                      value={draft.ctaHref}
                      onChange={event => setDraft({ ...draft, ctaHref: event.target.value })}
                    />
                  </Field>
                </Grid>

                <Field label="Body copy" htmlFor="pl-sub">
                  <textarea
                    id="pl-sub"
                    className="sfa-textarea"
                    rows={3}
                    value={draft.subheading}
                    onChange={event => setDraft({ ...draft, subheading: event.target.value })}
                  />
                </Field>

                <label className="sfa-switch">
                  <input
                    type="checkbox"
                    checked={draft.isVisible}
                    onChange={event => setDraft({ ...draft, isVisible: event.target.checked })}
                  />
                  <span className="sfa-switch__track" aria-hidden="true" />
                  <span style={{ fontSize: 13.5 }}>Live on the storefront</span>
                </label>

                <div style={{ display: "flex", gap: 8, paddingBlockStart: 12, borderBlockStart: "1px solid var(--sfa-border)" }}>
                  <Button type="submit" variant="primary" disabled={!databaseReady || savePlacement.isPending}>
                    Save placement
                  </Button>
                  <Button onClick={() => setDraft(null)}>Cancel</Button>
                </div>
              </Stack>
            </form>
          </Card>
        ) : null}

        <Card flush title="Placements">
          {placements.isLoading ? (
            <TableSkeleton rows={4} columns={4} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No placements yet"
              icon={LayoutTemplate}
              action={
                <Button variant="primary" icon={Plus} onClick={() => setDraft(blank())}>
                  Add the first placement
                </Button>
              }
            >
              The storefront falls back to its built-in content until you set placements here.
            </EmptyState>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Heading</th>
                  <th>Links to</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td className="sfa-table__primary sfa-mono">{row.slot}</td>
                    <td>{row.heading ?? <span className="sfa-table__muted">No heading</span>}</td>
                    <td className="sfa-table__muted">{linkedName(row.entityType, row.entityId)}</td>
                    <td>
                      <Badge tone={row.isVisible === "true" ? "success" : "neutral"} dot>
                        {row.isVisible === "true" ? "Live" : "Hidden"}
                      </Badge>
                    </td>
                    <td>
                      <RowActions>
                        <Button
                          size="icon"
                          variant="ghost"
                          icon={Pencil}
                          title="Edit"
                          onClick={() =>
                            setDraft({
                              id: row.id,
                              slot: row.slot,
                              entityType: row.entityType,
                              entityId: row.entityId ? String(row.entityId) : "",
                              heading: row.heading ?? "",
                              subheading: row.subheading ?? "",
                              imageUrl: row.imageUrl ?? "",
                              ctaLabel: row.ctaLabel ?? "",
                              ctaHref: row.ctaHref ?? "",
                              sortOrder: row.sortOrder,
                              isVisible: row.isVisible === "true",
                            })
                          }
                        />
                        <Button
                          size="icon"
                          variant="danger"
                          icon={Trash2}
                          title="Remove"
                          disabled={!databaseReady || deletePlacement.isPending}
                          onClick={() => void remove(row.id, row.slot)}
                        />
                      </RowActions>
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
