import "../../core/loadEnv";
import { eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "../index";
import { productOptionChoices, productOptionGroups } from "../schema";

/**
 * Imports the real configurator from the live WooCommerce store.
 *
 * The catalogue snapshot in `sofaco-catalog.json` captured names, photos and
 * the base price, but not the questions a shopper actually answers — depth,
 * material, colour, cushion and seat style. Those are rendered by the store's
 * add-ons template and never appear in the WooCommerce Store API
 * (`attributes: []`, `has_options: false`), so they are read from the product
 * page markup, which carries them as data attributes.
 *
 * Every piece in the range offers the identical set, so the groups are imported
 * once with `productId: null` — the "reusable across every product" case that
 * `readOptionsForProduct` already handles — rather than copied 110 times.
 *
 * Re-running is safe: the global groups it owns are removed and rebuilt.
 *
 *   pnpm --filter @sofa/backend db:options
 */

const SOURCE_URL = process.env.CATALOG_SOURCE_URL ?? "https://thesofaco.ca";
/**
 * The piece read for the option set.
 *
 * Every piece offers the identical questions, but only 9 of the 110 product
 * pages actually carry the cushion and seat photographs — the rest render those
 * choices as bare text. This one has them, so the imported options are the
 * fullest version of the set rather than the most common one.
 */
const SAMPLE_SLUG = process.env.CATALOG_SAMPLE_SLUG ?? "stanton-xl-sectional-custom";

/** Read only to borrow a photo the sample was missing, matched on label. */
const IMAGE_DONORS = ["stanton-sofa-custom", "stanton-loveseat-custom", "bobby-modular-loveseat-custom"];

/** Slugs this importer owns. Anything else in the table is left alone. */
const OWNED_SLUGS = ["depth", "material", "colour", "cushion", "seat"];

type ParsedChoice = {
  label: string;
  value: string;
  /** Minor units, already converted from the store's dollar amounts. */
  priceDelta: number;
  imageUrl?: string | null;
  swatchColor?: string | null;
  /** Set on colours: the material label they belong to. */
  parentLabel?: string;
};

type ParsedGroup = {
  slug: string;
  label: string;
  displayType: "radio" | "swatch" | "image";
  helpText?: string;
  sortOrder: number;
  choices: ParsedChoice[];
};

function decodeEntities(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#0?34;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110);
  return slug || "option";
}

/**
 * Store prices are decimal dollars (`data-price="59999.9"`); the database keeps
 * minor units. Rounding here rather than at read time keeps a half-cent from
 * compounding across a configuration.
 */
function toMinorUnits(amount: string): number {
  const value = Number.parseFloat(amount);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

/** Pulls one `<div class="lp-addon-section">` block per configurator question. */
function splitSections(html: string): string[] {
  const parts = html.split('<div class="lp-addon-section">');
  return parts.slice(1);
}

function readSectionLabel(section: string): string {
  const match = section.match(/class="lp-lbl"[^>]*>([\s\S]*?)<\/span>\s*<\/div>/);
  if (!match) return "";
  // The label holds a nested <span class="lp-req">*</span> for required groups.
  // Strip the tag and the marker it carried, so the stored label is the plain
  // question — required-ness is already its own column.
  const text = decodeEntities(match[1].replace(/<[^>]*>/g, "")).trim();
  return text.replace(/\s*\*+$/, "").trim();
}

function readContainerId(section: string): string | null {
  const match = section.match(/id="chips-([a-z]+)"/);
  return match ? match[1] : null;
}

/**
 * Chip and image-chip buttons.
 *
 * Parsed one button at a time rather than by scanning for attributes across the
 * whole section, because an image chip carries its photo in a nested `<img>`
 * that has to stay associated with the right choice.
 */
function readButtons(section: string): Array<{ label: string; price: string; imageUrl: string | null }> {
  return section
    .split("<button")
    .slice(1)
    .map(button => {
      const label = button.match(/data-label="([^"]*)"/);
      const price = button.match(/data-price="([^"]*)"/);
      if (!label || !price) return null;
      const image = button.match(/<img[^>]*\ssrc="([^"]*)"/);
      return {
        label: decodeEntities(label[1]).trim(),
        price: price[1],
        imageUrl: image ? decodeEntities(image[1]) : null,
      };
    })
    .filter((button): button is { label: string; price: string; imageUrl: string | null } => button !== null);
}

/** Materials carry their whole colour range as a JSON data attribute. */
function readMaterials(section: string): Array<{ label: string; price: string; colours: ParsedChoice[] }> {
  const materials: Array<{ label: string; price: string; colours: ParsedChoice[] }> = [];
  const pattern = /data-price="([^"]*)"\s+data-label="([^"]*)"\s+data-colours="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(section)) !== null) {
    const label = decodeEntities(match[2]).trim();
    let colours: ParsedChoice[] = [];
    try {
      const raw = JSON.parse(decodeEntities(match[3])) as Array<{
        label?: string;
        hex?: string;
        price?: number;
        image_url?: string;
      }>;
      colours = raw
        .filter(entry => entry.label)
        .map(entry => ({
          label: entry.label!.trim(),
          value: slugify(entry.label!),
          priceDelta: Math.round((entry.price ?? 0) * 100),
          imageUrl: entry.image_url ?? null,
          // The store sends a placeholder hex for every fabric; the swatch photo
          // is the real thing, so only keep a colour that says something.
          swatchColor: entry.hex && entry.hex.toUpperCase() !== "#CCCCCC" ? entry.hex : null,
          parentLabel: label,
        }));
    } catch {
      console.warn(`[options] Could not read the colour range for "${label}".`);
    }
    materials.push({ label, price: match[1], colours });
  }

  return materials;
}

function parse(html: string): ParsedGroup[] {
  const groups: ParsedGroup[] = [];
  let colours: ParsedChoice[] = [];

  for (const section of splitSections(html)) {
    const id = readContainerId(section);
    if (!id) continue;
    const label = readSectionLabel(section) || id;

    if (id === "material") {
      const materials = readMaterials(section);
      groups.push({
        slug: "material",
        label,
        displayType: "swatch",
        sortOrder: 2,
        choices: materials.map(material => ({
          label: material.label,
          value: slugify(material.label),
          priceDelta: toMinorUnits(material.price),
        })),
      });
      colours = materials.flatMap(material => material.colours);
      continue;
    }

    const buttons = readButtons(section);
    if (buttons.length === 0) continue;

    const displayType = id === "depth" ? "radio" : "image";
    const sortOrder = id === "depth" ? 1 : id === "cushion" ? 4 : 5;

    groups.push({
      slug: id,
      label,
      displayType,
      sortOrder,
      choices: buttons.map(button => ({
        label: button.label,
        value: slugify(button.label),
        priceDelta: toMinorUnits(button.price),
        imageUrl: button.imageUrl,
      })),
    });
  }

  if (colours.length > 0) {
    groups.push({
      slug: "colour",
      label: "Select Colour",
      displayType: "swatch",
      helpText: "Shown for the material selected above.",
      sortOrder: 3,
      choices: colours,
    });
  }

  return groups.sort((a, b) => a.sortOrder - b.sortOrder);
}

async function fetchPage(slug: string): Promise<string | null> {
  try {
    const response = await fetch(`${SOURCE_URL}/product/${slug}/`, {
      headers: { "User-Agent": "Mozilla/5.0 (SofaCo catalogue import)" },
    });
    return response.ok ? await response.text() : null;
  } catch {
    // The store drops connections under repeated requests; a donor that fails
    // is not worth failing the import over.
    return null;
  }
}

/**
 * Borrows any cushion or seat photograph the sample page did not carry.
 *
 * Only a handful of the product pages render these choices with pictures, and
 * which ones is not something the owner controls. Labels are identical across
 * the range, so a photo found on any piece is the right photo for the shared
 * choice of the same name.
 */
async function fillMissingImages(groups: ParsedGroup[]): Promise<number> {
  const missing = groups.flatMap(group =>
    group.displayType === "image" ? group.choices.filter(choice => !choice.imageUrl) : []
  );
  if (missing.length === 0) return 0;

  console.log(`[options] ${missing.length} image choice(s) had no photo; checking other pieces.`);
  let filled = 0;

  for (const slug of IMAGE_DONORS) {
    if (missing.every(choice => choice.imageUrl)) break;

    const html = await fetchPage(slug);
    if (!html) continue;

    const byLabel = new Map<string, string>();
    for (const section of splitSections(html)) {
      for (const button of readButtons(section)) {
        if (button.imageUrl) byLabel.set(button.label, button.imageUrl);
      }
    }

    for (const choice of missing) {
      if (choice.imageUrl) continue;
      const found = byLabel.get(choice.label);
      if (found) {
        choice.imageUrl = found;
        filled += 1;
      }
    }
  }

  const stillMissing = missing.filter(choice => !choice.imageUrl);
  if (stillMissing.length > 0) {
    console.warn(
      `[options] No photo found for: ${stillMissing.map(choice => choice.label).join(", ")}. ` +
        "These render as labelled tiles."
    );
  }
  return filled;
}

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("[options] Database unavailable. Is DATABASE_URL set and MySQL running?");
    process.exit(1);
  }

  const url = `${SOURCE_URL}/product/${SAMPLE_SLUG}/`;
  console.log(`[options] Reading the configurator from ${url}`);

  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (SofaCo catalogue import)" } });
  if (!response.ok) {
    console.error(`[options] Source returned HTTP ${response.status}.`);
    process.exit(1);
  }

  const parsed = parse(await response.text());
  if (parsed.length === 0) {
    console.error("[options] No configurator sections found — the store's markup may have changed.");
    process.exit(1);
  }

  const borrowed = await fillMissingImages(parsed);
  if (borrowed > 0) console.log(`[options] Borrowed ${borrowed} photo(s) from other pieces.`);

  // Rebuild only the global groups this importer owns, so anything the owner
  // added by hand in the admin survives a re-run.
  const existing = await db
    .select({ id: productOptionGroups.id, slug: productOptionGroups.slug })
    .from(productOptionGroups)
    .where(isNull(productOptionGroups.productId));

  const stale = existing.filter(group => OWNED_SLUGS.includes(group.slug)).map(group => group.id);
  if (stale.length > 0) {
    await db.delete(productOptionChoices).where(inArray(productOptionChoices.groupId, stale));
    await db.delete(productOptionGroups).where(inArray(productOptionGroups.id, stale));
    console.log(`[options] Replacing ${stale.length} previously imported group(s).`);
  }

  // Colours reference the material choice they belong to, so materials have to
  // be written first and their new ids captured.
  const materialIdByLabel = new Map<string, number>();

  for (const group of parsed) {
    const inserted = await db.insert(productOptionGroups).values({
      productId: null,
      label: group.label,
      slug: group.slug,
      helpText: group.helpText ?? null,
      displayType: group.displayType,
      isRequired: "true",
      allowMultiple: "false",
      isVisible: "true",
      sortOrder: group.sortOrder,
    });
    const groupId = Number((inserted as unknown as Array<{ insertId: number }>)[0].insertId);

    for (const [index, choice] of group.choices.entries()) {
      const parentChoiceId = choice.parentLabel ? materialIdByLabel.get(choice.parentLabel) ?? null : null;

      const row = await db.insert(productOptionChoices).values({
        groupId,
        parentChoiceId,
        label: choice.label,
        value: choice.value,
        priceDelta: choice.priceDelta,
        imageUrl: choice.imageUrl ?? null,
        swatchColor: choice.swatchColor ?? null,
        // The first answer in each group is what the page shows before the
        // shopper touches anything, so the price on screen is never a blank.
        isDefault: index === 0 ? "true" : "false",
        isVisible: "true",
        sortOrder: index,
      });

      if (group.slug === "material") {
        materialIdByLabel.set(choice.label, Number((row as unknown as Array<{ insertId: number }>)[0].insertId));
      }
    }

    const priced = group.choices.filter(choice => choice.priceDelta !== 0).length;
    console.log(
      `[options] ${group.label} — ${group.choices.length} choice(s)` +
        (priced > 0 ? `, ${priced} with a price change` : "")
    );
  }

  console.log(`[options] Done — ${parsed.length} groups imported.`);
  process.exit(0);
}

main().catch(error => {
  console.error("[options] Failed:", error);
  process.exit(1);
});
