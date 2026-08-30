"use client";

import { Layers, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminShell from "../AdminShell";
import { ImageInput } from "../ImagePicker";
import { slugify } from "../adminUtils";
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

type Draft = {
  id?: number;
  /** Empty string means this is a top-level category. */
  parentId: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  isVisible: boolean;
  sortOrder: number;
};

const blank = (parentId = ""): Draft => ({
  parentId,
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  isVisible: true,
  sortOrder: 0,
});

/**
 * The browse tree the shop is built on.
 *
 * Two levels, matching how a shopper actually looks for a sofa: a category
 * ("Sectionals") holds collections ("Bobby", "Stanton"), and products hang off
 * the collections. A row with no parent is a top-level entry on /shop.
 */
export default function Collections() {
  const utils = trpc.useUtils();
  const collections = trpc.admin.listSeries.useQuery(undefined, { retry: false });
  const products = trpc.admin.listProducts.useQuery(undefined, { retry: false });
  const createSeries = trpc.admin.createSeries.useMutation();
  const updateSeries = trpc.admin.updateSeries.useMutation();
  const deleteSeries = trpc.admin.deleteSeries.useMutation();

  const [draft, setDraft] = useState<Draft | null>(null);

  const databaseReady = Boolean(collections.data) && !collections.error;
  const rows = collections.data ?? [];

  const productCount = useMemo(() => {
    const counts = new Map<number, number>();
    for (const product of products.data ?? []) {
      counts.set(product.seriesId, (counts.get(product.seriesId) ?? 0) + 1);
    }
    return counts;
  }, [products.data]);

  const categories = useMemo(() => rows.filter(row => row.parentId === null), [rows]);

  /** Categories first, each followed by the collections inside it. */
  const tree = useMemo(() => {
    const childrenByParent = new Map<number, typeof rows>();
    for (const row of rows) {
      if (row.parentId === null) continue;
      childrenByParent.set(row.parentId, [...(childrenByParent.get(row.parentId) ?? []), row]);
    }

    const ordered: Array<{ row: (typeof rows)[number]; depth: 0 | 1 }> = [];
    for (const category of categories) {
      ordered.push({ row: category, depth: 0 });
      for (const child of childrenByParent.get(category.id) ?? []) ordered.push({ row: child, depth: 1 });
    }

    // A collection whose parent was deleted would otherwise vanish from this
    // screen entirely, leaving no way to reassign it.
    const placed = new Set(ordered.map(entry => entry.row.id));
    for (const row of rows) {
      if (!placed.has(row.id)) ordered.push({ row, depth: 1 });
    }
    return ordered;
  }, [rows, categories]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || !databaseReady) {
      toast.info("Database connection required");
      return;
    }
    const payload = {
      parentId: draft.parentId ? Number(draft.parentId) : null,
      name: draft.name,
      slug: draft.slug || slugify(draft.name),
      description: draft.description || null,
      imageUrl: draft.imageUrl || null,
      isVisible: (draft.isVisible ? "true" : "false") as "true" | "false",
      sortOrder: draft.sortOrder,
    };
    try {
      if (draft.id) await updateSeries.mutateAsync({ ...payload, id: draft.id });
      else await createSeries.mutateAsync(payload);
      await Promise.all([utils.admin.listSeries.invalidate(), utils.commerce.getSeries.invalidate()]);
      setDraft(null);
      toast.success(draft.id ? "Collection updated" : "Collection added");
    } catch (error) {
      toast.error("Collection could not be saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const remove = async (id: number, name: string) => {
    if (!databaseReady) return;
    if (!window.confirm(`Delete the "${name}" collection?`)) return;
    try {
      await deleteSeries.mutateAsync({ id });
      await Promise.all([utils.admin.listSeries.invalidate(), utils.commerce.getSeries.invalidate()]);
      toast.success("Collection deleted");
    } catch (error) {
      // The backend refuses while products still point at it — surface that
      // reason rather than a generic failure.
      toast.error("Collection could not be deleted", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <AdminShell title="Collections" breadcrumb="Catalog">
      <PageHead
        title="Categories & collections"
        description="How the shop is browsed: a category holds collections, and collections hold products."
        badge={databaseReady ? <Badge tone="neutral">{rows.length}</Badge> : null}
        actions={
          <>
            <Button icon={Plus} onClick={() => setDraft(blank())}>
              Add category
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              disabled={categories.length === 0}
              title={categories.length === 0 ? "Create a category first" : undefined}
              onClick={() => setDraft(blank(String(categories[0]!.id)))}
            >
              Add collection
            </Button>
          </>
        }
      />

      <Stack gap={16}>
        {!databaseReady ? (
          <Notice tone="warning" title="The database is not connected.">
            Collections will list and save here once the connection is live.
          </Notice>
        ) : null}

        {draft ? (
          <Card
            title={draft.id ? "Edit" : draft.parentId ? "New collection" : "New category"}
            actions={<Button size="icon" variant="ghost" icon={X} title="Close" onClick={() => setDraft(null)} />}
          >
            <form onSubmit={submit}>
              <Stack gap={16}>
                <Grid min={250}>
                  <Field
                    label="Sits inside"
                    htmlFor="c-parent"
                    help="Leave it top-level to appear on the shop's first screen."
                  >
                    <select
                      id="c-parent"
                      className="sfa-select"
                      value={draft.parentId}
                      onChange={event => setDraft({ ...draft, parentId: event.target.value })}
                    >
                      <option value="">Top-level category</option>
                      {categories
                        .filter(category => category.id !== draft.id)
                        .map(category => (
                          <option key={category.id} value={category.id}>
                            Inside {category.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="Name" htmlFor="c-name">
                    <input
                      id="c-name"
                      className="sfa-input"
                      required
                      value={draft.name}
                      onChange={event =>
                        setDraft({
                          ...draft,
                          name: event.target.value,
                          slug: draft.id ? draft.slug : slugify(event.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="URL slug" htmlFor="c-slug">
                    <input
                      id="c-slug"
                      className="sfa-input sfa-input--mono"
                      required
                      value={draft.slug}
                      onChange={event => setDraft({ ...draft, slug: slugify(event.target.value) })}
                    />
                  </Field>
                  <Field label="Cover photo" help="Shown on the collection card in the shop.">
                    <ImageInput
                      value={draft.imageUrl}
                      onChange={next => setDraft({ ...draft, imageUrl: next })}
                    />
                  </Field>
                  <Field label="Sort order" htmlFor="c-sort" help="Lower numbers appear first.">
                    <input
                      id="c-sort"
                      className="sfa-input"
                      type="number"
                      min="0"
                      value={draft.sortOrder}
                      onChange={event => setDraft({ ...draft, sortOrder: Number(event.target.value) })}
                    />
                  </Field>
                </Grid>
                <Field label="Description" htmlFor="c-desc">
                  <textarea
                    id="c-desc"
                    className="sfa-textarea"
                    rows={3}
                    value={draft.description}
                    onChange={event => setDraft({ ...draft, description: event.target.value })}
                  />
                </Field>
                <label className="sfa-switch">
                  <input
                    type="checkbox"
                    checked={draft.isVisible}
                    onChange={event => setDraft({ ...draft, isVisible: event.target.checked })}
                  />
                  <span className="sfa-switch__track" aria-hidden="true" />
                  <span style={{ fontSize: 13.5 }}>Visible on the storefront</span>
                </label>
                <div style={{ display: "flex", gap: 8, paddingBlockStart: 12, borderBlockStart: "1px solid var(--sfa-border)" }}>
                  <Button type="submit" variant="primary" disabled={!databaseReady || createSeries.isPending || updateSeries.isPending}>
                    {draft.id ? "Save" : draft.parentId ? "Add collection" : "Add category"}
                  </Button>
                  <Button onClick={() => setDraft(null)}>Cancel</Button>
                </div>
              </Stack>
            </form>
          </Card>
        ) : null}

        <Notice tone="info" title="How a shopper walks this.">
          The shop lists your categories first. Choosing one shows the collections inside it, and choosing a collection
          shows its products.
        </Notice>

        <Card flush title="Browse tree">
          {collections.isLoading ? (
            <TableSkeleton rows={4} columns={4} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No categories yet"
              icon={Layers}
              action={
                <Button variant="primary" icon={Plus} onClick={() => setDraft(blank())}>
                  Add the first category
                </Button>
              }
            >
              Start with a category such as Sectionals or Chairs, then add the collections that live inside it.
            </EmptyState>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>Category / collection</th>
                  <th className="sfa-table__num">Products</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {tree.map(({ row, depth }) => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ paddingInlineStart: depth * 22 }}>
                        <div className="sfa-table__primary" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          {row.name}
                          {depth === 0 ? <Badge tone="accent">Category</Badge> : null}
                        </div>
                        <div className="sfa-table__muted sfa-mono" style={{ fontSize: 11.5 }}>
                          /{row.slug}
                        </div>
                      </div>
                    </td>
                    <td className="sfa-table__num">{productCount.get(row.id) ?? 0}</td>
                    <td>
                      <Badge tone={row.isVisible === "true" ? "success" : "neutral"} dot>
                        {row.isVisible === "true" ? "Visible" : "Hidden"}
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
                              parentId: row.parentId ? String(row.parentId) : "",
                              name: row.name,
                              slug: row.slug,
                              description: row.description ?? "",
                              imageUrl: row.imageUrl ?? "",
                              isVisible: row.isVisible === "true",
                              sortOrder: row.sortOrder,
                            })
                          }
                        />
                        <Button
                          size="icon"
                          variant="danger"
                          icon={Trash2}
                          title="Delete"
                          disabled={!databaseReady || deleteSeries.isPending}
                          onClick={() => void remove(row.id, row.name)}
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
