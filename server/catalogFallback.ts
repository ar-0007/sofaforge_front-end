import type { Product, Series } from "../drizzle/schema";

const fallbackCreatedAt = new Date("2026-01-01T00:00:00.000Z");

export const fallbackSeries: Series[] = [
  { id: 1, name: "Bobby", slug: "bobby", description: "Modular comfort designed for modern living.", imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80", isVisible: "true", sortOrder: 1, createdAt: fallbackCreatedAt, updatedAt: fallbackCreatedAt },
  { id: 2, name: "Diane", slug: "diane", description: "Timeless elegance with sleek tailored lines.", imageUrl: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80", isVisible: "true", sortOrder: 2, createdAt: fallbackCreatedAt, updatedAt: fallbackCreatedAt },
  { id: 3, name: "Isla", slug: "isla", description: "Generous proportions and effortless sophistication.", imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80", isVisible: "true", sortOrder: 3, createdAt: fallbackCreatedAt, updatedAt: fallbackCreatedAt },
  { id: 4, name: "Nimbus", slug: "nimbus", description: "Cloud-like cushioning for ultimate relaxation.", imageUrl: "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1200&q=80", isVisible: "true", sortOrder: 4, createdAt: fallbackCreatedAt, updatedAt: fallbackCreatedAt },
  { id: 5, name: "Paloma", slug: "paloma", description: "Statement architectural silhouettes.", imageUrl: "https://images.unsplash.com/photo-1550254417-ead6e92f5da7?auto=format&fit=crop&w=1200&q=80", isVisible: "true", sortOrder: 5, createdAt: fallbackCreatedAt, updatedAt: fallbackCreatedAt },
  { id: 6, name: "Stanton", slug: "stanton", description: "Classic craftsmanship with deep seating comfort.", imageUrl: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80", isVisible: "true", sortOrder: 6, createdAt: fallbackCreatedAt, updatedAt: fallbackCreatedAt },
  { id: 7, name: "Stanton II", slug: "stanton-ii", description: "Refined evolution of our most beloved silhouette.", imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80", isVisible: "true", sortOrder: 7, createdAt: fallbackCreatedAt, updatedAt: fallbackCreatedAt },
];

export const fallbackProducts: Product[] = fallbackSeries.map((item, index) => ({
  id: index + 1,
  seriesId: item.id,
  name: `${item.name} Sofa`,
  slug: index === 0 ? "bobby-armless-chair-custom" : `${item.slug}-sofa-custom`,
  description: item.description,
  startingPrice: 389000 + index * 25000,
  imageUrl: item.imageUrl,
  gallery: JSON.stringify([item.imageUrl, "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1600&q=88", "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1600&q=88"]),
  isCustom: "true",
  isVisible: "true",
  isFeatured: index < 3 ? "true" : "false",
  sortOrder: index + 1,
  createdAt: fallbackCreatedAt,
  updatedAt: fallbackCreatedAt,
}));

export function fallbackProductsForSeries(seriesId?: number): Product[] {
  return seriesId ? fallbackProducts.filter((product) => product.seriesId === seriesId) : fallbackProducts;
}

export function findFallbackProduct(slug: string): Product | null {
  return fallbackProducts.find((product) => product.slug === slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug || slug.includes(product.slug)) ?? fallbackProducts[0] ?? null;
}
