export const storefrontRoutes = ["/", "/shop", "/custom-studio", "/wishlist", "/swatches", "/room-planner"] as const;

export function getSeriesFilterId(location: string): number | undefined {
  const value = new URLSearchParams(location.split("?")[1] || "").get("series");
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getProductGallery(primaryImage?: string): string[] {
  const fallbackImages = [
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1600&q=88",
    "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1600&q=88",
    "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1600&q=88",
  ];
  return Array.from(new Set(primaryImage ? [primaryImage, ...fallbackImages] : fallbackImages));
}

export function calculateCustomTotal(shapePrice: number, fabricAdd: number, sizeAdd: number): number {
  return Math.max(0, shapePrice) + Math.max(0, fabricAdd) + Math.max(0, sizeAdd);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString()}`;
}

export const catalogQueryOptions = {
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
} as const;
