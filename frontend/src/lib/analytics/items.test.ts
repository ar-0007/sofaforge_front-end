import { describe, expect, it } from "vitest";
import { MAX_ANALYTICS_ITEMS } from "@shared/analytics/events";
import { cartItem, cartItems, cartValue, productItem, productItems, toMajorUnits } from "./items";

const sofa = { id: 12, name: "Stanton II Sectional", startingPrice: 440000 };

describe("toMajorUnits", () => {
  it("converts the catalog's cents into the dollars ad platforms expect", () => {
    expect(toMajorUnits(440000)).toBe(4400);
    expect(toMajorUnits(129999)).toBe(1299.99);
  });

  it("reports zero rather than NaN for a missing or broken price", () => {
    expect(toMajorUnits(Number.NaN)).toBe(0);
    expect(toMajorUnits(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("productItem", () => {
  it("describes a catalog row at its starting price", () => {
    expect(productItem(sofa)).toEqual({
      id: "12",
      name: "Stanton II Sectional",
      category: undefined,
      price: 4400,
      quantity: 1,
    });
  });

  it("uses the configured price when fabric and scale were added on top", () => {
    const configured = productItem(sofa, { price: 515000, quantity: 2, category: "Stanton" });
    expect(configured.price).toBe(5150);
    expect(configured.quantity).toBe(2);
    expect(configured.category).toBe("Stanton");
  });

  it("sends the id as a string, which both pixels require", () => {
    expect(productItem(sofa).id).toBe("12");
  });
});

describe("productItems", () => {
  it("tags a whole listing with the series being viewed", () => {
    const items = productItems([sofa, { id: 13, name: "Bobby Chaise", startingPrice: 320000 }], "Stanton");
    expect(items.map(item => item.price)).toEqual([4400, 3200]);
    expect(items.every(item => item.category === "Stanton")).toBe(true);
  });

  it("truncates to the cap the backend enforces", () => {
    // The real shop page renders 110 pieces. Sending them all made the backend
    // reject the whole `view_item_list` event instead of trimming it.
    const catalogue = Array.from({ length: 110 }, (_, index) => ({
      id: index + 1,
      name: `Piece ${index + 1}`,
      startingPrice: 100000,
    }));
    expect(productItems(catalogue)).toHaveLength(MAX_ANALYTICS_ITEMS);
  });

  it("leaves a list shorter than the cap alone", () => {
    expect(productItems([sofa])).toHaveLength(1);
  });
});

describe("cartItem", () => {
  it("keeps the variant id and converts the line price", () => {
    expect(cartItem({ id: "12-Bouclé-Ink-Grand", name: "Stanton II", price: 515000, quantity: 2 })).toEqual({
      id: "12-Bouclé-Ink-Grand",
      name: "Stanton II",
      price: 5150,
      quantity: 2,
    });
  });
});

describe("cartValue", () => {
  it("totals the bag in dollars, counting quantity", () => {
    expect(
      cartValue([
        { id: "a", name: "A", price: 440000, quantity: 2 },
        { id: "b", name: "B", price: 129999, quantity: 1 },
      ]),
    ).toBe(10099.99);
  });

  it("is zero for an empty bag", () => {
    expect(cartValue([])).toBe(0);
  });

  it("matches the sum of the items it is sent alongside", () => {
    const cart = [
      { id: "a", name: "A", price: 440000, quantity: 2 },
      { id: "b", name: "B", price: 129999, quantity: 1 },
    ];
    const summed = cartItems(cart).reduce((total, item) => total + item.price! * item.quantity!, 0);
    expect(Number(summed.toFixed(2))).toBe(cartValue(cart));
  });
});
