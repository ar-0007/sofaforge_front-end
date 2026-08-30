/** Single source of truth for site-wide SEO values. */
export const SITE = {
  name: "Sofa Co.",
  tagline: "The Art of Living.",
  description:
    "Sofa Co. — handcrafted Canadian furniture for The Art of Living. Made-to-order sofas, chairs and sectionals, built in Toronto.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_CA",
  address: {
    street: "1248 Queen Street West",
    city: "Toronto",
    region: "ON",
    country: "CA",
  },
} as const;
