import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Filter, SlidersHorizontal } from "lucide-react";
import { Link, useLocation } from "wouter";
import StoreLayout from "@/components/StoreLayout";
import { OptimizedImage } from "@/components/OptimizedImage";
import { SeriesFilter } from "@/components/StorefrontPrimitives";
import { catalogQueryOptions } from "@/lib/storefrontUi";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";

const fallbackImage = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=86";

export default function Shop() {
  const [location] = useLocation();
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | undefined>(undefined);
  const [filterOpen, setFilterOpen] = useState(false);
  const { data: seriesList = [] } = trpc.commerce.getSeries.useQuery(undefined, catalogQueryOptions);
  const { data: products = [], isLoading } = trpc.commerce.getProducts.useQuery({ seriesId: selectedSeriesId }, catalogQueryOptions);
  const { addToCart } = useCart();

  useEffect(() => {
    const seriesFromUrl = new URLSearchParams(location.split("?")[1] || "").get("series");
    if (seriesFromUrl) setSelectedSeriesId(Number(seriesFromUrl));
  }, [location]);

  const activeSeries = seriesList.find((series) => series.id === selectedSeriesId);

  return (
    <StoreLayout>
      <main>
        <section className="relative overflow-hidden bg-[#e9dfd1] px-6 pb-16 pt-20 sm:px-10 lg:px-16 lg:pb-24 lg:pt-28">
          <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-12 lg:items-end">
            <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="lg:col-span-7">
              <p className="eyebrow">The collection</p>
              <h1 className="font-display mt-5 max-w-3xl text-7xl leading-[0.85] tracking-[-0.055em] sm:text-8xl lg:text-[9rem]">Pieces for the way you live.</h1>
            </motion.div>
            <motion.p initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12 }} className="max-w-sm text-sm leading-7 text-[#6f6255] lg:col-span-4 lg:col-start-9">Custom-built in Canada from honest materials and enduring forms. Explore the series, then find the piece that makes the room yours.</motion.p>
          </div>
          <div className="pointer-events-none absolute -bottom-20 -right-10 font-display text-[18rem] leading-none text-[#d6c4b1]/50">01</div>
        </section>

        <div className="sticky top-[76px] z-30 border-b border-[#decfbd] bg-[#f8f4ec]/95 backdrop-blur-xl">
          <div className="scrollbar-subtle scroll-fade-x mx-auto flex max-w-[1440px] snap-x items-center gap-3 overflow-x-auto overscroll-x-contain px-6 py-4 [-webkit-overflow-scrolling:touch] sm:px-10 lg:px-16">
            <SeriesFilter series={seriesList.map((series) => ({ id: series.id, name: series.name }))} selectedId={selectedSeriesId} onSelect={setSelectedSeriesId} />
            <button type="button" onClick={() => setFilterOpen((open) => !open)} className="ml-auto hidden shrink-0 items-center gap-2 border-l border-[#decfbd] pl-5 text-[10px] font-bold uppercase tracking-[0.17em] text-[#6f6255] sm:flex"><SlidersHorizontal size={15} /> {filterOpen ? "Close" : "Filter"}</button>
          </div>
          <AnimatePresence initial={false}>{filterOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-[#decfbd]"><div className="mx-auto flex max-w-[1440px] items-center gap-5 px-6 py-4 text-[10px] uppercase tracking-[0.16em] text-[#6f6255] sm:px-10 lg:px-16"><span>Sort by</span><button type="button" className="font-bold text-[#25221d]">Featured <Check size={13} className="ml-1 inline" /></button><button type="button" className="transition-colors hover:text-[#25221d]">Price: Low to high</button><button type="button" className="transition-colors hover:text-[#25221d]">New arrivals</button></div></motion.div>}</AnimatePresence>
        </div>

        <section className="mx-auto max-w-[1440px] px-6 py-14 sm:px-10 lg:px-16 lg:py-20">
          <div className="mb-10 flex items-end justify-between gap-4"><div><p className="eyebrow">{activeSeries ? `${activeSeries.name} series` : "Made to order"}</p><h2 className="font-display mt-3 text-4xl tracking-[-0.035em] sm:text-5xl">{activeSeries ? activeSeries.name : "Everyday icons"}</h2></div><button type="button" onClick={() => setFilterOpen((open) => !open)} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6f6255] sm:hidden"><Filter size={15} /> Filter</button></div>
          {isLoading ? <div className="grid grid-cols-1 gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3"><div className="aspect-[0.87] animate-pulse bg-[#e9dfd1]" /><div className="aspect-[0.87] animate-pulse bg-[#e9dfd1]" /><div className="aspect-[0.87] animate-pulse bg-[#e9dfd1]" /></div> : <AnimatePresence mode="wait"><motion.div key={selectedSeriesId ?? "all"} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }} className="grid grid-cols-1 gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">{products.map((product, index) => <motion.article key={product.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: index * 0.07 }} className="group">
            <Link href={`/product/${product.slug}`} className="block">
              <div className="relative aspect-[0.87] overflow-hidden bg-[#e9dfd1]"><OptimizedImage src={product.imageUrl || fallbackImage} alt={product.name} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" className="image-hover h-full w-full object-cover" /><span className="absolute left-4 top-4 bg-[#f8f4ec]/90 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#6f6255]">Made to order</span><span className="absolute bottom-4 right-4 grid h-11 w-11 translate-y-3 place-items-center rounded-full bg-[#f8f4ec] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"><ArrowRight size={16} /></span></div>
              <div className="mt-5 flex items-start justify-between gap-4"><div><h3 className="font-display text-2xl tracking-[-0.02em]">{product.name}</h3><p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#766b5d]">{activeSeries?.name || "Sofa Co."} · Customizable</p></div><p className="whitespace-nowrap text-xs font-semibold text-[#6f6255]">From ${(product.startingPrice / 100).toLocaleString()}</p></div>
            </Link>
            <div className="mt-5 flex items-center justify-between border-t border-[#decfbd] pt-4"><Link href={`/product/${product.slug}`} className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6f6255] transition-colors hover:text-[#25221d]">View details</Link><motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => addToCart({ id: `product-${product.id}`, name: product.name, price: product.startingPrice, quantity: 1, image: product.imageUrl || undefined, variantDetails: "Standard configuration" })} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9b6e4b]">Add to bag <ArrowRight size={14} /></motion.button></div>
          </motion.article>)}</motion.div></AnimatePresence>}
          {!isLoading && products.length === 0 && <div className="border border-dashed border-[#cdbda9] px-6 py-20 text-center"><p className="font-display text-4xl">A considered collection is on its way.</p><p className="mt-3 text-sm text-[#766b5d]">Try another series or return to all pieces.</p><button type="button" onClick={() => setSelectedSeriesId(undefined)} className="editorial-link mt-7">View all pieces <ArrowRight size={15} /></button></div>}
        </section>
      </main>
    </StoreLayout>
  );
}
