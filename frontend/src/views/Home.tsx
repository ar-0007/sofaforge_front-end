"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowRight, Award, Feather, Leaf, MoveUpRight, ShieldCheck, Sparkles, Truck } from "lucide-react";
import Link from "next/link";
import StoreLayout from "@/components/StoreLayout";
import { OptimizedImage } from "@/components/OptimizedImage";
import { HeroTitle } from "@/components/StorefrontPrimitives";
import { trpc } from "@/lib/trpc";
import { catalogQueryOptions } from "@/lib/storefrontUi";

const heroSlides = [
  {
    kicker: "The 2026 collection",
    title: ["Rooms made for", "living beautifully."],
    copy: "Handcrafted Canadian furniture with an easy, expressive point of view.",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=2200&q=88",
    tone: "from-[#171714]/80 via-[#171714]/15 to-transparent",
  },
  {
    kicker: "The maker's edit",
    title: ["Comfort,", "considered."],
    copy: "Natural textures, generous proportions, and the kind of craft you can feel.",
    image: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=2200&q=88",
    tone: "from-[#171714]/75 via-[#171714]/10 to-transparent",
  },
  {
    kicker: "Your home, your way",
    title: ["Make a piece", "your own."],
    copy: "Explore shape, fabric, colour, and scale in the Custom Studio.",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=2200&q=88",
    tone: "from-[#171714]/80 via-[#171714]/10 to-transparent",
  },
];

const values = [
  { icon: Award, title: "Made in Canada", copy: "Built by expert hands in our Toronto workshop." },
  { icon: Feather, title: "25-year frame warranty", copy: "Thoughtful materials for a lifetime of living." },
  { icon: Truck, title: "White-glove delivery", copy: "Carefully delivered, placed, and assembled." },
  { icon: Leaf, title: "Made to last", copy: "A slower, more considered approach to furniture." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7 } },
};

export default function Home() {
  const { data: seriesList = [] } = trpc.commerce.getSeries.useQuery(undefined, catalogQueryOptions);
  const heroPlacementInput = useMemo(() => ({ slot: "home.hero" }), []);
  const featuredSeriesPlacementInput = useMemo(() => ({ slot: "home.featured_series" }), []);
  const { data: heroPlacements = [] } = trpc.commerce.getPlacements.useQuery(heroPlacementInput, catalogQueryOptions);
  const { data: featuredSeriesPlacements = [] } = trpc.commerce.getPlacements.useQuery(featuredSeriesPlacementInput, catalogQueryOptions);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = useMemo(() => heroPlacements.length ? heroPlacements.map((placement) => ({
    kicker: placement.heading || "The Art of Living.",
    title: (placement.subheading || "Rooms made for\nliving beautifully.").split("\n"),
    copy: placement.ctaLabel || "Handcrafted Canadian furniture with an easy, expressive point of view.",
    image: placement.imageUrl || heroSlides[0].image,
    tone: "from-[#171714]/80 via-[#171714]/15 to-transparent",
    ctaHref: placement.ctaHref || "/shop",
  })) : heroSlides.map((slide) => ({ ...slide, ctaHref: "/shop" })), [heroPlacements]);

  const featuredSeries = useMemo(() => {
    const managed = featuredSeriesPlacements
      .filter((placement) => placement.entityType === "series" && placement.entityId)
      .map((placement) => seriesList.find((item) => item.id === placement.entityId))
      .filter((item): item is (typeof seriesList)[number] => Boolean(item));
    return managed.length ? managed : seriesList.slice(0, 5);
  }, [featuredSeriesPlacements, seriesList]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentSlide((slide) => (slide + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  useEffect(() => { setCurrentSlide((slide) => slide % slides.length); }, [slides.length]);

  const slide = slides[currentSlide];

  return (
    <StoreLayout>
      <main className="overflow-hidden">
        <section className="relative min-h-[calc(100vh-8.5rem)] overflow-hidden bg-[#25221d] text-[#fbf8f1]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 7, ease: "easeOut" }} className="absolute inset-0">
                <OptimizedImage src={slide.image} alt="" priority={currentSlide === 0} sizes="100vw" className="h-full w-full object-cover" />
              </motion.div>
              <div className={`absolute inset-0 bg-gradient-to-r ${slide.tone}`} />
              <div className="absolute inset-0 bg-black/10" />
            </motion.div>
          </AnimatePresence>

          <div className="relative z-10 mx-auto flex min-h-[calc(100vh-8.5rem)] max-w-[1440px] flex-col justify-between px-6 pb-10 pt-16 sm:px-10 lg:px-16 lg:pb-14 lg:pt-24">
            <div className="flex items-start justify-between text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">
              <span>Toronto · Canada</span>
              <span className="hidden sm:block">01 / 03 — The Art of Living.</span>
            </div>

            <div className="max-w-3xl pb-12 sm:pb-16">
              <AnimatePresence mode="wait">
                <motion.div key={currentSlide} initial="hidden" animate="show" exit={{ opacity: 0, y: -16 }} variants={{ show: { transition: { staggerChildren: 0.09 } } }}>
                  <motion.p variants={fadeUp} className="eyebrow mb-6 text-[#e6b889]">{slide.kicker}</motion.p>
                  <motion.div variants={fadeUp}><HeroTitle lines={slide.title} /></motion.div>
                  <motion.p variants={fadeUp} className="mt-8 max-w-md text-sm leading-7 text-white/75 sm:text-base">
                    {slide.copy}
                  </motion.p>
                  <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center gap-7">
                    <Link href={slide.ctaHref} className="inline-flex items-center gap-3 bg-[#fbf8f1] px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#25221d] transition-colors hover:bg-[#e6b889]">
                      Shop the collection <ArrowRight size={15} />
                    </Link>
                    <Link href="/custom-studio" className="editorial-link text-white">
                      Visit Custom Studio <ArrowDownRight size={15} />
                    </Link>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-end justify-between gap-6">
              <div className="flex items-center gap-3">
                {slides.map((item, index) => (
                  <button key={item.kicker} type="button" aria-label={`Show slide ${index + 1}`} onClick={() => setCurrentSlide(index)} className="group flex items-center gap-2">
                    <span className={`h-px transition-all duration-500 ${index === currentSlide ? "w-12 bg-white" : "w-5 bg-white/40 group-hover:bg-white"}`} />
                    <span className={`text-[10px] transition-opacity ${index === currentSlide ? "opacity-100" : "opacity-0"}`}>0{index + 1}</span>
                  </button>
                ))}
              </div>
              <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity }} className="hidden items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65 sm:flex">
                Scroll to explore <ArrowDownRight size={14} />
              </motion.div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#ddcfbe] bg-[#efe8dc]">
          <div className="mx-auto grid max-w-[1440px] grid-cols-1 divide-y divide-[#d8c9b7] px-6 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 lg:px-16">
            {values.map(({ icon: Icon, title, copy }, index) => (
              <motion.div key={title} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} variants={fadeUp} transition={{ delay: index * 0.08 }} className="flex gap-4 py-7 sm:px-6 lg:py-9 first:sm:pl-0">
                <Icon size={21} strokeWidth={1.25} className="mt-1 shrink-0 text-[#9b6e4b]" />
                <div><p className="text-xs font-bold uppercase tracking-[0.15em]">{title}</p><p className="mt-2 text-xs leading-5 text-[#6f6255]">{copy}</p></div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-6 py-24 sm:px-10 lg:px-16 lg:py-36">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} variants={fadeUp} className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="eyebrow">A softer point of view</p>
              <h2 className="font-display mt-5 max-w-2xl text-5xl leading-[0.92] tracking-[-0.035em] sm:text-7xl">Furniture with a sense of place.</h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-[#6f6255]">The pieces in our collection are made to hold the everyday: slow mornings, long conversations, quiet afternoons, and all the beautiful in-between.</p>
          </motion.div>

          <div className="mt-16 grid gap-5 md:grid-cols-12">
            {featuredSeries.map((seriesItem, index) => (
              <motion.div key={seriesItem.id} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: index * 0.08 }} className={`${index === 0 ? "md:col-span-7" : index === 1 ? "md:col-span-5" : index === 2 ? "md:col-span-5" : "md:col-span-7"} group relative aspect-[1.15] overflow-hidden bg-[#d9cabb] ${index === 0 ? "md:aspect-[1.2]" : ""}`}>
                <OptimizedImage src={seriesItem.imageUrl || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1300&q=84"} alt={seriesItem.name} sizes="(min-width: 1024px) 50vw, 100vw" className="image-hover h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
                <Link href={`/shop?series=${seriesItem.id}`} className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6 text-white sm:p-8">
                  <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/65">Series 0{index + 1}</p><h3 className="font-display text-4xl tracking-[-0.02em]">{seriesItem.name}</h3></div>
                  <span className="grid h-11 w-11 place-items-center rounded-full border border-white/40 transition-all duration-300 group-hover:bg-white group-hover:text-[#25221d]"><MoveUpRight size={17} /></span>
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="mt-10 flex justify-end"><Link href="/shop" className="editorial-link">View all series <ArrowRight size={15} /></Link></div>
        </section>

        <section className="grain relative overflow-hidden bg-[#25221d] text-[#fbf8f1]">
          <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-6 py-24 sm:px-10 lg:grid-cols-2 lg:px-16 lg:py-36">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} variants={fadeUp} className="relative z-10">
              <p className="eyebrow text-[#e6b889]">Built around you</p>
              <h2 className="font-display mt-5 max-w-xl text-6xl leading-[0.88] tracking-[-0.04em] sm:text-8xl">The shape of your life.</h2>
              <p className="mt-8 max-w-md text-sm leading-7 text-white/65">Start with a silhouette, then make it yours. Our Custom Studio brings together proportions, tactile fabrics, nuanced colours, and the details that make a room feel unmistakably yours.</p>
              <Link href="/custom-studio" className="mt-10 inline-flex items-center gap-3 border-b border-[#e6b889] pb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#e6b889]">Start your configuration <ArrowRight size={15} /></Link>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 45 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.9 }} className="relative min-h-[420px] overflow-hidden lg:min-h-[620px]">
              <OptimizedImage src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1400&q=88" alt="A custom sofa in a calm living room" sizes="(min-width: 1024px) 50vw, 100vw" className="h-full w-full object-cover" />
              <div className="absolute bottom-5 left-5 border border-white/35 bg-black/15 px-4 py-3 backdrop-blur-md"><span className="text-[10px] uppercase tracking-[0.18em] text-white/80">01 · Custom Studio</span></div>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-5"><p className="eyebrow">Our philosophy</p><h2 className="font-display mt-5 text-5xl leading-[0.9] tracking-[-0.04em] sm:text-7xl">The Art of Living.</h2></div>
            <div className="lg:col-span-7 lg:pl-16"><p className="max-w-xl text-lg leading-8 text-[#6f6255]">We believe the best rooms are not over-designed. They are layered over time, softened by use, and filled with things that make you feel at home.</p><Link href="/our-story" className="editorial-link mt-8">Read our story <ArrowRight size={15} /></Link></div>
          </div>
        </section>
      </main>
    </StoreLayout>
  );
}