import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Heart, MessageCircle, Ruler, ShieldCheck, Truck } from "lucide-react";
import { Link, useRoute } from "wouter";
import StoreLayout from "@/components/StoreLayout";
import { OptimizedImage } from "@/components/OptimizedImage";
import { PriceLabel } from "@/components/StorefrontPrimitives";
import { catalogQueryOptions } from "@/lib/storefrontUi";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";

const fallbackImages = [
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1600&q=88",
  "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1600&q=88",
  "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1600&q=88",
];

const fabrics = [
  { name: "Belgian Linen", note: "soft · natural", add: 0, colour: "#d6c5ad" },
  { name: "Performance Velvet", note: "deep · luminous", add: 35000, colour: "#243b37" },
  { name: "Bouclé", note: "textured · warm", add: 50000, colour: "#e7ded0" },
  { name: "Washed Cotton", note: "relaxed · easy", add: 0, colour: "#8c847a" },
];
const colours = ["Natural Ivory", "Charcoal Grey", "Warm Taupe", "Forest Green"];
const sizes = [
  { label: "Standard", detail: "88\" wide", add: 0 },
  { label: "Extended", detail: "96\" wide", add: 40000 },
  { label: "Grand", detail: "108\" wide", add: 80000 },
];

export default function ProductDetail() {
  const [, params] = useRoute("/product/:slug");
  const slug = params?.slug || "";
  const { data: productBySlug, isLoading } = trpc.commerce.getProductBySlug.useQuery({ slug }, { ...catalogQueryOptions, enabled: Boolean(slug) });
  const product = productBySlug;
  const { addToCart } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedFabric, setSelectedFabric] = useState(fabrics[0].name);
  const [selectedColour, setSelectedColour] = useState(colours[0]);
  const [selectedSize, setSelectedSize] = useState(sizes[0].label);
  const [quantity, setQuantity] = useState(1);

  const gallery = useMemo(() => {
    const source = product?.imageUrl ? [product.imageUrl, ...fallbackImages] : fallbackImages;
    return Array.from(new Set(source));
  }, [product?.imageUrl]);
  const fabric = fabrics.find((item) => item.name === selectedFabric) || fabrics[0];
  const size = sizes.find((item) => item.label === selectedSize) || sizes[0];
  const totalPrice = product ? product.startingPrice + fabric.add + size.add : 0;

  if (isLoading && !product) return <StoreLayout><div className="flex min-h-[60vh] items-center justify-center"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="h-8 w-8 rounded-full border border-[#c58d5d] border-t-transparent" /></div></StoreLayout>;
  if (!product) return <StoreLayout><div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center"><p className="eyebrow">A quiet corner</p><h1 className="font-display mt-5 text-6xl">Piece not found.</h1><p className="mt-4 text-sm text-[#766b5d]">The piece you are looking for may have been archived.</p><Link href="/shop" className="editorial-link mt-9">Return to collection <ArrowRight size={15} /></Link></div></StoreLayout>;

  return (
    <StoreLayout>
      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-10 lg:px-16 lg:py-14">
        <Link href="/shop" className="mb-10 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#766b5d] transition-colors hover:text-[#25221d]"><ArrowLeft size={14} /> Back to collection</Link>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
          <section className="lg:col-span-7">
            <div className="relative overflow-hidden bg-[#e9dfd1]">
              <AnimatePresence mode="wait">
                <motion.div key={gallery[activeImage]} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} className="h-full w-full"><OptimizedImage src={gallery[activeImage]} alt={product.name} priority={activeImage === 0} sizes="(min-width: 1024px) 58vw, 100vw" className="aspect-[0.96] h-full w-full object-cover sm:aspect-[1.08]" /></motion.div>
              </AnimatePresence>
              <div className="absolute bottom-5 left-5 flex gap-2"><button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-[#f8f4ec]/90" onClick={() => setActiveImage((image) => (image - 1 + gallery.length) % gallery.length)} aria-label="Previous image"><ArrowLeft size={15} /></button><button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-[#f8f4ec]/90" onClick={() => setActiveImage((image) => (image + 1) % gallery.length)} aria-label="Next image"><ArrowRight size={15} /></button></div>
              <span className="absolute right-5 top-5 bg-[#f8f4ec]/90 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#766b5d]">Image {activeImage + 1} / {gallery.length}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">{gallery.slice(0, 3).map((image, index) => <button type="button" key={image} onClick={() => setActiveImage(index)} className={`relative overflow-hidden bg-[#e9dfd1] ${activeImage === index ? "ring-2 ring-[#c58d5d] ring-offset-2 ring-offset-[#f8f4ec]" : "opacity-60 transition-opacity hover:opacity-100"}`}><OptimizedImage src={image} alt={`${product.name} view ${index + 1}`} sizes="(min-width: 1024px) 28vw, 100vw" className="aspect-[1.1] h-full w-full object-cover" /></button>)}</div>
          </section>

          <section className="lg:col-span-5 lg:pt-6">
            <div className="flex items-start justify-between gap-5"><div><p className="eyebrow">Handcrafted in Canada</p><h1 className="font-display mt-4 text-6xl leading-[0.86] tracking-[-0.045em] sm:text-7xl">{product.name}</h1></div><button type="button" aria-label="Save product" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#decfbd] text-[#9b6e4b] transition-colors hover:bg-[#efe4d6]"><Heart size={18} strokeWidth={1.5} /></button></div>
            <div className="mt-7 flex items-baseline gap-3 border-b border-[#decfbd] pb-7"><PriceLabel cents={totalPrice} /><span className="text-[10px] uppercase tracking-[0.15em] text-[#766b5d]">CAD</span></div>
            <p className="mt-7 max-w-xl text-sm leading-7 text-[#6f6255]">{product.description || "A generous, easy silhouette crafted with a kiln-dried hardwood frame, high-resilience cushioning, and a considered upholstery finish. Made to order for your room, your rhythm, and the way you live."}</p>

            <div className="mt-10 space-y-9">
              <div><div className="mb-4 flex items-center justify-between"><label className="text-[10px] font-bold uppercase tracking-[0.18em]">01 · Fabric</label><span className="text-xs text-[#766b5d]">{selectedFabric}</span></div><div className="grid grid-cols-2 gap-2">{fabrics.map((item) => <button type="button" key={item.name} onClick={() => setSelectedFabric(item.name)} className={`group flex items-center gap-3 border p-3 text-left transition-all ${selectedFabric === item.name ? "border-[#25221d] bg-[#efe4d6]" : "border-[#decfbd] hover:border-[#9b6e4b]"}`}><span className="h-8 w-8 rounded-full border border-black/10" style={{ backgroundColor: item.colour }} /> <span><span className="block text-[11px] font-semibold">{item.name}</span><span className="mt-0.5 block text-[9px] uppercase tracking-[0.12em] text-[#766b5d]">{item.note}{item.add ? ` · +$${(item.add / 100).toLocaleString()}` : ""}</span></span>{selectedFabric === item.name && <Check size={14} className="ml-auto text-[#9b6e4b]" />}</button>)}</div></div>
              <div><div className="mb-4 flex items-center justify-between"><label className="text-[10px] font-bold uppercase tracking-[0.18em]">02 · Colour</label><span className="text-xs text-[#766b5d]">{selectedColour}</span></div><div className="flex flex-wrap gap-2">{colours.map((colourName) => <button type="button" key={colourName} onClick={() => setSelectedColour(colourName)} className={`border px-4 py-3 text-[10px] font-bold uppercase tracking-[0.13em] transition-all ${selectedColour === colourName ? "border-[#25221d] bg-[#25221d] text-[#f8f4ec]" : "border-[#decfbd] text-[#6f6255] hover:border-[#25221d]"}`}>{colourName}</button>)}</div></div>
              <div><div className="mb-4 flex items-center justify-between"><label className="text-[10px] font-bold uppercase tracking-[0.18em]">03 · Scale</label><span className="text-xs text-[#766b5d]">{selectedSize}</span></div><div className="grid grid-cols-3 gap-2">{sizes.map((sizeOption) => <button type="button" key={sizeOption.label} onClick={() => setSelectedSize(sizeOption.label)} className={`border p-3 text-left transition-all ${selectedSize === sizeOption.label ? "border-[#25221d] bg-[#efe4d6]" : "border-[#decfbd] hover:border-[#9b6e4b]"}`}><span className="block text-[11px] font-semibold">{sizeOption.label}</span><span className="mt-1 block text-[9px] uppercase tracking-[0.1em] text-[#766b5d]">{sizeOption.detail}</span></button>)}</div></div>
            </div>

            <div className="mt-10 flex gap-3"><div className="flex items-center border border-[#decfbd]"><button type="button" className="grid h-14 w-10 place-items-center" onClick={() => setQuantity((amount) => Math.max(1, amount - 1))}><span className="text-lg">−</span></button><span className="w-8 text-center text-sm">{quantity}</span><button type="button" className="grid h-14 w-10 place-items-center" onClick={() => setQuantity((amount) => amount + 1)}><span className="text-lg">+</span></button></div><motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => addToCart({ id: `${product.id}-${selectedFabric}-${selectedColour}-${selectedSize}`, name: product.name, price: totalPrice, quantity, image: product.imageUrl || gallery[0], variantDetails: `${selectedFabric} · ${selectedColour} · ${selectedSize}` })} className="flex flex-1 items-center justify-center gap-3 bg-[#25221d] px-4 text-[10px] font-bold uppercase tracking-[0.19em] text-[#f8f4ec] transition-colors hover:bg-[#9b6e4b]">Add to bag <ArrowRight size={16} /></motion.button></div>
            <div className="mt-9 grid grid-cols-2 gap-4 border-y border-[#decfbd] py-6 text-[10px] uppercase tracking-[0.13em] text-[#766b5d]"><div className="flex items-center gap-3"><ShieldCheck size={17} className="text-[#9b6e4b]" /> 25-year frame warranty</div><div className="flex items-center gap-3"><Truck size={17} className="text-[#9b6e4b]" /> White-glove delivery</div><div className="flex items-center gap-3"><Ruler size={17} className="text-[#9b6e4b]" /> Made to your scale</div><div className="flex items-center gap-3"><MessageCircle size={17} className="text-[#9b6e4b]" /> Design support</div></div>
          </section>
        </div>
      </main>
    </StoreLayout>
  );
}
