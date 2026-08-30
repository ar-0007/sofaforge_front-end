import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSeries: vi.fn(),
  getProducts: vi.fn(),
  getPlacements: vi.fn(),
  getProductBySlug: vi.fn(),
  saveConfiguration: vi.fn(),
  addToCart: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => React.createElement("a", { href, ...props }, children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/shop",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
  useParams: () => ({ slug: "bobby-armless-chair-custom" }),
}));

vi.mock("@/components/StoreLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => React.createElement("div", { "data-testid": "store-layout" }, children),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    commerce: {
      getSeries: { useQuery: mocks.getSeries },
      getProducts: { useQuery: mocks.getProducts },
      getPlacements: { useQuery: mocks.getPlacements },
      getProductBySlug: { useQuery: mocks.getProductBySlug },
      saveConfiguration: { useMutation: mocks.saveConfiguration },
    },
  },
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ addToCart: mocks.addToCart }),
}));

import Home from "./Home";
import Shop from "./Shop";
import ProductDetail from "./ProductDetail";
import CustomStudio from "./CustomStudio";

describe("redesigned storefront routes", () => {
  beforeEach(() => {
    mocks.getSeries.mockReturnValue({ data: [
      { id: 1, name: "Bobby", imageUrl: "https://images.example.com/bobby.jpg" },
      { id: 2, name: "Diane", imageUrl: "https://images.example.com/diane.jpg" },
    ] });
    mocks.getProducts.mockReturnValue({ data: [
      { id: 11, name: "Bobby Armless Chair", slug: "bobby-armless-chair-custom", imageUrl: "https://images.example.com/bobby-product.jpg", startingPrice: 440000, description: "A generous, easy silhouette." },
    ], isLoading: false });
    mocks.getPlacements.mockReturnValue({ data: [] });
    mocks.getProductBySlug.mockReturnValue({ data: {
      id: 11,
      name: "Bobby Armless Chair",
      slug: "bobby-armless-chair-custom",
      imageUrl: "https://images.example.com/bobby-product.jpg",
      startingPrice: 440000,
      description: "A generous, easy silhouette.",
    }, isLoading: false });
    mocks.saveConfiguration.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.addToCart.mockReset();
  });

  it("renders the Home route with the exact brand promise and live series content", () => {
    const markup = renderToStaticMarkup(React.createElement(Home));
    expect(markup).toContain("Rooms made for");
    expect(markup).toContain("The Art of Living.");
    expect(markup).toContain("Bobby");
    expect(markup).toContain("Custom Studio");
  });

  it("renders the Shop route with series filters and starting-from product pricing", () => {
    const markup = renderToStaticMarkup(React.createElement(Shop));
    expect(markup).toContain("Pieces for the way you live.");
    expect(markup).toContain("data-testid=\"series-filter\"");
    expect(markup).toContain("Bobby");
    expect(markup).toContain("From $4,400");
    expect(markup).toContain("Add to bag");
  });

  it("renders Product Detail with configurable choices and starting-from pricing", () => {
    const markup = renderToStaticMarkup(React.createElement(ProductDetail));
    expect(markup).toContain("Bobby Armless Chair");
    expect(markup).toContain("Starting from $4,400");
    expect(markup).toContain("Belgian Linen");
    expect(markup).toContain("Add to bag");
  });

  it("renders Custom Studio with the first step and live summary", () => {
    const markup = renderToStaticMarkup(React.createElement(CustomStudio));
    expect(markup).toContain("A piece made");
    expect(markup).toContain("Start with a shape.");
    expect(markup).toContain("Sectional with Chaise");
    expect(markup).toContain("$4,400");
    expect(markup).toContain("data-testid=\"configurator-progress\"");
  });
});
