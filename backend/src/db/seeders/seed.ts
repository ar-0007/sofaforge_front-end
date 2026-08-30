import "../../core/loadEnv";
import { eq } from "drizzle-orm";
import { getDb } from "../index";
import { series, products } from "../schema";
import {
  fallbackProducts,
  fallbackSeries,
} from "../../modules/commerce/catalog.fallback";

/**
 * Seeds the starter catalog.
 *
 * The storefront has a hardcoded fallback catalog it serves when the database
 * is empty, which is why the shop looks populated on a fresh install while the
 * admin dashboard shows zero. Seeding from that same source makes both views
 * agree and gives the dashboard real rows to manage.
 */
async function seed() {
  const db = await getDb();
  if (!db) {
    console.error("[seed] Database not available. Is DATABASE_URL set and MySQL running?");
    process.exit(1);
  }

  console.log("[seed] Seeding series...");
  for (const item of fallbackSeries) {
    await db
      .insert(series)
      .values({
        name: item.name,
        slug: item.slug,
        description: item.description,
        imageUrl: item.imageUrl,
        isVisible: item.isVisible,
        sortOrder: item.sortOrder,
      })
      .onDuplicateKeyUpdate({
        set: {
          description: item.description,
          imageUrl: item.imageUrl,
          isVisible: item.isVisible,
          sortOrder: item.sortOrder,
        },
      });
  }

  // Re-read so products link to the real auto-increment ids, not the
  // fallback's synthetic ones.
  const storedSeries = await db.select().from(series);
  const seriesIdBySlug = new Map(storedSeries.map(row => [row.slug, row.id]));

  console.log("[seed] Seeding products...");
  let seeded = 0;
  for (const product of fallbackProducts) {
    const sourceSeries = fallbackSeries.find(s => s.id === product.seriesId);
    const seriesId = sourceSeries ? seriesIdBySlug.get(sourceSeries.slug) : undefined;

    if (!seriesId) {
      console.warn(`[seed] Skipping "${product.name}" — its series is missing.`);
      continue;
    }

    await db
      .insert(products)
      .values({
        seriesId,
        name: product.name,
        slug: product.slug,
        description: product.description,
        startingPrice: product.startingPrice,
        imageUrl: product.imageUrl,
        gallery: product.gallery,
        isCustom: product.isCustom,
        isVisible: product.isVisible,
        isFeatured: product.isFeatured,
        sortOrder: product.sortOrder,
      })
      .onDuplicateKeyUpdate({
        set: {
          seriesId,
          name: product.name,
          description: product.description,
          startingPrice: product.startingPrice,
          imageUrl: product.imageUrl,
          gallery: product.gallery,
          isFeatured: product.isFeatured,
          sortOrder: product.sortOrder,
        },
      });
    seeded += 1;
  }

  const [{ count: seriesCount }] = [{ count: storedSeries.length }];
  const storedProducts = await db.select({ id: products.id }).from(products);

  console.log(`[seed] Done — ${seriesCount} series, ${storedProducts.length} products (${seeded} upserted).`);
  process.exit(0);
}

seed().catch(error => {
  console.error("[seed] Failed:", error);
  process.exit(1);
});
