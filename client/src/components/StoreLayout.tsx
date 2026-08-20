import React, { useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { ArrowRight, ChevronDown, Menu, Minus, Plus, Search, ShoppingBag, User as UserIcon, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const navLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/custom-studio", label: "Custom Studio" },
  { href: "/our-story", label: "Our Story" },
  { href: "/contact", label: "Contact" },
];

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  const { user, isAuthenticated } = useAuth();
  const { cart, removeFromCart, updateQuantity, isOpen, setOpen, totalItems, subtotal, clearCart } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const subscribeMutation = trpc.commerce.subscribeNewsletter.useMutation();
  const checkoutMutation = trpc.commerce.createOrder.useMutation();

  const handleSubscribe = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newsletterEmail) return;
    try {
      await subscribeMutation.mutateAsync({ email: newsletterEmail });
      toast.success("Welcome to the design list", { description: "We will keep you close to what is new." });
      setNewsletterEmail("");
    } catch {
      toast.error("Subscription failed", { description: "Please try again in a moment." });
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      await checkoutMutation.mutateAsync({
        customerName: user?.name || "Valued Customer",
        customerEmail: user?.email || "customer@thesofaco.ca",
        shippingAddress: "1248 Queen Street West, Toronto, ON",
        itemsJson: JSON.stringify(cart),
        totalAmount: subtotal,
      });
      toast.success("Order placed successfully", { description: "Our artisan workshop is preparing your pieces." });
      clearCart();
      setOpen(false);
    } catch {
      toast.error("Checkout failed", { description: "Please sign in or try again." });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f4ec] font-sans text-[#25221d] antialiased">
      <motion.div style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-[70] h-0.5 origin-left bg-[#c58d5d]" />

      <div className="overflow-hidden bg-[#25221d] py-2.5 text-[9px] font-semibold uppercase tracking-[0.24em] text-[#f8f4ec]">
        <div className="marquee-track flex min-w-max gap-12 whitespace-nowrap">
          {[0, 1].map((copy) => <span key={copy}>Made to order in Canada <i className="mx-4 text-[#d9a875]">✦</i> Complimentary white-glove delivery <i className="mx-4 text-[#d9a875]">✦</i> The Art of Living.</span>)}
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-[#decfbd]/80 bg-[#f8f4ec]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-10 lg:px-16">
          <button type="button" className="grid h-10 w-10 place-items-center md:hidden" aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link href="/" className="font-display text-[30px] font-semibold leading-none tracking-[-0.04em]">Sofa Co<span className="text-[#c58d5d]">.</span></Link>

          <nav className="hidden items-center gap-8 text-[10px] font-bold uppercase tracking-[0.18em] md:flex lg:gap-10">
            {navLinks.map((link) => {
              const active = location === link.href || location.startsWith(`${link.href}/`);
              return <Link key={link.href} href={link.href} className={`group relative py-2 transition-colors hover:text-[#9b6e4b] ${active ? "text-[#9b6e4b]" : ""}`}>
                {link.label}
                <span className={`absolute bottom-0 left-0 h-px bg-[#c58d5d] transition-all duration-300 ${active ? "w-full" : "w-0 group-hover:w-full"}`} />
              </Link>;
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/shop" className="grid h-10 w-10 place-items-center transition-colors hover:text-[#9b6e4b]" aria-label="Search the collection"><Search size={18} strokeWidth={1.5} /></Link>
            {isAuthenticated ? <Link href="/account" className="hidden h-10 items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-[0.15em] sm:flex"><UserIcon size={17} strokeWidth={1.5} /> <span className="max-w-24 truncate">{user?.name || "Account"}</span></Link> : <a href="/api/oauth/login" className="hidden h-10 items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-[0.15em] sm:flex"><UserIcon size={17} strokeWidth={1.5} /> Sign in</a>}

            <Sheet open={isOpen} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button type="button" className="relative grid h-10 w-10 place-items-center transition-colors hover:text-[#9b6e4b]" aria-label={`Shopping bag with ${totalItems} items`}>
                  <ShoppingBag size={19} strokeWidth={1.5} />
                  <AnimatePresence initial={false}>
                    {totalItems > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-[#c58d5d] px-1 text-[9px] font-bold text-[#25221d]">{totalItems}</motion.span>}
                  </AnimatePresence>
                </button>
              </SheetTrigger>
              <SheetContent className="w-full border-l border-[#decfbd] bg-[#f8f4ec] p-0 sm:max-w-lg">
                <div className="flex h-full min-h-0 flex-col">
                  <SheetHeader className="border-b border-[#decfbd] px-6 py-6 text-left">
                    <SheetTitle className="font-display text-3xl font-medium tracking-[-0.03em]">Your bag <span className="font-sans text-[10px] uppercase tracking-[0.16em] text-[#9b6e4b]">({totalItems})</span></SheetTitle>
                  </SheetHeader>
                  <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
                    {cart.length === 0 ? <div className="flex h-full flex-col items-center justify-center text-center"><ShoppingBag size={38} strokeWidth={1} className="mb-5 text-[#c58d5d]" /><p className="font-display text-3xl">A quiet beginning.</p><p className="mt-3 max-w-xs text-xs leading-5 text-[#766b5d]">Your bag is ready for a piece that feels like home.</p><Link href="/shop" onClick={() => setOpen(false)} className="mt-8 bg-[#25221d] px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#f8f4ec]">Explore the collection</Link></div> : <div className="space-y-5">
                      <AnimatePresence initial={false}>
                        {cart.map((item) => <motion.div key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex gap-4 border-b border-[#decfbd] pb-5">
                          {item.image && <OptimizedImage src={item.image} alt={item.name} sizes="96px" className="h-24 w-24 object-cover" />}
                          <div className="min-w-0 flex-1"><div className="flex justify-between gap-4"><h4 className="font-display text-xl leading-none">{item.name}</h4><button type="button" onClick={() => removeFromCart(item.id)} className="text-[10px] uppercase tracking-[0.16em] text-[#9b6e4b]">Remove</button></div>{item.variantDetails && <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[#766b5d]">{item.variantDetails}</p>}<div className="mt-4 flex items-center justify-between"><span className="text-sm font-semibold">${(item.price / 100).toLocaleString()}</span><div className="flex items-center border border-[#decfbd]"><button type="button" aria-label="Decrease quantity" className="grid h-7 w-7 place-items-center" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus size={11} /></button><span className="w-7 text-center text-xs">{item.quantity}</span><button type="button" aria-label="Increase quantity" className="grid h-7 w-7 place-items-center" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus size={11} /></button></div></div></div>
                        </motion.div>)}
                      </AnimatePresence>
                    </div>}
                  </div>
                  {cart.length > 0 && <div className="border-t border-[#decfbd] px-6 py-6"><div className="flex items-center justify-between text-sm font-semibold"><span>Subtotal</span><span>${(subtotal / 100).toLocaleString()}</span></div><p className="mt-2 text-xs leading-5 text-[#766b5d]">Shipping and taxes are calculated at checkout.</p><button type="button" disabled={checkoutMutation.isPending} onClick={handleCheckout} className="mt-6 flex w-full items-center justify-center gap-3 bg-[#25221d] py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#f8f4ec] transition-colors hover:bg-[#9b6e4b] disabled:cursor-wait disabled:opacity-60">{checkoutMutation.isPending ? "Preparing your order…" : "Proceed to checkout"} <ArrowRight size={15} /></button></div>}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-[#decfbd] md:hidden"><nav className="flex flex-col px-5 pb-5 pt-2">{navLinks.map((link, index) => <motion.div key={link.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }}><Link href={link.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between border-b border-[#decfbd] py-4 font-display text-2xl"><span>{link.label}</span><ArrowRight size={16} className="text-[#c58d5d]" /></Link></motion.div>)}<a href={isAuthenticated ? "/account" : "/api/oauth/login"} className="flex items-center gap-3 py-4 text-[10px] font-bold uppercase tracking-[0.16em]"><UserIcon size={17} strokeWidth={1.5} /> {isAuthenticated ? "Account" : "Sign in"}</a></nav></motion.div>}
        </AnimatePresence>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={location} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.28 }} className="min-h-[50vh]">
          {children}
        </motion.div>
      </AnimatePresence>

      <footer className="bg-[#25221d] text-[#f8f4ec]">
        <div className="mx-auto max-w-[1440px] px-6 py-20 sm:px-10 lg:px-16 lg:py-28">
          <div className="grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-5"><Link href="/" className="font-display text-5xl tracking-[-0.05em]">Sofa Co<span className="text-[#e6b889]">.</span></Link><p className="mt-6 max-w-sm text-sm leading-7 text-white/55">Modern handcrafted furniture designed for enduring comfort and uncompromising Canadian craftsmanship. The Art of Living.</p><p className="mt-7 text-[10px] uppercase tracking-[0.15em] text-white/40">1248 Queen Street West · Toronto, ON</p></div>
            <div className="grid gap-12 sm:grid-cols-2 lg:col-span-3 lg:col-start-7"><div><p className="eyebrow text-[#e6b889]">Explore</p><div className="mt-5 space-y-3 text-sm text-white/60"><Link href="/shop" className="block transition-colors hover:text-white">Shop</Link><Link href="/custom-studio" className="block transition-colors hover:text-white">Custom Studio</Link><Link href="/lookbook" className="block transition-colors hover:text-white">Lookbook</Link></div></div><div><p className="eyebrow text-[#e6b889]">About</p><div className="mt-5 space-y-3 text-sm text-white/60"><Link href="/our-story" className="block transition-colors hover:text-white">Our Story</Link><Link href="/craftsmanship" className="block transition-colors hover:text-white">Craftsmanship</Link><Link href="/room-planner" className="block transition-colors hover:text-white">Room Planner</Link><Link href="/swatches" className="block transition-colors hover:text-white">Request swatches</Link><Link href="/contact" className="block transition-colors hover:text-white">Contact</Link></div></div></div>
            <div className="lg:col-span-3"><p className="eyebrow text-[#e6b889]">The design list</p><p className="mt-5 max-w-xs text-sm leading-6 text-white/55">New collections, studio notes, and thoughtful things for the home.</p><form onSubmit={handleSubscribe} className="mt-6 flex border-b border-white/25 pb-3"><Input type="email" placeholder="Your email address" value={newsletterEmail} onChange={(event) => setNewsletterEmail(event.target.value)} className="h-auto border-0 bg-transparent p-0 text-sm text-white placeholder:text-white/35 focus-visible:ring-0" required /><button type="submit" disabled={subscribeMutation.isPending} className="text-[#e6b889] disabled:cursor-wait disabled:opacity-50" aria-label="Subscribe to newsletter" aria-busy={subscribeMutation.isPending}><ArrowRight size={18} /></button></form></div>
          </div>
          <div className="mt-20 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 text-[10px] uppercase tracking-[0.14em] text-white/35 sm:flex-row"><span>© 2026 Sofa Co. · Handcrafted in Canada</span><span>The Art of Living.</span></div>
        </div>
      </footer>
    </div>
  );
}
