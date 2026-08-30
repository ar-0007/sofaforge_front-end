"use client";

import StoreLayout from "@/components/StoreLayout";
import { ConfiguratorPreview } from "@/features/storefront/ConfiguratorPreview";
import { HeroStage } from "@/features/storefront/HeroStage";
import { ProductCarousel } from "@/features/storefront/ProductCarousel";
import { RoomVisualiser } from "@/features/storefront/RoomVisualiser";
import { SeriesShowcase } from "@/features/storefront/SeriesShowcase";
import { ShapeFinder } from "@/features/storefront/ShapeFinder";
import { Testimonials } from "@/features/storefront/Testimonials";
import { TrustStrip } from "@/features/storefront/TrustStrip";

/**
 * The home page, second draft — live at `/home2` so it can be shown next to
 * `/` and chosen between rather than argued about.
 *
 * Everything below the fold is the same page: the sections were never the
 * problem. What changed is the entrance. The timed intro overlay is gone, and
 * so is the pair of tiles that drifted across every section whether or not
 * anyone was reading. In their place the hero is a pair of doors the visitor
 * scrolls open onto a live 3D sectional they can turn over and re-upholster in
 * any of the five house fabrics — the same five the configurator offers
 * further down.
 *
 * The rule the whole page now follows: motion is a response to the visitor,
 * never a loop playing at them.
 */
export default function Home2() {
  return (
    <StoreLayout>
      <HeroStage />
      <ShapeFinder />
      <RoomVisualiser />
      <SeriesShowcase />
      <ProductCarousel />
      <ConfiguratorPreview />
      <TrustStrip />
      <Testimonials />
    </StoreLayout>
  );
}
