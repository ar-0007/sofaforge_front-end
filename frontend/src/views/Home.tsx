"use client";

import StoreLayout from "@/components/StoreLayout";
import { ConfiguratorPreview } from "@/features/storefront/ConfiguratorPreview";
import { Hero } from "@/features/storefront/Hero";
import { IntroReveal } from "@/features/storefront/IntroReveal";
import { ProductCarousel } from "@/features/storefront/ProductCarousel";
import { RoomVisualiser } from "@/features/storefront/RoomVisualiser";
import { SeriesShowcase } from "@/features/storefront/SeriesShowcase";
import { ShapeFinder } from "@/features/storefront/ShapeFinder";
import { Testimonials } from "@/features/storefront/Testimonials";
import { TrustStrip } from "@/features/storefront/TrustStrip";

/**
 * The storefront home page.
 *
 * Ordered around the three questions a person buying a sectional actually asks,
 * in the order they ask them: will it fit (shape finder, room visualiser),
 * what will it look like (series, pieces), and can I trust this (configurator
 * detail, guarantees, other buyers).
 */
export default function Home() {
  return (
    <>
      <IntroReveal />
      <StoreLayout>
        <Hero />
        <ShapeFinder />
        <RoomVisualiser />
        <SeriesShowcase />
        <ProductCarousel />
        <ConfiguratorPreview />
        <TrustStrip />
        <Testimonials />
      </StoreLayout>
    </>
  );
}
