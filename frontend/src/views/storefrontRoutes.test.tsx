import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSeries: vi.fn(),
  getProducts: vi.fn(),
  getPlacements: vi.fn(),
  getStudioSteps: vi.fn(),
  getProductBySlug: vi.fn(),
  getProductOptions: vi.fn(),
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
      getStudioSteps: { useQuery: mocks.getStudioSteps },
      getProductBySlug: { useQuery: mocks.getProductBySlug },
      getProductOptions: { useQuery: mocks.getProductOptions },
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
    // No rows means the Custom Studio falls back to the four steps it shipped
    // with, which is the path a fresh install actually takes.
    mocks.getStudioSteps.mockReturnValue({ data: [] });
    mocks.getProductBySlug.mockReturnValue({ data: {
      id: 11,
      name: "Bobby Armless Chair",
      slug: "bobby-armless-chair-custom",
      imageUrl: "https://images.example.com/bobby-product.jpg",
      startingPrice: 440000,
      description: "A generous, easy silhouette.",
    }, isLoading: false });
    // Shaped like the imported store: a priced depth question, a material, and
    // colours that only appear under the material they belong to.
    mocks.getProductOptions.mockReturnValue({
      data: [
        {
          id: 1,
          label: "Select Depth",
          slug: "depth",
          helpText: null,
          displayType: "radio",
          isRequired: true,
          choices: [
            { id: 11, parentChoiceId: null, label: '40" Comfy Depth', value: "comfy-40", priceDelta: 200000, imageUrl: null, swatchColor: null, description: null, isDefault: true },
            { id: 12, parentChoiceId: null, label: '46" Luxe Depth', value: "luxe-46", priceDelta: 5999990, imageUrl: null, swatchColor: null, description: null, isDefault: false },
          ],
        },
        {
          id: 2,
          label: "Select Material",
          slug: "material",
          helpText: null,
          displayType: "swatch",
          isRequired: true,
          choices: [
            { id: 21, parentChoiceId: null, label: "Textured Weave", value: "textured-weave", priceDelta: 0, imageUrl: null, swatchColor: null, description: null, isDefault: true },
            { id: 22, parentChoiceId: null, label: "Velvet", value: "velvet", priceDelta: 0, imageUrl: null, swatchColor: null, description: null, isDefault: false },
          ],
        },
      ],
    });
    mocks.saveConfiguration.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.addToCart.mockReset();
  });

  it("renders the Home route with the brand promise, the shape finder and live product content", () => {
    const markup = renderToStaticMarkup(React.createElement(Home));
    // Positioning: the room comes first, the catalogue second.
    expect(markup).toContain("Built around");
    expect(markup).toContain("your room.");
    expect(markup).toContain("Build your sectional");
    // The shape finder is the primary way into 110 pieces.
    expect(markup).toContain("L-Shape");
    expect(markup).toContain("/shop?shape=l-shape");
    // Live catalogue data still reaches the page.
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

  it("renders Product Detail with the configurator its options describe", () => {
    const markup = renderToStaticMarkup(React.createElement(ProductDetail));
    expect(markup).toContain("Bobby Armless Chair");
    // Options come from the catalogue, so the questions and their price
    // changes are whatever the store defines — not anything written in code.
    expect(markup).toContain("Select Depth");
    expect(markup).toContain('40&quot; Comfy Depth');
    expect(markup).toContain("+$2,000.00");
    expect(markup).toContain("Select Material");
    expect(markup).toContain("Velvet");
    expect(markup).toContain("Add to bag");
  });

  it("prices Product Detail from the base plus the selected options", () => {
    const markup = renderToStaticMarkup(React.createElement(ProductDetail));
    // $4,400 base + $2,000 for the depth that is selected by default.
    expect(markup).toContain("Starting from $6,400");
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
