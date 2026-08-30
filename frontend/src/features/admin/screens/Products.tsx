"use client";

import { Boxes, Copy, Eye, EyeOff, Pencil, Plus, Search, SlidersHorizontal, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminShell from "../AdminShell";
import { GalleryInput, ImageInput } from "../ImagePicker";
import { formatDate, parseGallery, slugify, useMoney } from "../adminUtils";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FilterBar,
  Grid,
  Notice,
  PageHead,
  RowActions,
  Stack,
  TableSkeleton,
  TableWrap,
} from "../ui";

type ProductRow = {
  id: number;
  seriesId: number;
  name: string;
  slug: string;
  description: string | null;
  startingPrice: number;
  imageUrl: string | null;
  gallery: string | null;
  isCustom: "true" | "false";
  isVisible: "true" | "false";
  isFeatured: "true" | "false";
  sortOrder: number;
  createdAt: Date | string;
};

type Draft = {
  id?: number;
  seriesId: number;
  name: string;
  slug: string;
  description: string;
  startingPrice: string;
  imageUrl: string;
  gallery: string;
  isCustom: boolean;
  isVisible: boolean;
  isFeatured: boolean;
  sortOrder: number;
};

const blankDraft = (seriesId: number): Draft => ({
  seriesId,
  name: "",
  slug: "",
  description: "",
  startingPrice: "",
  imageUrl: "",
  gallery: "",
  isCustom: true,
  isVisible: true,
  isFeatured: false,
  sortOrder: 0,
});

type Filter = "all" | "published" | "hidden" | "featured";

export default function Products() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { format, symbol } = useMoney();

  const products = trpc.admin.listProducts.useQuery(undefined, { retry: false });
  const collections = trpc.admin.listSeries.useQuery(undefined, { retry: false });
  const createProduct = trpc.admin.createProduct.useMutation();
  // Every product inherits the shared questions, so the form can say what a new
  // piece will already be configurable with before it is even saved.
  const sharedOptions = trpc.admin.options.globalGroups.useQuery(undefined, { retry: false });
  const updateProduct = trpc.admin.updateProduct.useMutation();
  const deleteProduct = trpc.admin.deleteProduct.useMutation();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const databaseReady = Boolean(products.data) && !products.error;
  const firstCollectionId = collections.data?.[0]?.id ?? 1;

  // The dashboard's "Add product" button deep-links straight into the editor.
  useEffect(() => {
    if (searchParams?.get("new") === "1") setDraft(blankDraft(firstCollectionId));
  }, [searchParams, firstCollectionId]);

  const rows = (products.data ?? []) as ProductRow[];

  const counts = useMemo(
    () => ({
      all: rows.length,
      published: rows.filter(row => row.isVisible === "true").length,
      hidden: rows.filter(row => row.isVisible === "false").length,
      featured: rows.filter(row => row.isFeatured === "true").length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(row => {
      if (filter === "published" && row.isVisible !== "true") return false;
      if (filter === "hidden" && row.isVisible !== "false") return false;
      if (filter === "featured" && row.isFeatured !== "true") return false;
      if (!term) return true;
      return row.name.toLowerCase().includes(term) || row.slug.toLowerCase().includes(term);
    });
  }, [rows, filter, search]);

  const collectionName = (id: number) => collections.data?.find(entry => entry.id === id)?.name ?? `#${id}`;

  const startEdit = (row: ProductRow) => {
    setDraft({
      id: row.id,
      seriesId: row.seriesId,
      name: row.name,
      slug: row.slug,
      description: row.description ?? "",
      startingPrice: String(row.startingPrice / 100),
      imageUrl: row.imageUrl ?? "",
      gallery: parseGallery(row.gallery).join("\n"),
      isCustom: row.isCustom === "true",
      isVisible: row.isVisible === "true",
      isFeatured: row.isFeatured === "true",
      sortOrder: row.sortOrder,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const duplicate = (row: ProductRow) => {
    startEdit(row);
    setDraft(previous =>
      previous ? { ...previous, id: undefined, name: `${row.name} (copy)`, slug: `${row.slug}-copy` } : previous,
    );
    toast.info("Duplicated into the editor", { description: "Nothing is saved until you press Save product." });
  };

  // The gallery is stored as one newline-separated string; the picker works in
  // a list, so the two representations meet here.
  const galleryList = draft ? draft.gallery.split(/\r?\n/).map(line => line.trim()).filter(Boolean) : [];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    if (!databaseReady) {
      toast.info("Database connection required", { description: "Saving unlocks once the database is connected." });
      return;
    }

    // Prices are entered in whole currency but stored as minor units, so the
    // conversion happens exactly once, here.
    const priceMajor = Number(draft.startingPrice);
    if (!Number.isFinite(priceMajor) || priceMajor < 0) {
      toast.error("Enter a valid price");
      return;
    }

    const payload = {
      seriesId: draft.seriesId,
      name: draft.name,
      slug: draft.slug || slugify(draft.name),
      description: draft.description || null,
      startingPrice: Math.round(priceMajor * 100),
      imageUrl: draft.imageUrl || null,
      gallery: JSON.stringify(draft.gallery.split("\n").map(line => line.trim()).filter(Boolean)),
      isCustom: (draft.isCustom ? "true" : "false") as "true" | "false",
      isVisible: (draft.isVisible ? "true" : "false") as "true" | "false",
      isFeatured: (draft.isFeatured ? "true" : "false") as "true" | "false",
      sortOrder: draft.sortOrder,
    };

    try {
      if (draft.id) {
        await updateProduct.mutateAsync({ ...payload, id: draft.id });
        await Promise.all([utils.admin.listProducts.invalidate(), utils.commerce.getProducts.invalidate()]);
        setDraft(null);
        toast.success("Product updated");
        return;
      }

      const created = await createProduct.mutateAsync(payload);
      await Promise.all([utils.admin.listProducts.invalidate(), utils.commerce.getProducts.invalidate()]);
      setDraft(null);
      // A made-to-order piece is not finished until its configurator exists, so
      // a new product hands straight over to the options builder rather than
      // dropping the owner back on a list.
      toast.success("Product added", { description: "Now set the options a shopper configures." });
      router.push(`/admin/products/${created.id}/options`);
    } catch (error) {
      toast.error("Product could not be saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const toggleVisibility = async (row: ProductRow) => {
    if (!databaseReady) return;
    try {
      await updateProduct.mutateAsync({
        id: row.id,
        seriesId: row.seriesId,
        name: row.name,
        slug: row.slug,
        description: row.description,
        startingPrice: row.startingPrice,
        imageUrl: row.imageUrl,
        gallery: row.gallery,
        isCustom: row.isCustom,
        isVisible: row.isVisible === "true" ? "false" : "true",
        isFeatured: row.isFeatured,
        sortOrder: row.sortOrder,
      });
      await Promise.all([utils.admin.listProducts.invalidate(), utils.commerce.getProducts.invalidate()]);
      toast.success(row.isVisible === "true" ? "Hidden from the storefront" : "Published to the storefront");
    } catch (error) {
      toast.error("Could not change visibility", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const remove = async (row: ProductRow) => {
    if (!databaseReady) return;
    if (!window.confirm(`Delete "${row.name}"? Its variants and storefront placements go with it. This cannot be undone.`)) {
      return;
    }
    try {
      await deleteProduct.mutateAsync({ id: row.id });
      await Promise.all([utils.admin.listProducts.invalidate(), utils.commerce.getProducts.invalidate()]);
      toast.success("Product deleted");
    } catch (error) {
      toast.error("Product could not be deleted", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <AdminShell title="All products" breadcrumb="Catalog">
      <PageHead
        title="Products"
        description="Everything you sell. Publish, price and configure each piece here."
        badge={databaseReady ? <Badge tone="neutral">{counts.all}</Badge> : null}
        actions={
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setDraft(blankDraft(firstCollectionId))}
          >
            Add product
          </Button>
        }
      />

      <Stack gap={16}>
        {!databaseReady ? (
          <Notice tone="warning" title="The database is not connected.">
            The catalog editor below is fully built. It will list and save real products as soon as the connection is
            live.
          </Notice>
        ) : null}

        {draft ? (
          <Card
            title={draft.id ? `Edit “${draft.name || "product"}”` : "Add a new product"}
            description={
              draft.id
                ? "Prices are entered in whole currency and stored to the cent."
                : "Save this, then set the options a shopper configures — depth, material, cushion style and the rest."
            }
            actions={<Button size="icon" variant="ghost" icon={X} title="Close editor" onClick={() => setDraft(null)} />}
          >
            <form onSubmit={submit}>
              <Stack gap={16}>
                <Grid min={260}>
                  <Field label="Product name" htmlFor="p-name">
                    <input
                      id="p-name"
                      className="sfa-input"
                      required
                      value={draft.name}
                      onChange={event => {
                        const name = event.target.value;
                        setDraft(previous =>
                          previous
                            ? {
                                ...previous,
                                name,
                                // Only auto-fill the slug while it is untouched,
                                // so renaming a live product cannot break its URL.
                                slug: previous.id ? previous.slug : slugify(name),
                              }
                            : previous,
                        );
                      }}
                    />
                  </Field>
                  <Field
                    label="URL slug"
                    htmlFor="p-slug"
                    help={draft.id ? "Changing this breaks existing links to the product." : "Used in the storefront URL."}
                  >
                    <input
                      id="p-slug"
                      className="sfa-input sfa-input--mono"
                      required
                      value={draft.slug}
                      onChange={event => setDraft({ ...draft, slug: slugify(event.target.value) })}
                    />
                  </Field>
                  <Field label="Collection" htmlFor="p-series">
                    <select
                      id="p-series"
                      className="sfa-select"
                      value={draft.seriesId}
                      onChange={event => setDraft({ ...draft, seriesId: Number(event.target.value) })}
                    >
                      {(collections.data ?? []).map(entry => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                      {(collections.data ?? []).length === 0 ? <option value={1}>No collections yet</option> : null}
                    </select>
                  </Field>
                  <Field label={`Starting price (${symbol})`} htmlFor="p-price" help="The from-price before options add to it.">
                    <input
                      id="p-price"
                      className="sfa-input"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={draft.startingPrice}
                      onChange={event => setDraft({ ...draft, startingPrice: event.target.value })}
                    />
                  </Field>
                </Grid>

                <Field label="Description" htmlFor="p-desc">
                  <textarea
                    id="p-desc"
                    className="sfa-textarea"
                    rows={4}
                    value={draft.description}
                    onChange={event => setDraft({ ...draft, description: event.target.value })}
                  />
                </Field>

                <Grid min={260}>
                  <Field label="Main photo" help="The one shoppers see in the shop list and at the top of the page.">
                    <ImageInput
                      value={draft.imageUrl}
                      onChange={next => setDraft({ ...draft, imageUrl: next })}
                    />
                  </Field>
                  <Field label="Sort order" htmlFor="p-sort" help="Lower numbers appear first.">
                    <input
                      id="p-sort"
                      className="sfa-input"
                      type="number"
                      min="0"
                      value={draft.sortOrder}
                      onChange={event => setDraft({ ...draft, sortOrder: Number(event.target.value) })}
                    />
                  </Field>
                </Grid>

                <Field label="More photos" help="Extra angles and details, shown after the main photo.">
                  <GalleryInput
                    value={galleryList}
                    onChange={next => setDraft({ ...draft, gallery: next.join("\n") })}
                  />
                </Field>

                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                  <Toggle
                    label="Published"
                    checked={draft.isVisible}
                    onChange={next => setDraft({ ...draft, isVisible: next })}
                  />
                  <Toggle
                    label="Featured"
                    checked={draft.isFeatured}
                    onChange={next => setDraft({ ...draft, isFeatured: next })}
                  />
                  <Toggle
                    label="Made to order"
                    checked={draft.isCustom}
                    onChange={next => setDraft({ ...draft, isCustom: next })}
                  />
                </div>

                {(sharedOptions.data?.length ?? 0) > 0 ? (
                  <div
                    style={{
                      paddingBlockStart: 14,
                      borderBlockStart: "1px solid var(--sfa-border)",
                    }}
                  >
                    <div className="sfa-table__primary" style={{ fontSize: 13 }}>
                      Options this piece will already have
                    </div>
                    <p className="sfa-table__muted" style={{ fontSize: 12, marginBlock: "4px 10px" }}>
                      These questions are shared across the catalogue, so they apply the moment
                      {draft.id ? " this piece is saved" : " it is added"}. Anything specific to this
                      piece is added afterwards.
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {sharedOptions.data?.map(group => (
                        <span key={group.id} className="sfa-badge">
                          {group.label}
                          <span className="sfa-table__muted" style={{ marginInlineStart: 6 }}>
                            {group.choiceCount}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    paddingBlockStart: 14,
                    borderBlockStart: "1px solid var(--sfa-border)",
                  }}
                >
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!databaseReady || createProduct.isPending || updateProduct.isPending}
                  >
                    {databaseReady ? (draft.id ? "Save product" : "Add product") : "Connect database to save"}
                  </Button>
                  <Button onClick={() => setDraft(null)}>Cancel</Button>
                  {draft.id ? (
                    <Link href={`/admin/products/${draft.id}/options`} className="sfa-btn sfa-btn--secondary">
                      <SlidersHorizontal size={15} aria-hidden="true" />
                      Product options
                    </Link>
                  ) : null}
                </div>
              </Stack>
            </form>
          </Card>
        ) : null}

        <Card
          flush
          title="Catalog"
          actions={
            <div style={{ position: "relative", width: 240, maxWidth: "100%" }}>
              <Search
                size={14}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  insetInlineStart: 10,
                  insetBlockStart: 10,
                  color: "var(--sfa-text-muted)",
                }}
              />
              <input
                className="sfa-input"
                style={{ paddingInlineStart: 30 }}
                placeholder="Search products"
                value={search}
                aria-label="Search products"
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
                { value: "published", label: "Published", count: counts.published },
                { value: "hidden", label: "Hidden", count: counts.hidden },
                { value: "featured", label: "Featured", count: counts.featured },
              ]}
            />
          </div>

          {products.isLoading ? (
            <TableSkeleton rows={6} columns={5} />
          ) : visible.length === 0 ? (
            <EmptyState
              title={rows.length === 0 ? "No products yet" : "Nothing matches that"}
              icon={Boxes}
              action={
                rows.length === 0 ? (
                  <Button variant="primary" icon={Plus} onClick={() => setDraft(blankDraft(firstCollectionId))}>
                    Add your first product
                  </Button>
                ) : null
              }
            >
              {rows.length === 0
                ? "Add a piece and it appears on the storefront straight away."
                : "Try a different search term or filter."}
            </EmptyState>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Collection</th>
                  <th className="sfa-table__num">From</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visible.map(row => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {row.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- admin thumbnails are arbitrary remote URLs
                          <img
                            src={row.imageUrl}
                            alt=""
                            style={{ width: 34, height: 34, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 6,
                              background: "var(--sfa-surface-3)",
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Boxes size={15} style={{ color: "var(--sfa-text-muted)" }} />
                          </span>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div className="sfa-table__primary">{row.name}</div>
                          <div className="sfa-table__muted sfa-mono" style={{ fontSize: 11.5 }}>
                            /{row.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="sfa-table__muted">{collectionName(row.seriesId)}</td>
                    <td className="sfa-table__num">{format(row.startingPrice)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <Badge tone={row.isVisible === "true" ? "success" : "neutral"} dot>
                          {row.isVisible === "true" ? "Published" : "Hidden"}
                        </Badge>
                        {row.isFeatured === "true" ? (
                          <Badge tone="accent">
                            <Star size={11} aria-hidden="true" />
                            Featured
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="sfa-table__muted">{formatDate(row.createdAt)}</td>
                    <td>
                      <RowActions>
                        <Link
                          href={`/admin/products/${row.id}/options`}
                          className="sfa-btn sfa-btn--ghost sfa-btn--sm"
                          title="Product options"
                        >
                          <SlidersHorizontal size={14} aria-hidden="true" />
                          Options
                        </Link>
                        <Button size="icon" variant="ghost" icon={Pencil} title="Edit" onClick={() => startEdit(row)} />
                        <Button size="icon" variant="ghost" icon={Copy} title="Duplicate" onClick={() => duplicate(row)} />
                        <Button
                          size="icon"
                          variant="ghost"
                          icon={row.isVisible === "true" ? EyeOff : Eye}
                          title={row.isVisible === "true" ? "Hide" : "Publish"}
                          disabled={!databaseReady}
                          onClick={() => void toggleVisibility(row)}
                        />
                        <Button
                          size="icon"
                          variant="danger"
                          icon={Trash2}
                          title="Delete"
                          disabled={!databaseReady || deleteProduct.isPending}
                          onClick={() => void remove(row)}
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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="sfa-switch">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
      <span className="sfa-switch__track" aria-hidden="true" />
      <span style={{ fontSize: 13.5 }}>{label}</span>
    </label>
  );
}
