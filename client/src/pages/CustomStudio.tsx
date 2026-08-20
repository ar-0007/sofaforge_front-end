import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Maximize2, Sparkles } from "lucide-react";
import StoreLayout from "@/components/StoreLayout";
import { OptimizedImage } from "@/components/OptimizedImage";
import { ConfiguratorProgress } from "@/components/StorefrontPrimitives";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const steps = ["Shape", "Fabric", "Colour", "Scale"];
const shapes = [
  { name: "Sectional with Chaise", note: "For slow Sundays", price: 440000, image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=84" },
  { name: "U-Shape Sofa", note: "For gathering", price: 580000, image: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=900&q=84" },
  { name: "Lucy Sectional", note: "For open plans", price: 690000, image: "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=900&q=84" },
  { name: "Modular 3-Piece", note: "For changing rooms", price: 490000, image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=84" },
];
const fabrics = [
  { name: "Belgian Linen", note: "Soft · natural", add: 0, swatch: "#d6c5ad" },
  { name: "Performance Velvet", note: "Deep · luminous", add: 35000, swatch: "#243b37" },
  { name: "Bouclé", note: "Textured · warm", add: 50000, swatch: "#e7ded0" },
  { name: "Washed Cotton", note: "Relaxed · easy", add: 0, swatch: "#8c847a" },
];
const colours = [
  { name: "Natural Ivory", swatch: "#e6ded2" },
  { name: "Charcoal Grey", swatch: "#484948" },
  { name: "Warm Taupe", swatch: "#9d8a77" },
  { name: "Forest Green", swatch: "#304b42" },
];
const sizes = [
  { name: "Standard (88\")", note: "The everyday proportion", add: 0 },
  { name: "Extended (96\")", note: "A little more room", add: 40000 },
  { name: "Grand (108\")", note: "Make space for everyone", add: 80000 },
];

export default function CustomStudio() {
  const [step, setStep] = useState(1);
  const [shape, setShape] = useState(shapes[0].name);
  const [fabric, setFabric] = useState(fabrics[0].name);
  const [colour, setColour] = useState(colours[0].name);
  const [size, setSize] = useState(sizes[0].name);
  const { addToCart } = useCart();
  const saveConfigMutation = trpc.commerce.saveConfiguration.useMutation();

  const selectedShape = shapes.find((item) => item.name === shape) || shapes[0];
  const selectedFabric = fabrics.find((item) => item.name === fabric) || fabrics[0];
  const selectedSize = sizes.find((item) => item.name === size) || sizes[0];
  const totalPrice = selectedShape.price + selectedFabric.add + selectedSize.add;

  const handleSaveConfig = async () => {
    try {
      await saveConfigMutation.mutateAsync({ shape, fabric, colour, size, totalPrice });
      toast.success("Configuration saved", { description: "Find it anytime in your account." });
    } catch {
      toast.error("Sign in to save", { description: "Your configuration is ready to add to bag." });
    }
  };

  const handleAddToBag = () => {
    addToCart({ id: `custom-${shape}-${fabric}-${colour}-${size}`, name: `Custom ${shape}`, price: totalPrice, quantity: 1, image: selectedShape.image, variantDetails: `${fabric} · ${colour} · ${size}` });
    toast.success("Added to your bag", { description: "Your made-to-order piece is ready for review." });
  };

  const nextStep = () => setStep((current) => Math.min(4, current + 1));
  const previousStep = () => setStep((current) => Math.max(1, current - 1));

  return (
    <StoreLayout>
      <main className="bg-[#f8f4ec]">
        <section className="relative overflow-hidden bg-[#25221d] px-6 py-20 text-[#f8f4ec] sm:px-10 lg:px-16 lg:py-28">
          <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-12 lg:items-end"><div className="relative z-10 lg:col-span-8"><p className="eyebrow text-[#e6b889]">Custom Studio · 01 — 04</p><h1 className="font-display mt-5 max-w-4xl text-7xl leading-[0.84] tracking-[-0.055em] sm:text-8xl lg:text-[9rem]">A piece made<br />around you.</h1></div><p className="relative z-10 max-w-sm text-sm leading-7 text-white/60 lg:col-span-4 lg:col-start-9">Choose the silhouette, the handfeel, the colour, and the scale. We will build the rest with care.</p></div><div className="pointer-events-none absolute -bottom-24 right-0 font-display text-[20rem] leading-none text-white/[0.035]">04</div>
        </section>

        <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-14 sm:px-10 lg:grid-cols-12 lg:px-16 lg:py-24">
          <section className="lg:col-span-8">
            <div className="mb-12"><ConfiguratorProgress step={step} labels={steps} /></div>
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.3 }}>
                {step === 1 && <div><p className="eyebrow">Step 01 · Find your form</p><h2 className="font-display mt-4 text-5xl tracking-[-0.04em]">Start with a shape.</h2><div className="mt-9 grid gap-4 sm:grid-cols-2">{shapes.map((item) => <button type="button" key={item.name} onClick={() => setShape(item.name)} className={`group overflow-hidden border text-left transition-all ${shape === item.name ? "border-[#25221d] bg-[#efe4d6]" : "border-[#decfbd] hover:border-[#9b6e4b]"}`}><div className="relative aspect-[1.45] overflow-hidden"><OptimizedImage src={item.image} alt={item.name} sizes="(min-width: 640px) 50vw, 100vw" className="image-hover h-full w-full object-cover" />{shape === item.name && <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-[#f8f4ec]"><Check size={14} /></span>}</div><div className="p-5"><h3 className="font-display text-2xl">{item.name}</h3><p className="mt-1 text-xs text-[#766b5d]">{item.note} · From ${(item.price / 100).toLocaleString()}</p></div></button>)}</div></div>}
                {step === 2 && <div><p className="eyebrow">Step 02 · Touch and texture</p><h2 className="font-display mt-4 text-5xl tracking-[-0.04em]">Choose your handfeel.</h2><div className="mt-10 grid gap-3 sm:grid-cols-2">{fabrics.map((item) => <button type="button" key={item.name} onClick={() => setFabric(item.name)} className={`flex items-center gap-4 border p-5 text-left transition-all ${fabric === item.name ? "border-[#25221d] bg-[#efe4d6]" : "border-[#decfbd] hover:border-[#9b6e4b]"}`}><span className="h-14 w-14 rounded-full border border-black/10 shadow-inner" style={{ backgroundColor: item.swatch }} /><span className="flex-1"><span className="block font-display text-2xl">{item.name}</span><span className="mt-1 block text-[10px] uppercase tracking-[0.15em] text-[#766b5d]">{item.note}{item.add ? ` · +$${(item.add / 100).toLocaleString()}` : " · Included"}</span></span>{fabric === item.name && <Check size={16} className="text-[#9b6e4b]" />}</button>)}</div></div>}
                {step === 3 && <div><p className="eyebrow">Step 03 · A little character</p><h2 className="font-display mt-4 text-5xl tracking-[-0.04em]">Bring in the colour.</h2><div className="mt-10 grid gap-3 sm:grid-cols-2">{colours.map((item) => <button type="button" key={item.name} onClick={() => setColour(item.name)} className={`flex items-center gap-4 border p-5 text-left transition-all ${colour === item.name ? "border-[#25221d] bg-[#efe4d6]" : "border-[#decfbd] hover:border-[#9b6e4b]"}`}><span className="h-16 w-16 rounded-full border border-black/10" style={{ backgroundColor: item.swatch }} /><span className="flex-1 font-display text-2xl">{item.name}</span>{colour === item.name && <Check size={16} className="text-[#9b6e4b]" />}</button>)}</div></div>}
                {step === 4 && <div><p className="eyebrow">Step 04 · Live generously</p><h2 className="font-display mt-4 text-5xl tracking-[-0.04em]">Set the scale.</h2><div className="mt-10 grid gap-3 sm:grid-cols-3">{sizes.map((item) => <button type="button" key={item.name} onClick={() => setSize(item.name)} className={`relative border p-6 text-left transition-all ${size === item.name ? "border-[#25221d] bg-[#efe4d6]" : "border-[#decfbd] hover:border-[#9b6e4b]"}`}>{size === item.name && <span className="absolute right-4 top-4 text-[#9b6e4b]"><Check size={16} /></span>}<Maximize2 size={19} strokeWidth={1.3} className="mb-10 text-[#9b6e4b]" /><span className="block font-display text-2xl">{item.name}</span><span className="mt-2 block text-xs leading-5 text-[#766b5d]">{item.note}{item.add ? ` · +$${(item.add / 100).toLocaleString()}` : " · Included"}</span></button>)}</div></div>}
              </motion.div>
            </AnimatePresence>
            <div className="mt-14 flex items-center justify-between border-t border-[#decfbd] pt-6"><button type="button" onClick={previousStep} disabled={step === 1} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#766b5d] disabled:opacity-30"><ArrowLeft size={15} /> Back</button>{step < 4 ? <button type="button" onClick={nextStep} className="flex items-center gap-3 bg-[#25221d] px-7 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f8f4ec] transition-colors hover:bg-[#9b6e4b]">Continue <ArrowRight size={15} /></button> : <div className="flex flex-wrap gap-3"><button type="button" disabled={saveConfigMutation.isPending} aria-busy={saveConfigMutation.isPending} onClick={handleSaveConfig} className="border border-[#25221d] px-5 py-4 text-[10px] font-bold uppercase tracking-[0.18em] disabled:cursor-wait disabled:opacity-60">{saveConfigMutation.isPending ? "Saving…" : "Save design"}</button><button type="button" onClick={handleAddToBag} className="flex items-center gap-3 bg-[#25221d] px-6 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f8f4ec] transition-colors hover:bg-[#9b6e4b]">Add to bag <ArrowRight size={15} /></button></div>}</div>
          </section>

          <aside className="lg:col-span-4 lg:col-start-9"><div className="sticky top-32 overflow-hidden bg-[#25221d] text-[#f8f4ec]"><div className="relative aspect-[1.2] overflow-hidden"><motion.div key={selectedShape.image} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45 }} className="h-full w-full"><OptimizedImage src={selectedShape.image} alt="Your custom sofa" priority sizes="(min-width: 1024px) 33vw, 100vw" className="h-full w-full object-cover" /></motion.div><div className="absolute inset-0 bg-gradient-to-t from-[#25221d] via-transparent to-transparent" /><span className="absolute bottom-5 left-5 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.17em] text-white/70"><Sparkles size={13} className="text-[#e6b889]" /> Live preview</span></div><div className="p-7 sm:p-9"><p className="eyebrow text-[#e6b889]">Your configuration</p><h3 className="font-display mt-4 text-4xl leading-none">{shape}</h3><div className="mt-8 space-y-3 border-y border-white/15 py-6 text-xs"><div className="flex justify-between"><span className="text-white/50">Fabric</span><span>{fabric}</span></div><div className="flex justify-between"><span className="text-white/50">Colour</span><span>{colour}</span></div><div className="flex justify-between"><span className="text-white/50">Scale</span><span>{size}</span></div></div><div className="mt-7 flex items-end justify-between"><span className="text-[10px] uppercase tracking-[0.16em] text-white/50">Starting total</span><span className="font-display text-4xl">${(totalPrice / 100).toLocaleString()}</span></div><p className="mt-6 text-xs leading-5 text-white/50">Made to order in Canada. Includes our 25-year frame warranty and white-glove delivery.</p></div></div></aside>
        </div>
      </main>
    </StoreLayout>
  );
}
