/**
 * The Custom Studio, as data.
 *
 * The storefront's four-step configurator — shape, fabric, colour, scale — used
 * to be four hard-coded arrays inside the page component, which meant the only
 * way to add a fabric or reprice a size was to change the code and redeploy.
 * These are the same four steps, moved out so the owner can edit them in the
 * admin instead.
 *
 * They are stored as *global* option groups: rows in `productOptionGroups` with
 * a null `productId`, the same table the per-product configurator uses. One
 * builder, one shape of data, one place a price can come from.
 *
 * The values below are exactly what the page shipped with, so seeding them
 * changes nothing a shopper can see — it only hands the controls over.
 */

export type StudioStepChoice = {
  label: string;
  value: string;
  /** Minor units. On the first step this is the base price of the piece. */
  priceDelta: number;
  description?: string;
  swatchColor?: string;
  imageUrl?: string;
  isDefault?: boolean;
};

export type StudioStepSeed = {
  label: string;
  slug: string;
  helpText: string;
  /**
   * How the storefront draws the choices: `image` for photographed silhouettes,
   * `swatch` for a colour circle, `radio` for a titled card.
   */
  displayType: "radio" | "swatch" | "image";
  /** The line above the step's heading — "Step 01 · Find your form". */
  eyebrow: string;
  /** The step's own heading on the storefront. */
  heading: string;
  choices: StudioStepChoice[];
};

const PHOTO = "https://images.unsplash.com/";

/**
 * Every price here is a delta, including the shape's. The total a shopper sees
 * is the sum of what they picked, which is why the shape carries the base and
 * the rest carry upgrades — the arithmetic stays the same no matter how many
 * steps the owner adds later.
 */
export const STUDIO_STEPS: StudioStepSeed[] = [
  {
    label: "Shape",
    slug: "studio-shape",
    helpText: "The silhouette. This choice carries the base price of the piece.",
    displayType: "image",
    eyebrow: "Step 01 · Find your form",
    heading: "Start with a shape.",
    choices: [
      {
        label: "Sectional with Chaise",
        value: "sectional-with-chaise",
        priceDelta: 440000,
        description: "For slow Sundays",
        imageUrl: `${PHOTO}photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=84`,
        isDefault: true,
      },
      {
        label: "U-Shape Sofa",
        value: "u-shape-sofa",
        priceDelta: 580000,
        description: "For gathering",
        imageUrl: `${PHOTO}photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=900&q=84`,
      },
      {
        label: "Lucy Sectional",
        value: "lucy-sectional",
        priceDelta: 690000,
        description: "For open plans",
        imageUrl: `${PHOTO}photo-1567016432779-094069958ea5?auto=format&fit=crop&w=900&q=84`,
      },
      {
        label: "Modular 3-Piece",
        value: "modular-3-piece",
        priceDelta: 490000,
        description: "For changing rooms",
        imageUrl: `${PHOTO}photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=84`,
      },
    ],
  },
  {
    label: "Fabric",
    slug: "studio-fabric",
    helpText: "Handfeel. Priced as an upgrade on top of the shape.",
    displayType: "swatch",
    eyebrow: "Step 02 · Touch and texture",
    heading: "Choose your handfeel.",
    choices: [
      {
        label: "Belgian Linen",
        value: "belgian-linen",
        priceDelta: 0,
        description: "Soft · natural",
        swatchColor: "#D6C5AD",
        isDefault: true,
      },
      {
        label: "Performance Velvet",
        value: "performance-velvet",
        priceDelta: 35000,
        description: "Deep · luminous",
        swatchColor: "#243B37",
      },
      {
        label: "Bouclé",
        value: "boucle",
        priceDelta: 50000,
        description: "Textured · warm",
        swatchColor: "#E7DED0",
      },
      {
        label: "Washed Cotton",
        value: "washed-cotton",
        priceDelta: 0,
        description: "Relaxed · easy",
        swatchColor: "#8C847A",
      },
    ],
  },
  {
    label: "Colour",
    slug: "studio-colour",
    helpText: "The finish. No upgrade on any colour, as shipped.",
    displayType: "swatch",
    eyebrow: "Step 03 · A little character",
    heading: "Bring in the colour.",
    choices: [
      { label: "Natural Ivory", value: "natural-ivory", priceDelta: 0, swatchColor: "#E6DED2", isDefault: true },
      { label: "Charcoal Grey", value: "charcoal-grey", priceDelta: 0, swatchColor: "#484948" },
      { label: "Warm Taupe", value: "warm-taupe", priceDelta: 0, swatchColor: "#9D8A77" },
      { label: "Forest Green", value: "forest-green", priceDelta: 0, swatchColor: "#304B42" },
    ],
  },
  {
    label: "Scale",
    slug: "studio-scale",
    helpText: "Overall width. Priced as an upgrade on top of the shape.",
    displayType: "radio",
    eyebrow: "Step 04 · Live generously",
    heading: "Set the scale.",
    choices: [
      {
        label: 'Standard (88")',
        value: "standard-88",
        priceDelta: 0,
        description: "The everyday proportion",
        isDefault: true,
      },
      {
        label: 'Extended (96")',
        value: "extended-96",
        priceDelta: 40000,
        description: "A little more room",
      },
      {
        label: 'Grand (108")',
        value: "grand-108",
        priceDelta: 80000,
        description: "Make space for everyone",
      },
    ],
  },
];

/**
 * The storefront looks these up by slug for the copy above each step. A step
 * the owner adds later has no entry and simply falls back to its own label,
 * which is the honest default — invented copy for a step nobody wrote copy for
 * would be worse than none.
 */
export const STUDIO_STEP_COPY: Record<string, { eyebrow: string; heading: string }> = Object.fromEntries(
  STUDIO_STEPS.map((step) => [
    step.slug,
    { eyebrow: step.eyebrow, heading: step.heading },
  ]),
);

/** Where a step with no authored copy gets its line, by position. */
export function studioStepCopy(slug: string, label: string, index: number) {
  const authored = STUDIO_STEP_COPY[slug];
  if (authored) return authored;
  return {
    eyebrow: `Step ${String(index + 1).padStart(2, "0")}`,
    heading: `Choose your ${label.toLowerCase()}.`,
  };
}
