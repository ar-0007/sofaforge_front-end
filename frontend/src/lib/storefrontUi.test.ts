import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConfiguratorProgress, HeroTitle, PriceLabel, SeriesFilter } from "@/components/StorefrontPrimitives";
import { OptimizedImage, optimizeImageUrl } from "@/components/OptimizedImage";
import { calculateCustomTotal, formatCents, getProductGallery, getSeriesFilterId, storefrontRoutes } from "./storefrontUi";

describe("storefront UI helpers", () => {
  it("parses a series filter from shop navigation without accepting invalid ids", () => {
    expect(getSeriesFilterId("/shop?series=7")).toBe(7);
    expect(getSeriesFilterId("/shop?series=not-a-number")).toBeUndefined();
    expect(getSeriesFilterId("/shop")).toBeUndefined();
  });

  it("keeps a primary product image first and removes duplicate gallery images", () => {
    const gallery = getProductGallery("https://images.example.com/sofa.jpg");
    expect(gallery[0]).toBe("https://images.example.com/sofa.jpg");
    expect(new Set(gallery).size).toBe(gallery.length);
    expect(gallery).toHaveLength(4);
  });

  it("calculates custom totals from shape, fabric, and scale add-ons", () => {
    expect(calculateCustomTotal(440000, 35000, 40000)).toBe(515000);
    expect(calculateCustomTotal(-100, -200, 300)).toBe(300);
    expect(formatCents(515000)).toBe("$5,150");
  });

  it("keeps the redesigned customer routes discoverable", () => {
    expect(storefrontRoutes).toEqual(["/", "/shop", "/custom-studio", "/wishlist", "/swatches", "/room-planner"]);
  });
});

describe("redesigned storefront UI", () => {
  it("renders the homepage hero title with its editorial line breaks", () => {
    const markup = renderToStaticMarkup(React.createElement(HeroTitle, { lines: ["Rooms made for", "living beautifully."] }));
    expect(markup).toContain("Rooms made for");
    expect(markup).toContain("living beautifully.");
    expect(markup).toContain("data-testid=\"hero-title\"");
  });

  it("renders the shop series filter with selected state semantics", () => {
    const markup = renderToStaticMarkup(React.createElement(SeriesFilter, { series: [{ id: 1, name: "Bobby" }, { id: 2, name: "Diane" }], selectedId: 2, onSelect: () => undefined }));
    expect(markup).toContain("data-testid=\"series-filter\"");
    expect(markup).toContain("Bobby");
    expect(markup).toContain("Diane");
    expect(markup).toContain("aria-pressed=\"true\"");
  });

  it("renders responsive image attributes for product and hero media", () => {
    const markup = renderToStaticMarkup(React.createElement(OptimizedImage, { src: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1400&q=88", alt: "Sofa", sizes: "100vw" }));
    expect(markup).toContain("loading=\"lazy\"");
    expect(markup).toContain("decoding=\"async\"");
    expect(markup).toContain("srcSet=");
    expect(optimizeImageUrl("https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1400", 768)).toContain("w=768");
  });

  it("renders starting-from pricing and Custom Studio step context", () => {
    const priceMarkup = renderToStaticMarkup(React.createElement(PriceLabel, { cents: 440000 }));
    const stepMarkup = renderToStaticMarkup(React.createElement(ConfiguratorProgress, { step: 2, labels: ["Shape", "Fabric", "Colour", "Scale"] }));
    expect(priceMarkup).toContain("Starting from $4,400");
    expect(stepMarkup).toContain("data-testid=\"configurator-progress\"");
    expect(stepMarkup).toContain("aria-current=\"step\"");
    expect(stepMarkup).toContain("Fabric");
  });
});
