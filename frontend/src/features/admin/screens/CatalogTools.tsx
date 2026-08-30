"use client";

import { Boxes, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminShell from "../AdminShell";
import { GalleryInput, ImageInput } from "../ImagePicker";
import { parseGallery, useMoney } from "../adminUtils";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Notice,
  PageHead,
  RowActions,
  Stack,
  TableWrap,
} from "../ui";

type VariantDraft = { id?: number; productId: number; name: string; priceMajor: string; sku: string };

const blank = (productId: number): VariantDraft => ({ productId, name: "", priceMajor: "", sku: "" });

/**
 * Variants and media.
 *
 * Variants are fixed alternates of a product (a two-seater against a
 * three-seater). Configurator questions — depth, fabric, cushion style — live
 * in the product options builder instead, because those change the price of one
 * product rather than being a different product.
 */
export default function CatalogTools() {
  const utils = trpc.useUtils();
  const { format, symbol } = useMoney();

  const products = trpc.admin.listProducts.useQuery(undefined, { retry: false });
  const variants = trpc.admin.listVariants.useQuery(undefined, { retry: false });
  const createVariant = trpc.admin.createVariant.useMutation();
  const updateVariant = trpc.admin.updateVariant.useMutation();
  const deleteVariant = trpc.admin.deleteVariant.useMutation();
  const updateProduct = trpc.admin.updateProduct.useMutation();

  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [variant, setVariant] = useState<VariantDraft>(blank(0));
  const [imageUrl, setImageUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState("");

  const databaseReady = Boolean(products.data) && !products.error && !variants.error;
  const selectedProduct = useMemo(
    () => products.data?.find(item => item.id === selectedProductId),
    [products.data, selectedProductId],
  );

  // Pick the first product once the list arrives, and load its media into the
  // form so the fields are never showing another product's images.
  useEffect(() => {
    const first = products.data?.[0];
    if (!first || selectedProductId !== 0) return;
    setSelectedProductId(first.id);
    setVariant(blank(first.id));
    setImageUrl(first.imageUrl ?? "");
    setGalleryUrls(parseGallery(first.gallery).join("\n"));
  }, [products.data, selectedProductId]);

  const chooseProduct = (id: number) => {
    setSelectedProductId(id);
    setVariant(blank(id));
    const product = products.data?.find(item => item.id === id);
    setImageUrl(product?.imageUrl ?? "");
    setGalleryUrls(parseGallery(product?.gallery).join("\n"));
  };

  const heldBack = () => {
    if (databaseReady) return false;
    toast.info("Database connection required", {
      description: "This tool is implemented and will save once the database is connected.",
    });
    return true;
  };

  const saveVariant = async (event: FormEvent) => {
    event.preventDefault();
    if (heldBack()) return;
    const priceMajor = Number(variant.priceMajor);
    if (!Number.isFinite(priceMajor) || priceMajor < 0) {
      toast.error("Enter a valid price");
      return;
    }
    const payload = {
      productId: variant.productId,
      name: variant.name,
      price: Math.round(priceMajor * 100),
      sku: variant.sku || null,
    };
    try {
      if (variant.id) await updateVariant.mutateAsync({ ...payload, id: variant.id });
      else await createVariant.mutateAsync(payload);
      await utils.admin.listVariants.invalidate();
      setVariant(blank(selectedProductId));
      toast.success("Variant saved");
    } catch (error) {
      toast.error("Variant could not be saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const saveMedia = async (event: FormEvent) => {
    event.preventDefault();
    if (heldBack() || !selectedProduct) return;
    try {
      await updateProduct.mutateAsync({
        id: selectedProduct.id,
        seriesId: selectedProduct.seriesId,
        name: selectedProduct.name,
        slug: selectedProduct.slug,
        description: selectedProduct.description,
        startingPrice: selectedProduct.startingPrice,
        imageUrl: imageUrl || null,
        gallery: JSON.stringify(galleryUrls.split("\n").map(url => url.trim()).filter(Boolean)),
        isCustom: selectedProduct.isCustom,
        isVisible: selectedProduct.isVisible,
        isFeatured: selectedProduct.isFeatured,
        sortOrder: selectedProduct.sortOrder,
      });
      await Promise.all([utils.admin.listProducts.invalidate(), utils.commerce.getProducts.invalidate()]);
      toast.success("Product media saved");
    } catch (error) {
      toast.error("Product media could not be saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const productVariants = (variants.data ?? []).filter(item => item.productId === selectedProductId);
  const galleryList = galleryUrls.split(/\r?\n/).map(url => url.trim()).filter(Boolean);

  return (
    <AdminShell title="Variants & media" breadcrumb="Catalog">
      <PageHead
        title="Variants & media"
        description="Fixed alternates of a product, and the images shown on its page."
        actions={
          <select
            className="sfa-select"
            style={{ width: 240 }}
            aria-label="Choose a product"
            value={selectedProductId}
            onChange={event => chooseProduct(Number(event.target.value))}
          >
            {(products.data ?? []).map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
            {(products.data ?? []).length === 0 ? <option value={0}>No products yet</option> : null}
          </select>
        }
      />

      <Stack gap={16}>
        {!databaseReady ? (
          <Notice tone="warning" title="The database is not connected.">
            Both tools below are implemented and will persist changes once the connection is live.
          </Notice>
        ) : null}

        <Notice tone="info" title="Variants or options?">
          Use a variant when it is genuinely a different piece with its own price and SKU. Use{" "}
          <strong>Product options</strong> when the shopper is configuring one piece — depth, fabric, cushion style.
        </Notice>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }} className="sfa-dash-split">
          <Card
            title="Product variants"
            description={selectedProduct ? `For ${selectedProduct.name}` : undefined}
            flush
          >
            <form style={{ padding: 16, display: "block" }} onSubmit={saveVariant}>
              <Stack gap={12}>
                <Field label="Variant name" htmlFor="v-name">
                  <input
                    id="v-name"
                    className="sfa-input"
                    placeholder="Three-seater"
                    value={variant.name}
                    onChange={event => setVariant({ ...variant, name: event.target.value })}
                  />
                </Field>
                <Field label={`Price (${symbol})`} htmlFor="v-price">
                  <input
                    id="v-price"
                    className="sfa-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={variant.priceMajor}
                    onChange={event => setVariant({ ...variant, priceMajor: event.target.value })}
                  />
                </Field>
                <Field label="SKU" htmlFor="v-sku" help="Optional.">
                  <input
                    id="v-sku"
                    className="sfa-input sfa-input--mono"
                    value={variant.sku}
                    onChange={event => setVariant({ ...variant, sku: event.target.value })}
                  />
                </Field>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!databaseReady || createVariant.isPending || updateVariant.isPending}
                  >
                    {databaseReady ? (variant.id ? "Save variant" : "Add variant") : "Connect database to save"}
                  </Button>
                  {variant.id ? <Button onClick={() => setVariant(blank(selectedProductId))}>Cancel edit</Button> : null}
                </div>
              </Stack>
            </form>

            {productVariants.length === 0 ? (
              <EmptyState title="No variants on this product" icon={Boxes} />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th className="sfa-table__num">Price</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {productVariants.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div className="sfa-table__primary">{item.name}</div>
                        {item.sku ? (
                          <div className="sfa-table__muted sfa-mono" style={{ fontSize: 11.5 }}>
                            {item.sku}
                          </div>
                        ) : null}
                      </td>
                      <td className="sfa-table__num">{format(item.price)}</td>
                      <td>
                        <RowActions>
                          <Button
                            size="icon"
                            variant="ghost"
                            icon={Pencil}
                            title="Edit"
                            onClick={() =>
                              setVariant({
                                id: item.id,
                                productId: item.productId,
                                name: item.name,
                                priceMajor: String(item.price / 100),
                                sku: item.sku ?? "",
                              })
                            }
                          />
                          <Button
                            size="icon"
                            variant="danger"
                            icon={Trash2}
                            title="Remove"
                            disabled={!databaseReady || deleteVariant.isPending}
                            onClick={async () => {
                              if (heldBack()) return;
                              if (!window.confirm(`Remove the variant "${item.name}"?`)) return;
                              await deleteVariant.mutateAsync({ id: item.id });
                              await utils.admin.listVariants.invalidate();
                              toast.success("Variant removed");
                            }}
                          />
                        </RowActions>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </Card>

          <Card title="Product media" description="Upload photos from your computer — no links needed.">
            <form onSubmit={saveMedia}>
              <Stack gap={14}>
                <Field label="Main photo" help="The first thing a shopper sees.">
                  <ImageInput value={imageUrl} onChange={setImageUrl} />
                </Field>

                <Field label="Gallery photos" help="Shown after the main photo, in this order.">
                  <GalleryInput
                    value={galleryList}
                    onChange={next => setGalleryUrls(next.join("\n"))}
                  />
                </Field>

                <Button type="submit" variant="primary" disabled={!databaseReady || updateProduct.isPending}>
                  {databaseReady ? "Save product media" : "Connect database to save"}
                </Button>
              </Stack>
            </form>
          </Card>
        </div>
      </Stack>
    </AdminShell>
  );
}
