/**
 * One canonical event vocabulary, shared by the browser pixels and the
 * server-side Conversions APIs.
 *
 * Application code only ever names an event from `ANALYTICS_EVENTS`. Each
 * provider translates that name into whatever its own platform calls it, so
 * adding a platform never touches a call site.
 */

export const ANALYTICS_EVENTS = [
  "page_view",
  "view_item",
  "view_item_list",
  "add_to_cart",
  "remove_from_cart",
  "add_to_wishlist",
  "begin_checkout",
  "purchase",
  "search",
  "sign_up",
  "lead",
  "customise_start",
  "customise_complete",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

/**
 * How many items one event may carry.
 *
 * The backend rejects anything longer, so a listing page has to truncate rather
 * than send its whole grid — a 110-piece shop page would otherwise have its
 * `view_item_list` thrown away entirely. Ad platforms cap these lists too.
 */
export const MAX_ANALYTICS_ITEMS = 50;

export type AnalyticsItem = {
  id: string;
  name?: string;
  category?: string;
  /** Major units, e.g. 1299.99 — not cents. */
  price?: number;
  quantity?: number;
};

export type AnalyticsPayload = {
  /** Major units. */
  value?: number;
  currency?: string;
  items?: AnalyticsItem[];
  searchTerm?: string;
  orderId?: string;
  contentName?: string;
  contentCategory?: string;
};

/** Meta's names for our events. Null means Meta has no equivalent worth sending. */
export const META_EVENT_NAMES: Record<AnalyticsEventName, string | null> = {
  page_view: "PageView",
  view_item: "ViewContent",
  view_item_list: "ViewCategory",
  add_to_cart: "AddToCart",
  remove_from_cart: null,
  add_to_wishlist: "AddToWishlist",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
  search: "Search",
  sign_up: "CompleteRegistration",
  lead: "Lead",
  customise_start: "CustomizeProduct",
  customise_complete: "CustomizeProduct",
};

/** TikTok's names for our events. */
export const TIKTOK_EVENT_NAMES: Record<AnalyticsEventName, string | null> = {
  page_view: "Pageview",
  view_item: "ViewContent",
  view_item_list: "ViewContent",
  add_to_cart: "AddToCart",
  remove_from_cart: null,
  add_to_wishlist: "AddToWishlist",
  begin_checkout: "InitiateCheckout",
  purchase: "CompletePayment",
  search: "Search",
  sign_up: "CompleteRegistration",
  lead: "SubmitForm",
  customise_start: "ClickButton",
  customise_complete: "ClickButton",
};

/** GA4's names for our events. GA4 already uses this vocabulary. */
export const GA4_EVENT_NAMES: Record<AnalyticsEventName, string | null> = {
  page_view: "page_view",
  view_item: "view_item",
  view_item_list: "view_item_list",
  add_to_cart: "add_to_cart",
  remove_from_cart: "remove_from_cart",
  add_to_wishlist: "add_to_wishlist",
  begin_checkout: "begin_checkout",
  purchase: "purchase",
  search: "search",
  sign_up: "sign_up",
  lead: "generate_lead",
  customise_start: "customise_start",
  customise_complete: "customise_complete",
};

export function isAnalyticsEvent(name: string): name is AnalyticsEventName {
  return (ANALYTICS_EVENTS as ReadonlyArray<string>).includes(name);
}
