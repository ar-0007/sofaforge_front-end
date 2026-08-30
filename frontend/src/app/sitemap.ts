import type { MetadataRoute } from "next";
import { safeQuery, serverApi } from "@/lib/api/server";
import { SITE } from "@/lib/seo/site";

// Regenerate hourly so new products appear without a redeploy.
export const revalidate = 3600;

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/shop", priority: 0.9, changeFrequency: "daily" },
  { path: "/custom-studio", priority: 0.9, changeFrequency: "weekly" },
  { path: "/lookbook", priority: 0.7, changeFrequency: "weekly" },
  { path: "/our-story", priority: 0.6, changeFrequency: "monthly" },
  { path: "/craftsmanship", priority: 0.6, changeFrequency: "monthly" },
  { path: "/sustainability", priority: 0.5, changeFrequency: "monthly" },
  { path: "/room-planner", priority: 0.5, changeFrequency: "monthly" },
  { path: "/swatches", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
  { path: "/shipping", priority: 0.4, changeFrequency: "yearly" },
  { path: "/care-guide", priority: 0.4, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await safeQuery(
    () => serverApi.commerce.getProducts.query({ seriesId: undefined }),
    [] as Awaited<ReturnType<typeof serverApi.commerce.getProducts.query>>
  );

  return [
    ...STATIC_ROUTES.map(route => ({
      url: `${SITE.url}${route.path}`,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...products.map(product => ({
      url: `${SITE.url}/product/${product.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
