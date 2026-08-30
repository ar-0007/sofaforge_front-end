"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  MessageCircle,
  Ruler,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import StoreLayout from "@/components/StoreLayout";
import { OptimizedImage } from "@/components/OptimizedImage";
import { PriceLabel } from "@/components/StorefrontPrimitives";
import { CarouselControls, Container, Eyebrow } from "@/features/storefront/primitives";
import { catalogQueryOptions } from "@/lib/storefrontUi";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { ProductConfigurator } from "@/features/storefront/ProductConfigurator";
import { configurationSummary, useConfigurator } from "@/features/storefront/useConfigurator";
import { productItem, toMajorUnits } from "@/lib/analytics/items";
import { useTracking } from "@/lib/analytics/tracker";
import { cn } from "@/lib/utils";

const fallbackImages = [
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1600&q=88",
  "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1600&q=88",
  "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1600&q=88",
];


/** Trust strip below the fold — the same promises the configurator already makes. */
const details = [
  {
    icon: Ruler,
    title: "Made to your scale",
    copy: "Pick the width that suits the room. Every frame is cut to order, never off a pallet.",
  },
  {
    icon: ShieldCheck,
    title: "25-year frame warranty",
    copy: "Kiln-dried hardwood frame and high-resilience cushioning, guaranteed for the long run.",
  },
  {
    icon: Truck,
    title: "White-glove delivery",
    copy: "Carried in, unwrapped and levelled in the room you chose, packaging taken away.",
  },
  {
    icon: MessageCircle,
    title: "Design support",
    copy: "Talk fabric, scale and layout with the studio before a single stitch is sewn.",
  },
];

const MAX_TILT = 8;
const tiltSpring = { stiffness: 150, damping: 18, mass: 0.6 };

/** Shared scroll-reveal for everything below the fold. */
const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
} as const;

/**
 * `gallery` is a JSON string array written by the admin tools, so it can be
 * absent, malformed, or hold non-string entries — anything unusable falls back
 * to the product image plus the house shots.
 */
function parseGallery(raw?: string | null, primary?: string | null): string[] {
  let parsed: string[] = [];
  try {
    const value = raw ? JSON.parse(raw) : null;
    if (Array.isArray(value)) {
      parsed = value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
    }
  } catch {
    parsed = [];
  }

  const images = [primary, ...parsed].filter((entry): entry is string => Boolean(entry));
  const unique = Array.from(new Set(images.length > 0 ? images : fallbackImages));
  // A single-shot gallery reads as a mistake, so pad it with the house shots.
  return unique.length > 1 ? unique : Array.from(new Set([...unique, ...fallbackImages]));
}

function LoadingState() {
  return (
    <main className="bg-sand-100 pb-24 pt-16 lg:pb-32 lg:pt-24">
      <Container>
        <div className="h-3 w-40 animate-pulse rounded bg-sand-200" />
        <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <div className="aspect-[4/5] animate-pulse rounded-2xl bg-sand-200" />
            <div className="mt-4 flex gap-3">
              {["a", "b", "c"].map((key) => (
                <div key={key} className="h-20 w-20 animate-pulse rounded-xl bg-sand-200 sm:h-24 sm:w-24" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="h-3 w-28 animate-pulse rounded bg-sand-200" />
            <div className="mt-5 h-10 w-4/5 animate-pulse rounded bg-sand-200" />
            <div className="mt-4 h-8 w-1/2 animate-pulse rounded bg-sand-200" />
            <div className="mt-6 space-y-3">
              <div className="h-3 w-full animate-pulse rounded bg-sand-200" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-sand-200" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-sand-200" />
            </div>
            <div className="mt-10 grid grid-cols-2 gap-3">
              {["a", "b", "c", "d"].map((key) => (
                <div key={key} className="h-20 animate-pulse rounded-2xl bg-sand-200" />
              ))}
            </div>
            <div className="mt-8 h-14 w-full animate-pulse rounded-full bg-sand-200" />
          </div>
        </div>
      </Container>
    </main>
  );
}

function NotFoundState() {
  return (
    <main className="bg-sand-100 pb-24 pt-16 lg:pb-32 lg:pt-24">
      <Container className="flex min-h-[50vh] max-w-xl flex-col items-center justify-center text-center">
        <Eyebrow>A quiet corner</Eyebrow>
        <h1 className="font-display mt-5 text-4xl leading-[1.02] tracking-[-0.03em] text-ink-900 lg:text-5xl">
          Piece not found.
        </h1>
        <p className="mt-4 text-sm leading-6 text-ink-500">
          The piece you are looking for may have been archived.
        </p>
        <Link
          href="/shop"
          className="mt-9 inline-flex items-center gap-2 rounded-full bg-clay-500 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-clay-600"
        >
          Return to collection <ArrowRight size={15} />
        </Link>
      </Container>
    </main>
  );
}

export default function ProductDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";
  const { data: productBySlug, isLoading } = trpc.commerce.getProductBySlug.useQuery(
    { slug },
    { ...catalogQueryOptions, enabled: Boolean(slug) }
  );
  const product = productBySlug;
  const { data: seriesList = [] } = trpc.commerce.getSeries.useQuery(undefined, catalogQueryOptions);
  const { addToCart } = useCart();
  const { track } = useTracking();
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [saved, setSaved] = useState(false);

  const prefersReducedMotion = useReducedMotion();
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, tiltSpring);
  const rotateY = useSpring(tiltY, tiltSpring);

  const gallery = useMemo(
    () => parseGallery(product?.gallery, product?.imageUrl),
    [product?.gallery, product?.imageUrl]
  );
  const series = seriesList.find((item) => item.id === product?.seriesId);

  // The configurator questions are catalogue data, not code: the owner adds a
  // question or reprices an upgrade in the admin and it appears here.
  const { data: optionGroups = [] } = trpc.commerce.getProductOptions.useQuery(
    { productId: product?.id ?? 0 },
    { ...catalogQueryOptions, enabled: Boolean(product?.id) }
  );
  const {
    selections,
    select,
    total: totalPrice,
  } = useConfigurator(optionGroups, product?.startingPrice ?? 0);
  const variantDetails = configurationSummary(optionGroups, selections);
  const activeIndex = Math.min(activeImage, gallery.length - 1);

  // One `view_item` per product rather than per render: picking a fabric or
  // moving the cursor over the gallery re-renders this page constantly, and a
  // pixel fired on every one of those would wreck the conversion numbers.
  const reportedProductId = useRef<number | null>(null);
  useEffect(() => {
    if (!product) return;
    if (reportedProductId.current === product.id) return;
    reportedProductId.current = product.id;
    track("view_item", {
      value: toMajorUnits(product.startingPrice),
      items: [productItem(product, { category: series?.name })],
      contentName: product.name,
      contentCategory: series?.name,
    });
  }, [product, series?.name, track]);

  function handleTilt(event: React.PointerEvent<HTMLDivElement>) {
    if (prefersReducedMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;
    // Cursor above centre should lift the top edge away, hence the negated Y.
    tiltX.set(-offsetY * MAX_TILT * 2);
    tiltY.set(offsetX * MAX_TILT * 2);
  }

  function resetTilt() {
    tiltX.set(0);
    tiltY.set(0);
  }

  if (isLoading && !product) {
    return (
      <StoreLayout>
        <LoadingState />
      </StoreLayout>
    );
  }

  if (!product) {
    return (
      <StoreLayout>
        <NotFoundState />
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <main className="bg-sand-100 pb-24 pt-16 lg:pb-32 lg:pt-24">
        <Container>
          <nav aria-label="Breadcrumb">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 transition-colors hover:text-clay-500"
            >
              <ArrowLeft size={14} /> Back to collection
            </Link>
          </nav>

          <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
            <section className="lg:col-span-7" aria-label="Product gallery">
              <div style={{ perspective: 1200 }}>
                <motion.div
                  onPointerMove={handleTilt}
                  onPointerLeave={resetTilt}
                  style={{
                    rotateX: prefersReducedMotion ? 0 : rotateX,
                    rotateY: prefersReducedMotion ? 0 : rotateY,
                    transformStyle: "preserve-3d",
                  }}
                  className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-sand-200 bg-sand-200"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeIndex}
                      initial={{ opacity: 0, scale: 1.03 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      className="absolute inset-0"
                    >
                      <OptimizedImage
                        src={gallery[activeIndex]}
                        alt={`${product.name} — view ${activeIndex + 1} of ${gallery.length}`}
                        priority={activeIndex === 0}
                        sizes="(min-width: 1024px) 58vw, 100vw"
                        className="h-full w-full object-cover"
                      />
                    </motion.div>
                  </AnimatePresence>

                  <span className="absolute right-4 top-4 rounded-full bg-sand-50/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                    {activeIndex + 1} / {gallery.length}
                  </span>
                </motion.div>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className="scrollbar-none flex flex-1 gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]">
                  {gallery.map((image, index) => (
                    <button
                      type="button"
                      key={image}
                      onClick={() => setActiveImage(index)}
                      aria-pressed={activeIndex === index}
                      aria-label={`Show ${product.name} view ${index + 1}`}
                      className={cn(
                        "h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-sand-200 bg-sand-200 transition-all sm:h-24 sm:w-24",
                        activeIndex === index
                          ? "ring-2 ring-clay-500 ring-offset-2 ring-offset-sand-100"
                          : "opacity-70 hover:opacity-100"
                      )}
                    >
                      <OptimizedImage
                        src={image}
                        alt={`${product.name} thumbnail ${index + 1}`}
                        sizes="120px"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>

                <CarouselControls
                  className="shrink-0"
                  onPrev={() => setActiveImage((index) => (index - 1 + gallery.length) % gallery.length)}
                  onNext={() => setActiveImage((index) => (index + 1) % gallery.length)}
                  canPrev={gallery.length > 1}
                  canNext={gallery.length > 1}
                />
              </div>
            </section>

            <section className="lg:col-span-5" aria-label="Product details">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <Eyebrow>{series ? `${series.name} series` : "Handcrafted in Canada"}</Eyebrow>
                  <h1 className="font-display mt-4 text-4xl leading-[1.02] tracking-[-0.03em] text-ink-900 lg:text-5xl">
                    {product.name}
                  </h1>
                </div>
                <button
                  type="button"
                  aria-label="Save product to wishlist"
                  aria-pressed={saved}
                  onClick={() => {
                    const nowSaved = !saved;
                    setSaved(nowSaved);
                    // Only the save is an intent signal; un-saving is not an event.
                    if (nowSaved) {
                      track("add_to_wishlist", {
                        value: toMajorUnits(product.startingPrice),
                        items: [productItem(product, { category: series?.name })],
                        contentName: product.name,
                        contentCategory: series?.name,
                      });
                    }
                  }}
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-colors",
                    saved
                      ? "border-clay-500 bg-clay-500 text-white"
                      : "border-sand-300 text-ink-700 hover:border-clay-500 hover:text-clay-500"
                  )}
                >
                  <Heart size={18} strokeWidth={1.6} fill={saved ? "currentColor" : "none"} />
                </button>
              </div>

              <div className="mt-6 flex items-baseline gap-3 border-b border-sand-200 pb-6 text-ink-900">
                <PriceLabel cents={totalPrice} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  CAD
                </span>
              </div>

              <p className="mt-6 max-w-xl text-sm leading-7 text-ink-500">
                {product.description ||
                  "A generous, easy silhouette crafted with a kiln-dried hardwood frame, high-resilience cushioning, and a considered upholstery finish. Made to order for your room, your rhythm, and the way you live."}
              </p>

              <ProductConfigurator
                groups={optionGroups}
                selections={selections}
                onSelect={select}
              />

              <div className="mt-10 flex items-center gap-3">
                <div className="flex items-center rounded-full border border-sand-300">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity((amount) => Math.max(1, amount - 1))}
                    className="grid h-12 w-11 place-items-center rounded-l-full text-lg text-ink-700 transition-colors hover:text-clay-500"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm text-ink-900" aria-live="polite">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity((amount) => amount + 1)}
                    className="grid h-12 w-11 place-items-center rounded-r-full text-lg text-ink-700 transition-colors hover:text-clay-500"
                  >
                    +
                  </button>
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    addToCart({
                      // The configuration is part of the identity: the same piece
                      // in velvet and in linen are two different cart lines.
                      id: `${product.id}-${Object.values(selections).join("-")}`,
                      name: product.name,
                      price: totalPrice,
                      quantity,
                      image: product.imageUrl || gallery[0],
                      variantDetails,
                    });
                    // `totalPrice` carries every option's price delta, so the
                    // reported value is what the shopper actually committed to —
                    // not the catalogue starting price.
                    track("add_to_cart", {
                      value: toMajorUnits(totalPrice * quantity),
                      items: [productItem(product, { price: totalPrice, quantity, category: series?.name })],
                      contentName: product.name,
                      contentCategory: series?.name,
                    });
                  }}
                  className="flex h-12 flex-1 items-center justify-center gap-3 rounded-full bg-ink-900 px-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-sand-50 transition-colors hover:bg-clay-500"
                >
                  Add to bag <ArrowRight size={16} />
                </motion.button>
              </div>

              <Link
                href="/swatches"
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-sand-300 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-700 transition-colors hover:border-clay-500 hover:text-clay-500"
              >
                Order free swatches
              </Link>
            </section>
          </div>

          <motion.section
            {...reveal}
            transition={{ duration: 0.5, ease: "easeOut" }}
            aria-label="What to expect"
            className="mt-20 lg:mt-28"
          >
            <Eyebrow>Made to order</Eyebrow>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {details.map((detail, index) => (
                <motion.div
                  key={detail.title}
                  {...reveal}
                  transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
                  className="rounded-2xl border border-sand-200 bg-sand-50 p-6"
                >
                  <detail.icon size={20} strokeWidth={1.6} className="text-clay-500" />
                  <h2 className="mt-4 text-sm font-medium text-ink-900">{detail.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink-500">{detail.copy}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            {...reveal}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-6 flex flex-col gap-6 rounded-2xl border border-sand-200 bg-sand-50 p-8 sm:flex-row sm:items-center sm:justify-between lg:p-10"
          >
            <div>
              <h2 className="font-display text-3xl leading-[1.05] tracking-[-0.03em] text-ink-900">
                Want it in your own dimensions?
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-ink-500">
                Start from this silhouette and adjust shape, fabric and scale in the studio.
              </p>
            </div>
            <Link
              href="/custom-studio"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-clay-500 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-clay-600"
            >
              Open Custom Studio <ArrowRight size={15} />
            </Link>
          </motion.section>
        </Container>
      </main>
    </StoreLayout>
  );
}
