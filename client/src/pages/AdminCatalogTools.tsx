import React, { FormEvent, useMemo, useState } from "react";
import DashboardLayout, { type DashboardMenuItem } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Boxes, Image, LayoutDashboard, PackageOpen } from "lucide-react";
import { toast } from "sonner";

const menuItems: DashboardMenuItem[] = [
  { icon: LayoutDashboard, label: "Admin centre", path: "/admin" },
  { icon: Boxes, label: "Catalog tools", path: "/admin/catalog-tools" },
  { icon: PackageOpen, label: "View storefront", path: "/" },
];

type VariantForm = { id?: number; productId: number; name: string; price: number; sku: string };
const blankVariant: VariantForm = { productId: 1, name: "", price: 0, sku: "" };

function currency(cents: number) { return `$${(cents / 100).toLocaleString()}`; }

export default function AdminCatalogTools() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = isAuthenticated && user?.role === "admin";
  const utils = trpc.useUtils();
  const [variant, setVariant] = useState(blankVariant);
  const [selectedProductId, setSelectedProductId] = useState<number>(1);
  const [imageUrl, setImageUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState("");
  const products = trpc.admin.listProducts.useQuery(undefined, { enabled: isAdmin });
  const variants = trpc.admin.listVariants.useQuery(undefined, { enabled: isAdmin });
  const createVariant = trpc.admin.createVariant.useMutation();
  const updateVariant = trpc.admin.updateVariant.useMutation();
  const deleteVariant = trpc.admin.deleteVariant.useMutation();
  const updateProduct = trpc.admin.updateProduct.useMutation();
  const databaseReady = Boolean(products.data) && !products.error && !variants.error;

  const selectedProduct = useMemo(() => products.data?.find((item) => item.id === selectedProductId), [products.data, selectedProductId]);
  const stopIfDatabaseHeld = () => {
    if (databaseReady) return false;
    toast.info("Database connection required", { description: "This catalog tool is implemented and will unlock once you connect the database." });
    return true;
  };

  const saveVariant = async (event: FormEvent) => {
    event.preventDefault();
    if (stopIfDatabaseHeld()) return;
    const payload = { ...variant, sku: variant.sku || null };
    try {
      if (variant.id) await updateVariant.mutateAsync({ ...payload, id: variant.id });
      else await createVariant.mutateAsync(payload);
      await utils.admin.listVariants.invalidate();
      setVariant(blankVariant);
      toast.success("Variant saved");
    } catch (error) { toast.error("Variant could not be saved", { description: error instanceof Error ? error.message : "Please try again." }); }
  };

  const saveMedia = async (event: FormEvent) => {
    event.preventDefault();
    if (stopIfDatabaseHeld() || !selectedProduct) return;
    try {
      await updateProduct.mutateAsync({
        id: selectedProduct.id,
        seriesId: selectedProduct.seriesId,
        name: selectedProduct.name,
        slug: selectedProduct.slug,
        description: selectedProduct.description,
        startingPrice: selectedProduct.startingPrice,
        imageUrl: imageUrl || null,
        gallery: JSON.stringify(galleryUrls.split("\n").map((url) => url.trim()).filter(Boolean)),
        isCustom: selectedProduct.isCustom,
        isVisible: selectedProduct.isVisible,
        isFeatured: selectedProduct.isFeatured,
        sortOrder: selectedProduct.sortOrder,
      });
      await Promise.all([utils.admin.listProducts.invalidate(), utils.commerce.getProducts.invalidate()]);
      toast.success("Product media saved");
    } catch (error) { toast.error("Product media could not be saved", { description: error instanceof Error ? error.message : "Please try again." }); }
  };

  if (!isAdmin) return <DashboardLayout menuItems={menuItems} title="Catalog tools" requireAdmin><div /></DashboardLayout>;

  return <DashboardLayout menuItems={menuItems} title="Catalog tools" requireAdmin><main className="mx-auto max-w-6xl space-y-8 pb-12"><header className="border-b border-[#decfbd] pb-7"><p className="eyebrow">Admin workspace</p><h1 className="font-display mt-3 text-5xl tracking-[-0.04em]">Catalog tools.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#766b5d]">Build product variants and curate the image galleries that appear across Sofa Co.</p></header><div role="status" className={`border p-5 text-sm ${databaseReady ? "border-[#a5b4a0] bg-[#f1f6ef] text-[#39543d]" : "border-[#d69b7c] bg-[#fff5ed] text-[#6f3e25]"}`}>{databaseReady ? "Database connected. Catalog media and variants can be saved." : "Database connection is on hold. These catalog tools are implemented and will persist changes once a database is connected."}</div><section className="grid gap-8 xl:grid-cols-2"><form onSubmit={saveVariant} className="soft-card space-y-4 p-6"><div className="flex items-center gap-3"><Boxes size={19} className="text-[#9b6e4b]" /><h2 className="font-display text-3xl">Product variants</h2></div><select value={variant.productId} onChange={(event) => setVariant({ ...variant, productId: Number(event.target.value) })} className="h-10 w-full border border-[#decfbd] bg-transparent px-3 text-sm">{products.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Input required value={variant.name} onChange={(event) => setVariant({ ...variant, name: event.target.value })} placeholder="Variant name" /><Input required type="number" min="0" value={variant.price} onChange={(event) => setVariant({ ...variant, price: Number(event.target.value) })} placeholder="Price in cents" /><Input value={variant.sku} onChange={(event) => setVariant({ ...variant, sku: event.target.value })} placeholder="Optional SKU" /><Button type="submit" disabled={!databaseReady || createVariant.isPending || updateVariant.isPending} className="w-full rounded-none bg-[#25221d] text-[#f8f4ec]">{databaseReady ? variant.id ? "Save variant" : "Add variant" : "Connect database to save"}</Button><div className="border-t border-[#eee1d0] pt-4">{variants.data?.length ? variants.data.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span>{item.name} <span className="text-[#766b5d]">· {currency(item.price)}</span></span><span className="flex gap-2"><Button type="button" variant="ghost" onClick={() => setVariant({ id: item.id, productId: item.productId, name: item.name, price: item.price, sku: item.sku || "" })}>Edit</Button><Button type="button" variant="ghost" disabled={!databaseReady || deleteVariant.isPending} onClick={async () => { if (stopIfDatabaseHeld()) return; await deleteVariant.mutateAsync({ id: item.id }); await utils.admin.listVariants.invalidate(); toast.success("Variant removed"); }}>Remove</Button></span></div>) : <p className="text-sm text-[#766b5d]">No variants available until database data is connected.</p>}</div></form><form onSubmit={saveMedia} className="soft-card space-y-4 p-6"><div className="flex items-center gap-3"><Image size={19} className="text-[#9b6e4b]" /><h2 className="font-display text-3xl">Product media</h2></div><select value={selectedProductId} onChange={(event) => { const id = Number(event.target.value); setSelectedProductId(id); const item = products.data?.find((product) => product.id === id); setImageUrl(item?.imageUrl || ""); try { setGalleryUrls(JSON.parse(item?.gallery || "[]").join("\n")); } catch { setGalleryUrls(""); } }} className="h-10 w-full border border-[#decfbd] bg-transparent px-3 text-sm">{products.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Primary image URL" /><Textarea rows={8} value={galleryUrls} onChange={(event) => setGalleryUrls(event.target.value)} placeholder="Gallery image URLs — one URL per line" /><p className="text-xs leading-5 text-[#766b5d]">Images are stored as URLs. Keep originals in managed file storage and paste their hosted URLs here when the database is connected.</p><Button type="submit" disabled={!databaseReady || updateProduct.isPending} className="w-full rounded-none bg-[#25221d] text-[#f8f4ec]">{databaseReady ? "Save product media" : "Connect database to save"}</Button></form></section></main></DashboardLayout>;
}
