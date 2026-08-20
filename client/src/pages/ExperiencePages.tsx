import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Heart, Ruler, Send, Sofa, SwatchBook } from "lucide-react";
import { Link } from "wouter";
import StoreLayout from "@/components/StoreLayout";
import { OptimizedImage } from "@/components/OptimizedImage";
import { catalogQueryOptions } from "@/lib/storefrontUi";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const swatches = [
  { name: "Oat", tone: "#d4c4ae", detail: "Belgian linen" },
  { name: "Moss", tone: "#68766a", detail: "Washed cotton" },
  { name: "Cacao", tone: "#8b6b53", detail: "Performance velvet" },
  { name: "Chalk", tone: "#e7dfd4", detail: "Bouclé" },
  { name: "Ink", tone: "#3f4240", detail: "Belgian linen" },
  { name: "Ochre", tone: "#b98a56", detail: "Performance velvet" },
];

export function Wishlist() {
  const { data: products = [] } = trpc.commerce.getProducts.useQuery(undefined, catalogQueryOptions);
  const { addToCart } = useCart();
  const [saved, setSaved] = useState<number[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem("sofa-co-wishlist");
    if (stored) setSaved(JSON.parse(stored) as number[]);
  }, []);

  const toggleSaved = (id: number) => {
    const next = saved.includes(id) ? saved.filter((savedId) => savedId !== id) : [...saved, id];
    setSaved(next);
    window.localStorage.setItem("sofa-co-wishlist", JSON.stringify(next));
  };

  const items = products.filter((product) => saved.includes(product.id));

  return <StoreLayout><main className="mx-auto max-w-[1440px] px-6 py-20 sm:px-10 lg:px-16 lg:py-28"><motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}><p className="eyebrow">Saved for later</p><h1 className="font-display mt-5 text-7xl leading-[0.85] tracking-[-0.05em] sm:text-8xl">Pieces to<br />come back to.</h1><p className="mt-7 max-w-md text-sm leading-7 text-[#766b5d]">Keep the shapes and textures that caught your eye close by. Your list stays on this device.</p></motion.div><div className="mt-16 border-t border-[#decfbd] pt-8">{items.length === 0 ? <div className="border border-dashed border-[#cdbda9] px-6 py-24 text-center"><Heart size={26} strokeWidth={1.3} className="mx-auto text-[#c58d5d]" /><p className="font-display mt-6 text-4xl">Nothing saved yet.</p><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#766b5d]">Browse the collection and tap the heart on a piece that feels like you.</p><Link href="/shop" className="editorial-link mt-8">Explore the collection <ArrowRight size={15} /></Link></div> : <div className="grid gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">{items.map((product, index) => <motion.article key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} className="group"><div className="relative aspect-[0.9] overflow-hidden bg-[#e9dfd1]"><OptimizedImage src={product.imageUrl || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=86"} alt={product.name} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" className="image-hover h-full w-full object-cover" /><button type="button" onClick={() => toggleSaved(product.id)} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-[#f8f4ec]/90 text-[#9b6e4b]"><Heart size={16} fill="currentColor" /></button></div><div className="mt-5 flex items-start justify-between"><div><h2 className="font-display text-2xl">{product.name}</h2><p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-[#766b5d]">Starting from ${(product.startingPrice / 100).toLocaleString()}</p></div><button type="button" onClick={() => addToCart({ id: `product-${product.id}`, name: product.name, price: product.startingPrice, quantity: 1, image: product.imageUrl || undefined, variantDetails: "Standard configuration" })} className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#9b6e4b]">Add to bag</button></div></motion.article>)}</div>}</div></main></StoreLayout>;
}

export function SwatchRequest() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const submitInquiryMutation = trpc.commerce.submitInquiry.useMutation();

  const toggleSwatch = (swatchName: string) => setSelected((current) => current.includes(swatchName) ? current.filter((item) => item !== swatchName) : [...current, swatchName]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await submitInquiryMutation.mutateAsync({ firstName: name, lastName: "", email, category: "Product Inquiry", message: `${message}\nRequested swatches: ${selected.join(", ") || "No specific swatches"}` });
      toast.success("Request received", { description: "We will be in touch about your sample set." });
      setName(""); setEmail(""); setMessage(""); setSelected([]);
    } catch { toast.error("Something went wrong", { description: "Please check your details and try again." }); }
  };

  return <StoreLayout><main><section className="bg-[#e9dfd1] px-6 py-20 sm:px-10 lg:px-16 lg:py-28"><div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-7"><p className="eyebrow">Materials library</p><h1 className="font-display mt-5 text-7xl leading-[0.85] tracking-[-0.05em] sm:text-8xl">See it in<br />your light.</h1></div><p className="max-w-sm text-sm leading-7 text-[#766b5d] lg:col-span-4 lg:col-start-9">Colour is personal. Request a considered set of material samples to see the weave, depth, and tone at home.</p></div></section><div className="mx-auto grid max-w-[1440px] gap-14 px-6 py-16 sm:px-10 lg:grid-cols-12 lg:px-16 lg:py-24"><section className="lg:col-span-7"><div className="flex items-end justify-between"><div><p className="eyebrow">Choose your palette</p><h2 className="font-display mt-4 text-5xl">Six quiet tones.</h2></div><span className="text-[10px] uppercase tracking-[0.15em] text-[#766b5d]">{selected.length} selected</span></div><div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">{swatches.map((swatch) => <button type="button" key={swatch.name} onClick={() => toggleSwatch(swatch.name)} className={`group relative aspect-[0.9] overflow-hidden border p-4 text-left transition-all ${selected.includes(swatch.name) ? "border-[#25221d]" : "border-[#decfbd] hover:border-[#9b6e4b]"}`}><span className="absolute inset-0 transition-transform duration-500 group-hover:scale-105" style={{ backgroundColor: swatch.tone }} /><span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 to-transparent p-4 text-white"><span className="block font-display text-2xl">{swatch.name}</span><span className="mt-1 block text-[9px] uppercase tracking-[0.14em] text-white/75">{swatch.detail}</span></span>{selected.includes(swatch.name) && <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-[#f8f4ec] text-[#25221d]"><Check size={14} /></span>}</button>)}</div></section><aside className="soft-card h-fit p-7 sm:p-9 lg:col-span-5"><p className="eyebrow">Request samples</p><h2 className="font-display mt-4 text-4xl">Bring the conversation home.</h2><form onSubmit={submit} className="mt-8 space-y-5"><Input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="h-12 rounded-none border-[#decfbd] bg-transparent" /><Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="h-12 rounded-none border-[#decfbd] bg-transparent" /><Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us about your space (optional)" rows={4} className="rounded-none border-[#decfbd] bg-transparent" /><button type="submit" disabled={submitInquiryMutation.isPending} aria-busy={submitInquiryMutation.isPending} className="flex w-full items-center justify-center gap-3 bg-[#25221d] py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#f8f4ec] transition-colors hover:bg-[#9b6e4b] disabled:cursor-wait disabled:opacity-60">{submitInquiryMutation.isPending ? "Preparing your sample set…" : "Request my swatches"} <Send size={15} /></button></form><p className="mt-5 text-[10px] leading-5 text-[#766b5d]">Sample requests are handled by our studio team. Select one or more tones above to help us prepare your edit.</p></aside></div></main></StoreLayout>;
}

export function RoomPlanner() {
  const steps = [
    { number: "01", title: "Start with the room", copy: "Notice where the light falls, how people move, and what the room already wants to be.", icon: Ruler },
    { number: "02", title: "Find the anchor", copy: "Begin with one generous piece. Let the sofa establish the rhythm rather than fill every corner.", icon: Sofa },
    { number: "03", title: "Layer the feeling", copy: "Add warmth through texture, scale, and pieces that tell your story over time.", icon: SwatchBook },
  ];
  return <StoreLayout><main><section className="relative overflow-hidden bg-[#25221d] px-6 py-20 text-[#f8f4ec] sm:px-10 lg:px-16 lg:py-28"><div className="relative z-10 mx-auto max-w-[1440px] lg:grid lg:grid-cols-12 lg:items-end"><div className="lg:col-span-8"><p className="eyebrow text-[#e6b889]">A guide to considered rooms</p><h1 className="font-display mt-5 text-7xl leading-[0.84] tracking-[-0.055em] sm:text-8xl lg:text-[9rem]">Make room<br />for living.</h1></div><p className="mt-9 max-w-sm text-sm leading-7 text-white/60 lg:col-span-4 lg:col-start-9 lg:mt-0">A few gentle principles for creating a space that feels collected, comfortable, and entirely your own.</p></div><div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[url('https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=82')] bg-cover bg-center opacity-25 mix-blend-screen" /></section><section className="mx-auto max-w-[1440px] px-6 py-20 sm:px-10 lg:px-16 lg:py-28"><div className="grid gap-5 lg:grid-cols-3">{steps.map((step, index) => { const Icon = step.icon; return <motion.article key={step.number} initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ delay: index * 0.1 }} className="border-t border-[#decfbd] pt-6"><div className="flex items-start justify-between"><span className="font-display text-5xl text-[#c58d5d]">{step.number}</span><Icon size={25} strokeWidth={1.2} className="text-[#9b6e4b]" /></div><h2 className="font-display mt-14 text-3xl">{step.title}</h2><p className="mt-4 max-w-sm text-sm leading-7 text-[#766b5d]">{step.copy}</p></motion.article>; })}</div><div className="mt-24 grid gap-10 bg-[#efe4d6] p-7 sm:p-12 lg:grid-cols-2 lg:items-center lg:p-16"><div><p className="eyebrow">The final layer</p><h2 className="font-display mt-5 text-5xl leading-[0.9] sm:text-7xl">Let the room<br />breathe.</h2><p className="mt-7 max-w-md text-sm leading-7 text-[#766b5d]">The most beautiful spaces leave a little room for change. Begin with a piece that feels right now, then let your home evolve around it.</p><Link href="/custom-studio" className="editorial-link mt-9">Design your anchor piece <ArrowRight size={15} /></Link></div><div className="aspect-[1.15] overflow-hidden"><OptimizedImage src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=86" alt="A calm, layered living room" sizes="(min-width: 1024px) 50vw, 100vw" className="h-full w-full object-cover" /></div></div></section></main></StoreLayout>;
}
