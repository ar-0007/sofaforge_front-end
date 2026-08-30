"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import StoreLayout from "@/components/StoreLayout";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Container, Eyebrow } from "@/features/storefront/primitives";
import { SHAPES, shapeOf, type ShapeId } from "@/features/storefront/content";
import { catalogQueryOptions } from "@/lib/storefrontUi";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { productItem, productItems, toMajorUnits } from "@/lib/analytics/items";
import { useTracking } from "@/lib/analytics/tracker";
import { cn } from "@/lib/utils";

const fallbackImage =
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=86";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"];

/** Shared card shell so skeletons and real cards occupy identical space. */
const cardShell = "rounded-2xl border border-sand-200 bg-sand-50 p-3";

const pillBase =
  "shrink-0 rounded-full px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors";

function seriesPill(isActive: boolean) {
  return cn(
    pillBase,
    isActive
      ? "bg-ink-900 text-sand-50"
      : "border border-sand-300 text-ink-700 hover:border-clay-500 hover:text-clay-500"
  );
}

/**
 * The shop listing page.
 *
 * The grid card is intentionally the same component family as the home page
 * carousel card, so a piece looks identical wherever it is surfaced.
 */
export default function Shop() {
  const searchParams = useSearchParams();
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | undefined>(undefined);
  const [selectedShape, setSelectedShape] = useState<ShapeId | undefined>(undefined);
  const { data: seriesList = [] } = trpc.commerce.getSeries.useQuery(undefined, catalogQueryOptions);
  const { data: products = [], isLoading } = trpc.commerce.getProducts.useQuery(
    { seriesId: selectedSeriesId },
    catalogQueryOptions
  );
  const { addToCart } = useCart();
  const { track } = useTracking();

  useEffect(() => {
    // Links arrive with either a series id or its slug, so accept both.
    const seriesFromUrl = searchParams?.get("series");
    if (seriesFromUrl) {
      const asId = Number(seriesFromUrl);
      const match = Number.isFinite(asId) && asId > 0
        ? seriesList.find((series) => series.id === asId)
        : seriesList.find((series) => series.slug === seriesFromUrl);
      if (match) setSelectedSeriesId(match.id);
    }

    const shapeFromUrl = searchParams?.get("shape");
    if (shapeFromUrl && SHAPES.items.some((item) => item.id === shapeFromUrl)) {
      setSelectedShape(shapeFromUrl as ShapeId);
    }
  }, [searchParams, seriesList]);

  const activeSeries = seriesList.find((series) => series.id === selectedSeriesId);
  const activeShape = SHAPES.items.find((shape) => shape.id === selectedShape);

  // Shape is not a database column — it is implicit in the piece name, so the
  // series filter runs server-side and the shape filter runs here.
  const visibleProducts = selectedShape
    ? products.filter((product) => shapeOf(product.name) === selectedShape)
    : products;

  // `view_item_list` per filter combination, not per render. The signature
  // keeps a re-fetch that returns the same rows from firing a second event,
  // while an actual filter change still reports the new list.
  const listSignature = `${selectedSeriesId ?? "all"}:${selectedShape ?? "all"}:${visibleProducts.length}`;
  const reportedList = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading) return;
    if (visibleProducts.length === 0) return;
    if (reportedList.current === listSignature) return;
    reportedList.current = listSignature;
    track("view_item_list", {
      items: productItems(visibleProducts, activeSeries?.name),
      contentName: activeShape?.name ?? activeSeries?.name ?? "All pieces",
      contentCategory: activeSeries?.name,
    });
  }, [isLoading, listSignature, visibleProducts, activeSeries?.name, activeShape?.name, track]);

  const clearFilters = () => {
    setSelectedSeriesId(undefined);
    setSelectedShape(undefined);
  };

  return (
    <StoreLayout>
      <main className="bg-sand-100 pb-24 pt-16 lg:pb-32 lg:pt-24">
        <Container>
          <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-12">
            <div>
              <Eyebrow>The collection</Eyebrow>
              <h1 className="font-display mt-5 max-w-xl text-5xl leading-[1.02] tracking-[-0.03em] text-ink-900 lg:text-6xl">
                Pieces for the way you live.
              </h1>
            </div>
            <p className="max-w-xs text-sm leading-6 text-ink-500 sm:text-right">
              Custom-built in Canada from honest materials and enduring forms. Explore the series,
              then find the piece that makes the room yours.
            </p>
          </header>

          <div
            data-testid="shape-filter"
            className="scrollbar-none mt-10 flex items-center gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]"
          >
            <button
              type="button"
              onClick={() => setSelectedShape(undefined)}
              aria-pressed={selectedShape === undefined}
              className={seriesPill(selectedShape === undefined)}
            >
              All shapes
            </button>
            {SHAPES.items.map((shape) => (
              <button
                key={shape.id}
                type="button"
                onClick={() => setSelectedShape(shape.id)}
                aria-pressed={selectedShape === shape.id}
                className={seriesPill(selectedShape === shape.id)}
              >
                {shape.name}
              </button>
            ))}
          </div>

          <div
            data-testid="series-filter"
            className="scrollbar-none mt-3 flex items-center gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]"
          >
            <button
              type="button"
              onClick={() => setSelectedSeriesId(undefined)}
              aria-pressed={selectedSeriesId === undefined}
              className={seriesPill(selectedSeriesId === undefined)}
            >
              All
            </button>
            {seriesList.map((series) => (
              <button
                key={series.id}
                type="button"
                onClick={() => setSelectedSeriesId(series.id)}
                aria-pressed={selectedSeriesId === series.id}
                className={seriesPill(selectedSeriesId === series.id)}
              >
                {series.name}
              </button>
            ))}
          </div>

          <p className="mt-6 text-sm text-ink-500">
            {visibleProducts.length} {visibleProducts.length === 1 ? "piece" : "pieces"}
            {activeShape ? ` · ${activeShape.name}` : ""}
            {activeSeries ? ` · ${activeSeries.name} series` : ""}
            {!activeShape && !activeSeries ? " · every one made to order" : ""}
          </p>

          {isLoading ? (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {SKELETON_KEYS.map((key) => (
                <div key={key} className={cardShell}>
                  <div className="aspect-square animate-pulse rounded-xl bg-sand-200" />
                  <div className="px-1 pb-1 pt-4">
                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-sand-200" />
                    <div className="mt-2.5 h-3 w-1/3 animate-pulse rounded bg-sand-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-sand-300 px-6 py-20 text-center">
              <p className="font-display text-3xl text-ink-900">No pieces match that pairing.</p>
              <p className="mt-3 text-sm text-ink-500">
                Not every shape is built in every series. Clear the filters to see all of them.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-7 inline-flex items-center rounded-full bg-clay-500 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-clay-600"
              >
                View all pieces
              </button>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  // Cap the stagger so rows far down the page still arrive promptly.
                  transition={{ duration: 0.5, ease: "easeOut", delay: Math.min(index, 7) * 0.05 }}
                >
                  <Link
                    href={`/product/${product.slug}`}
                    className={cn(
                      cardShell,
                      "group relative block h-full",
                      "transition-all duration-300 hover:-translate-y-1 hover:ring-1 hover:ring-ink-900/15",
                      "hover:shadow-[0_20px_45px_-28px_rgba(31,27,23,0.45)]"
                    )}
                  >
                    <div className="aspect-square overflow-hidden rounded-xl bg-sand-100">
                      <OptimizedImage
                        src={product.imageUrl || fallbackImage}
                        alt={product.name}
                        sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    </div>

                    <div className="px-1 pb-1 pr-12 pt-4">
                      <h2 className="truncate text-sm font-medium text-ink-900">{product.name}</h2>
                      <p className="mt-1 text-sm text-ink-500">
                        From ${(product.startingPrice / 100).toLocaleString()}
                      </p>
                    </div>

                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-16 right-4 hidden rounded-full bg-ink-900 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sand-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block"
                    >
                      Add to bag
                    </span>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      aria-label={`Add ${product.name} to bag`}
                      onClick={(event) => {
                        // The whole card is a Link, so keep the click on the button.
                        event.preventDefault();
                        event.stopPropagation();
                        addToCart({
                          id: `product-${product.id}`,
                          name: product.name,
                          price: product.startingPrice,
                          quantity: 1,
                          image: product.imageUrl || undefined,
                          variantDetails: "Standard configuration",
                        });
                        track("add_to_cart", {
                          value: toMajorUnits(product.startingPrice),
                          items: [productItem(product, { category: activeSeries?.name })],
                          contentName: product.name,
                          contentCategory: activeSeries?.name,
                        });
                      }}
                      className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-clay-500 text-white transition-colors hover:bg-clay-600"
                    >
                      <ShoppingBag size={16} strokeWidth={1.7} />
                    </motion.button>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </Container>
      </main>
    </StoreLayout>
  );
}
