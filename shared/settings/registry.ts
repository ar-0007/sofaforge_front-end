/**
 * The single source of truth for every store setting.
 *
 * Backend validates writes against this list, the admin UI renders its forms
 * from it, and the storefront reads the public subset. Adding a new setting
 * (a new pixel, a new shipping rule) means adding one entry here — no form
 * markup, no validation branch, no router change.
 */

export type SettingGroupId = "store" | "checkout" | "marketing" | "advanced";

export type SettingType =
  | "text"
  | "textarea"
  | "number"
  | "toggle"
  | "select"
  | "secret"
  | "email"
  | "url";

export type SettingField = {
  key: string;
  label: string;
  type: SettingType;
  group: SettingGroupId;
  /** Section heading inside the group's page. */
  section: string;
  help?: string;
  placeholder?: string;
  options?: ReadonlyArray<{ value: string; label: string }>;
  /** Stored write-only. Reads return a mask, never the value. */
  secret?: boolean;
  /** Readable by the storefront without authentication. */
  publicRead?: boolean;
  defaultValue?: string;
  /** Regex the value must match when non-empty. */
  pattern?: string;
  patternHint?: string;
  maxLength?: number;
};

export type SettingGroup = {
  id: SettingGroupId;
  label: string;
  description: string;
};

export const SETTING_GROUPS: ReadonlyArray<SettingGroup> = [
  { id: "store", label: "Store details", description: "Name, contact routes and the social profiles shown across the storefront." },
  { id: "checkout", label: "Checkout & shipping", description: "Currency, tax and the shipping rules applied to every order." },
  { id: "marketing", label: "Marketing & tracking", description: "Connect ad platform pixels so campaigns can measure and optimise." },
  { id: "advanced", label: "Advanced", description: "Site verification, maintenance mode and other rarely-touched controls." },
];

/** A saved secret reads back as this. Never send it back as a new value. */
export const SECRET_MASK = "••••••••••••";

const ID_DIGITS = "^[0-9]{6,32}$";
const ALNUM_ID = "^[A-Za-z0-9_-]{4,64}$";

export const SETTING_FIELDS: ReadonlyArray<SettingField> = [
  // ---------------------------------------------------------------- store --
  { key: "store.name", group: "store", section: "Identity", label: "Store name", type: "text", publicRead: true, defaultValue: "Sofa Co.", maxLength: 120, help: "Shown in the browser tab, in emails and in structured data." },
  { key: "store.tagline", group: "store", section: "Identity", label: "Tagline", type: "text", publicRead: true, maxLength: 160 },
  { key: "store.logoUrl", group: "store", section: "Identity", label: "Logo URL", type: "url", publicRead: true, placeholder: "https://..." },
  { key: "store.supportEmail", group: "store", section: "Contact", label: "Support email", type: "email", publicRead: true, placeholder: "hello@sofaco.com" },
  { key: "store.phone", group: "store", section: "Contact", label: "Phone", type: "text", publicRead: true, maxLength: 40 },
  { key: "store.whatsapp", group: "store", section: "Contact", label: "WhatsApp number", type: "text", publicRead: true, maxLength: 40, help: "Digits with country code. Leave blank to hide the WhatsApp button." },
  { key: "store.addressLine", group: "store", section: "Showroom", label: "Street address", type: "text", publicRead: true, maxLength: 255 },
  { key: "store.city", group: "store", section: "Showroom", label: "City", type: "text", publicRead: true, maxLength: 120 },
  { key: "store.country", group: "store", section: "Showroom", label: "Country", type: "text", publicRead: true, maxLength: 120 },
  { key: "store.instagram", group: "store", section: "Social profiles", label: "Instagram URL", type: "url", publicRead: true },
  { key: "store.facebook", group: "store", section: "Social profiles", label: "Facebook URL", type: "url", publicRead: true },
  { key: "store.tiktok", group: "store", section: "Social profiles", label: "TikTok URL", type: "url", publicRead: true },
  { key: "store.pinterest", group: "store", section: "Social profiles", label: "Pinterest URL", type: "url", publicRead: true },

  // ------------------------------------------------------------- checkout --
  {
    key: "checkout.currency", group: "checkout", section: "Currency", label: "Currency", type: "select", publicRead: true, defaultValue: "CAD",
    options: [
      { value: "CAD", label: "CAD - Canadian dollar" },
      { value: "USD", label: "USD - US dollar" },
      { value: "GBP", label: "GBP - Pound sterling" },
      { value: "EUR", label: "EUR - Euro" },
      { value: "AED", label: "AED - UAE dirham" },
      { value: "PKR", label: "PKR - Pakistani rupee" },
    ],
    help: "Used for storefront prices and for the value sent in every ad platform event.",
  },
  { key: "checkout.currencySymbol", group: "checkout", section: "Currency", label: "Currency symbol", type: "text", publicRead: true, defaultValue: "$", maxLength: 4 },
  { key: "checkout.taxRatePercent", group: "checkout", section: "Tax", label: "Tax rate (%)", type: "number", publicRead: true, defaultValue: "0", help: "Applied at checkout. Use 0 if your prices already include tax." },
  { key: "checkout.taxIncluded", group: "checkout", section: "Tax", label: "Prices already include tax", type: "toggle", publicRead: true, defaultValue: "false" },
  { key: "checkout.flatShipping", group: "checkout", section: "Shipping", label: "Flat shipping fee", type: "number", publicRead: true, defaultValue: "0", help: "In cents. 4900 means $49.00." },
  { key: "checkout.freeShippingThreshold", group: "checkout", section: "Shipping", label: "Free shipping over", type: "number", publicRead: true, defaultValue: "0", help: "In cents. 0 disables free shipping." },
  { key: "checkout.deliveryEstimate", group: "checkout", section: "Shipping", label: "Delivery estimate", type: "text", publicRead: true, placeholder: "6-8 weeks", maxLength: 120 },
  { key: "checkout.orderPrefix", group: "checkout", section: "Orders", label: "Order number prefix", type: "text", defaultValue: "SC-", maxLength: 12 },
  { key: "checkout.codEnabled", group: "checkout", section: "Orders", label: "Allow cash on delivery", type: "toggle", publicRead: true, defaultValue: "false" },
  { key: "checkout.termsUrl", group: "checkout", section: "Orders", label: "Terms & conditions URL", type: "url", publicRead: true },

  // ------------------------------------------------------------ marketing --
  { key: "meta.enabled", group: "marketing", section: "Meta - Facebook & Instagram", label: "Enable Meta tracking", type: "toggle", publicRead: true, defaultValue: "false" },
  { key: "meta.pixelId", group: "marketing", section: "Meta - Facebook & Instagram", label: "Pixel ID", type: "text", publicRead: true, pattern: ID_DIGITS, patternHint: "A Meta Pixel ID is 6-32 digits.", placeholder: "1234567890123456", help: "Events Manager -> Data sources -> your pixel. It is the number shown under the pixel name." },
  { key: "meta.capiToken", group: "marketing", section: "Meta - Facebook & Instagram", label: "Conversions API token", type: "secret", secret: true, maxLength: 512, help: "Events Manager -> Settings -> Conversions API -> Generate access token. Stored server-side only and never sent to a browser." },
  { key: "meta.testEventCode", group: "marketing", section: "Meta - Facebook & Instagram", label: "Test event code", type: "text", maxLength: 40, help: "Optional. Set it while verifying in Test Events, then clear it." },

  { key: "tiktok.enabled", group: "marketing", section: "TikTok", label: "Enable TikTok tracking", type: "toggle", publicRead: true, defaultValue: "false" },
  { key: "tiktok.pixelCode", group: "marketing", section: "TikTok", label: "Pixel code", type: "text", publicRead: true, pattern: ALNUM_ID, patternHint: "A TikTok pixel code is 4-64 letters, digits, - or _.", placeholder: "C1A2B3C4D5E6F7G8H9", help: "TikTok Ads Manager -> Assets -> Events -> Web Events -> your pixel ID." },
  { key: "tiktok.accessToken", group: "marketing", section: "TikTok", label: "Events API token", type: "secret", secret: true, maxLength: 512, help: "Web Events -> Settings -> Events API -> Generate access token. Stored server-side only." },
  { key: "tiktok.testEventCode", group: "marketing", section: "TikTok", label: "Test event code", type: "text", maxLength: 40 },

  { key: "google.enabled", group: "marketing", section: "Google", label: "Enable Google tracking", type: "toggle", publicRead: true, defaultValue: "false" },
  { key: "google.ga4MeasurementId", group: "marketing", section: "Google", label: "GA4 measurement ID", type: "text", publicRead: true, pattern: "^G-[A-Z0-9]{4,20}$", patternHint: "A GA4 measurement ID starts with G-.", placeholder: "G-XXXXXXXXXX" },
  { key: "google.adsConversionId", group: "marketing", section: "Google", label: "Google Ads conversion ID", type: "text", publicRead: true, pattern: "^AW-[0-9]{6,20}$", patternHint: "A Google Ads conversion ID starts with AW-.", placeholder: "AW-123456789" },
  { key: "google.adsPurchaseLabel", group: "marketing", section: "Google", label: "Purchase conversion label", type: "text", publicRead: true, maxLength: 64 },

  { key: "snapchat.enabled", group: "marketing", section: "Other platforms", label: "Enable Snapchat Pixel", type: "toggle", publicRead: true, defaultValue: "false" },
  { key: "snapchat.pixelId", group: "marketing", section: "Other platforms", label: "Snapchat Pixel ID", type: "text", publicRead: true, maxLength: 64 },
  { key: "pinterest.enabled", group: "marketing", section: "Other platforms", label: "Enable Pinterest Tag", type: "toggle", publicRead: true, defaultValue: "false" },
  { key: "pinterest.tagId", group: "marketing", section: "Other platforms", label: "Pinterest Tag ID", type: "text", publicRead: true, pattern: ID_DIGITS, patternHint: "A Pinterest tag ID is 6-32 digits." },

  {
    key: "consent.mode", group: "marketing", section: "Consent & privacy", label: "Consent handling", type: "select", publicRead: true, defaultValue: "banner",
    options: [
      { value: "off", label: "Track every visitor immediately" },
      { value: "banner", label: "Ask first, remember the answer (recommended)" },
      { value: "strict", label: "Track nobody until they opt in, ask again each visit" },
    ],
    help: "Ad platform pixels only fire for visitors this rule allows.",
  },
  { key: "consent.bannerText", group: "marketing", section: "Consent & privacy", label: "Consent banner text", type: "textarea", publicRead: true, maxLength: 500, defaultValue: "We use cookies to measure how our campaigns perform. You can decline and still use the whole store." },
  { key: "consent.privacyUrl", group: "marketing", section: "Consent & privacy", label: "Privacy policy URL", type: "url", publicRead: true },

  // ------------------------------------------------------------- advanced --
  { key: "advanced.maintenanceMode", group: "advanced", section: "Availability", label: "Maintenance mode", type: "toggle", publicRead: true, defaultValue: "false", help: "Shows a holding page to shoppers. Admins keep full access." },
  { key: "advanced.maintenanceMessage", group: "advanced", section: "Availability", label: "Maintenance message", type: "textarea", publicRead: true, maxLength: 500 },
  { key: "advanced.googleSiteVerification", group: "advanced", section: "Site verification", label: "Google verification token", type: "text", publicRead: true, maxLength: 200, help: "Only the content value from Google's meta tag, not the whole tag." },
  { key: "advanced.metaDomainVerification", group: "advanced", section: "Site verification", label: "Meta domain verification token", type: "text", publicRead: true, maxLength: 200 },
  { key: "advanced.tiktokVerification", group: "advanced", section: "Site verification", label: "TikTok verification token", type: "text", publicRead: true, maxLength: 200 },
];

const FIELD_INDEX = new Map(SETTING_FIELDS.map(field => [field.key, field]));

export function getSettingField(key: string): SettingField | undefined {
  return FIELD_INDEX.get(key);
}

export function fieldsInGroup(group: SettingGroupId): SettingField[] {
  return SETTING_FIELDS.filter(field => field.group === group);
}

/** Section headings for a group, in the order the fields declare them. */
export function sectionsInGroup(group: SettingGroupId): string[] {
  const seen: string[] = [];
  for (const field of fieldsInGroup(group)) {
    if (!seen.includes(field.section)) seen.push(field.section);
  }
  return seen;
}

export const PUBLIC_SETTING_KEYS: ReadonlyArray<string> = SETTING_FIELDS.filter(
  field => field.publicRead && !field.secret,
).map(field => field.key);

export function defaultSettings(): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of SETTING_FIELDS) {
    if (field.defaultValue !== undefined) values[field.key] = field.defaultValue;
  }
  return values;
}

/**
 * Validates one value against its field definition.
 * Returns an error message, or null when the value is acceptable.
 */
export function validateSetting(key: string, value: string): string | null {
  const field = FIELD_INDEX.get(key);
  if (!field) return `Unknown setting "${key}".`;
  if (value === "") return null; // clearing a setting is always allowed

  if (field.maxLength && value.length > field.maxLength) {
    return `${field.label} must be ${field.maxLength} characters or fewer.`;
  }
  if (field.type === "toggle" && value !== "true" && value !== "false") {
    return `${field.label} must be true or false.`;
  }
  if (field.type === "number" && !/^-?\d+(\.\d+)?$/.test(value)) {
    return `${field.label} must be a number.`;
  }
  if (field.type === "select" && !field.options?.some(option => option.value === value)) {
    return `${field.label} must be one of the listed options.`;
  }
  if (field.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    return `${field.label} must be a valid email address.`;
  }
  if (field.type === "url" && !/^https?:\/\/\S+$/i.test(value)) {
    return `${field.label} must be a URL starting with http:// or https://.`;
  }
  if (field.pattern && !new RegExp(field.pattern).test(value)) {
    return field.patternHint ?? `${field.label} is not in the expected format.`;
  }
  return null;
}
