import { SITE } from "./site";

type ProductLike = {
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  startingPrice: number;
};

/** Prices are stored in cents. */
const toPrice = (cents: number) => (cents / 100).toFixed(2);

export function productJsonLd(product: ProductLike) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? SITE.description,
    image: product.imageUrl ? [product.imageUrl] : undefined,
    brand: { "@type": "Brand", name: SITE.name },
    url: `${SITE.url}/product/${product.slug}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "CAD",
      price: toPrice(product.startingPrice),
      availability: "https://schema.org/InStock",
      url: `${SITE.url}/product/${product.slug}`,
      seller: { "@type": "Organization", name: SITE.name },
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FurnitureStore",
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.region,
      addressCountry: SITE.address.country,
    },
  };
}
