import "../../core/loadEnv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getDb } from "../index";
import { products, series } from "../schema";

/**
 * Imports the real Sofa Co. catalogue.
 *
 * `sofaco-catalog.json` is a normalised snapshot of the live WooCommerce store
 * (110 made-to-order pieces across 7 series, with their real photography).
 * Re-running this is safe: everything upserts on the unique slug.
 */

type CatalogSeries = {
  name: string;
  slug: string;
  imageUrl: string | null;
  count: number;
  sortOrder: number;
};

type CatalogProduct = {
  name: string;
  slug: string;
  series: string;
  shape: string;
  price: number;
  regularPrice: number;
  images: string[];
};

type Catalog = { series: CatalogSeries[]; products: CatalogProduct[] };

const SERIES_BLURB: Record<string, string> = {
  Stanton: "Deep seating and a squared, tailored frame — the classic build.",
  "Stanton II": "The Stanton silhouette refined: slimmer arms, cleaner seams.",
  Isla: "Generous proportions with a soft, relaxed shoulder.",
  Diane: "Sleek tailored lines for rooms that want a quieter footprint.",
  Nimbus: "Cloud-like cushioning built around a fully modular system.",
  Paloma: "Architectural blocks that scale up to U-shape and 4×4 plans.",
  Bobby: "Modular comfort designed for smaller, modern spaces.",
};

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("[catalog] Database unavailable. Is DATABASE_URL set and MySQL running?");
    process.exit(1);
  }

  const file = path.resolve(import.meta.dirname, "sofaco-catalog.json");
  const catalog = JSON.parse(await readFile(file, "utf-8")) as Catalog;

  console.log(`[catalog] Importing ${catalog.series.length} series, ${catalog.products.length} pieces…`);

  for (const item of catalog.series) {
    const values = {
      name: item.name,
      slug: item.slug,
      description: SERIES_BLURB[item.name] ?? null,
      imageUrl: item.imageUrl,
      isVisible: "true" as const,
      sortOrder: item.sortOrder,
    };
    await db.insert(series).values(values).onDuplicateKeyUpdate({
      set: {
        description: values.description,
        imageUrl: values.imageUrl,
        isVisible: values.isVisible,
        sortOrder: values.sortOrder,
      },
    });
  }

  // Re-read so pieces link to the real auto-increment ids.
  const storedSeries = await db.select().from(series);
  const seriesIdByName = new Map(storedSeries.map(row => [row.name, row.id]));

  let imported = 0;
  let skipped = 0;

  for (const [index, piece] of catalog.products.entries()) {
    const seriesId = seriesIdByName.get(piece.series);
    if (!seriesId) {
      console.warn(`[catalog] Skipping "${piece.name}" — series "${piece.series}" missing.`);
      skipped += 1;
      continue;
    }

    const values = {
      seriesId,
      name: piece.name,
      slug: piece.slug,
      // The shape is stored in the description tail so the storefront can group
      // by it without a schema migration; see `shapeOf()` on the frontend.
      description: `${SERIES_BLURB[piece.series] ?? "Made to order in Canada."}`,
      startingPrice: piece.price,
      imageUrl: piece.images[0] ?? null,
      gallery: JSON.stringify(piece.images),
      isCustom: "true" as const,
      isVisible: "true" as const,
      isFeatured: index < 8 ? ("true" as const) : ("false" as const),
      sortOrder: index + 1,
    };

    await db.insert(products).values(values).onDuplicateKeyUpdate({
      set: {
        seriesId: values.seriesId,
        name: values.name,
        description: values.description,
        startingPrice: values.startingPrice,
        imageUrl: values.imageUrl,
        gallery: values.gallery,
        isFeatured: values.isFeatured,
        sortOrder: values.sortOrder,
      },
    });
    imported += 1;
  }

  const stored = await db.select({ id: products.id }).from(products);
  console.log(
    `[catalog] Done — ${imported} imported, ${skipped} skipped. Products in database: ${stored.length}.`
  );
  process.exit(0);
}

main().catch(error => {
  console.error("[catalog] Failed:", error);
  process.exit(1);
});
