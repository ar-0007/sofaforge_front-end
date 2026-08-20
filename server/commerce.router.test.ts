import { describe, expect, it } from "vitest";
import { fallbackProducts, fallbackProductsForSeries, fallbackSeries, findFallbackProduct } from "./catalogFallback";

describe("commerce catalog fallbacks", () => {
  it("keeps the storefront catalog available when the products query is unavailable", () => {
    expect(fallbackSeries).toHaveLength(7);
    expect(fallbackProducts.length).toBeGreaterThan(0);
    expect(fallbackProducts[0]).toMatchObject({
      seriesId: 1,
      slug: "bobby-armless-chair-custom",
      isCustom: "true",
    });
  });

  it("filters fallback products by series and resolves product slugs", () => {
    expect(fallbackProductsForSeries(2).every((product) => product.seriesId === 2)).toBe(true);
    expect(findFallbackProduct("bobby-armless-chair-custom")?.name).toBe("Bobby Sofa");
    expect(findFallbackProduct("unknown-product")?.slug).toBe("bobby-armless-chair-custom");
  });
});
