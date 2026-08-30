import { MAX_ANALYTICS_ITEMS, type AnalyticsItem } from "@shared/analytics/events";

/**
 * Turning catalog rows and cart lines into the shape the pixels expect.
 *
 * Every call site goes through here for one reason: money. The catalog stores
 * cents, the analytics contract wants major units, and an ad platform reads a
 * bare number as dollars. Skip the conversion once and a $4,400 sofa is
 * reported as a $440,000 one, which quietly ruins every ROAS figure the ads
 * team looks at.
 */

/** Cents -> major units, e.g. 440000 -> 4400. */
export function toMajorUnits(cents: number): number {
  if (!Number.isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}

/** The catalog fields tracking needs; anything wider is ignored on purpose. */
type CatalogProduct = {
  id: number;
  name: string;
  startingPrice: number;
};

/** A cart line, described structurally so this file stays free of the cart context. */
type CartLine = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

/**
 * One catalog row as an analytics item.
 *
 * `price` overrides the catalog price for a configured piece, where fabric and
 * scale have already been added on top of the starting price.
 */
export function productItem(
  product: CatalogProduct,
  options: { price?: number; quantity?: number; category?: string } = {},
): AnalyticsItem {
  return {
    id: String(product.id),
    name: product.name,
    category: options.category,
    price: toMajorUnits(options.price ?? product.startingPrice),
    quantity: options.quantity ?? 1,
  };
}

/**
 * A list of catalog rows, for `view_item_list`.
 *
 * Truncated to the cap the backend enforces: the shop page renders every piece
 * in the catalogue, and sending all of them would get the whole event rejected
 * rather than trimmed.
 */
export function productItems(products: CatalogProduct[], category?: string): AnalyticsItem[] {
  return products.slice(0, MAX_ANALYTICS_ITEMS).map(product => productItem(product, { category }));
}

/** One cart line as an analytics item. */
export function cartItem(line: CartLine): AnalyticsItem {
  return {
    id: line.id,
    name: line.name,
    price: toMajorUnits(line.price),
    quantity: line.quantity,
  };
}

export function cartItems(cart: CartLine[]): AnalyticsItem[] {
  return cart.map(cartItem);
}

/** Cart total in major units — quantity included, which `subtotal` already is. */
export function cartValue(cart: CartLine[]): number {
  return toMajorUnits(cart.reduce((total, line) => total + line.price * line.quantity, 0));
}
