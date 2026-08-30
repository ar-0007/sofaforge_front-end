/**
 * Storefront copy and taxonomy for Sofa Co.
 *
 * The catalogue is 110 made-to-order pieces across 7 series — every one of them
 * a sectional component. Nobody browses 110 SKUs, so the storefront is
 * organised around the question a person actually arrives with: *what shape
 * fits my room?* Series (the look) comes second, configuration third.
 */

const CDN = "https://thesofaco.ca/wp-content/uploads/2026/07";

/* ------------------------------------------------------------------ hero -- */

export const HERO_IMAGE = `${CDN}/STANTON-II-XL-SECTIONAL-CUSTOM-3.png`;

export const HERO = {
  headline: ["Built around", "your room."],
  blurb:
    "Every piece is made to order in Canada. Start with the shape your room needs, then choose the depth, the fabric and the finish.",
  cta: { label: "Build your sectional", href: "/shop" },
  secondary: { label: "See it in your room", href: "#room-visualiser" },
} as const;

/* ----------------------------------------------------- shape finder (#1) -- */

/**
 * The primary way into the catalogue. Counts are real — they match what the
 * import script loaded, so the numbers on the page are not decoration.
 */
export const SHAPES = {
  title: ["Start with the shape", "your room needs."],
  blurb:
    "Six ways to fill a room. Pick the footprint first — every shape is available in all seven series.",
  items: [
    {
      id: "l-shape",
      name: "L-Shape",
      tagline: "Chaise on one end",
      copy: "The everyday sectional. Anchors a wall and gives one person somewhere to stretch out.",
      count: 39,
      image: `${CDN}/STANTON-II-XL-SECTIONAL-CUSTOM-3.png`,
    },
    {
      id: "modular",
      name: "Modular",
      tagline: "Build it piece by piece",
      copy: "Armless seats, corners and one-arm ends you combine yourself. Rearrange it when you move.",
      count: 35,
      image: `${CDN}/STANTON-II-ONE-ARM-LOVESEAT-CUSTOM-2.png`,
    },
    {
      id: "straight",
      name: "Straight",
      tagline: "Sofa & loveseat",
      copy: "A classic front-facing sofa. The simplest fit for a narrow or busy room.",
      count: 19,
      image: `${CDN}/STANTON-II-SOFA-CUSTOM-4.png`,
    },
    {
      id: "ottoman",
      name: "Ottoman",
      tagline: "Footrest & storage",
      copy: "Square or rectangular, with storage inside. Finishes an L-shape or floats on its own.",
      count: 11,
      image: `${CDN}/STANTON-II-RECTANGULAR-STORAGE-OTTOMAN-CUSTOM-1.jpeg`,
    },
    {
      id: "chair",
      name: "Accent Chair",
      tagline: "One good seat",
      copy: "The matching armchair. Pulls the room together without adding bulk.",
      count: 4,
      image: `${CDN}/STANTON-II-CHAIR-CUSTOM-2.png`,
    },
    {
      id: "u-shape",
      name: "U-Shape",
      tagline: "Seats the whole room",
      copy: "Two arms, deep returns. For open-plan rooms where the sofa is the room.",
      count: 2,
      image: `${CDN}/PALOMA-4-X-4-SECTIONAL-CUSTOM-3.png`,
    },
  ],
} as const;

export type ShapeId = (typeof SHAPES.items)[number]["id"];

/**
 * Derives a piece's shape from its name.
 *
 * The shape is not a database column — it is implicit in the naming convention
 * the catalogue already uses ("… Sectional", "… Chaise", "One-Arm …"), so it is
 * computed here rather than migrated in. Order matters: a "Corner Chaise
 * Sectional" is an L-shape, not a modular corner.
 */
export function shapeOf(name: string): ShapeId {
  const n = name.toUpperCase();
  if (n.includes("U-SECTIONAL") || n.includes("U SECTIONAL") || n.includes("4×4") || n.includes("4 X 4"))
    return "u-shape";
  if (n.includes("SECTIONAL") || n.includes("CHAISE")) return "l-shape";
  if (n.includes("OTTOMAN")) return "ottoman";
  if (
    n.includes("ARMLESS") ||
    n.includes("SQUARE CORNER") ||
    n.includes("CORNER CHAIR") ||
    n.includes("ONE-ARM") ||
    n.includes("ONE ARM")
  )
    return "modular";
  if (n.includes("SOFA") || n.includes("LOVESEAT")) return "straight";
  if (n.includes("CHAIR")) return "chair";
  return "modular";
}

/* --------------------------------------------- room visualiser (#2 fear) -- */

export const ROOM_VISUALISER = {
  eyebrow: "Before you commit",
  title: ["Not sure it fits?", "Put it in your room."],
  blurb:
    "Upload a photo of the room and we place the piece in it, at the depth and fabric you picked. The question everyone asks before buying a sectional online, answered in about a minute.",
  steps: [
    { step: "01", label: "Upload a photo", copy: "Any phone shot of the room works." },
    { step: "02", label: "Add the dimensions", copy: "Roughly is fine — 12ft × 15ft, window on the left." },
    { step: "03", label: "See it placed", copy: "Your configuration, rendered into your space." },
  ],
  cta: { label: "Try the room visualiser", href: "/custom-studio" },
  // Both frames are the same Isla room — the slider compares two footprints in
  // it, which is the decision the visualiser actually helps with. Labelling the
  // left frame "your room" would be a lie: it already has a sofa in it.
  beforeImage: `${CDN}/ISLA-SOFA-CUSTOM-1.png`,
  beforeLabel: "Isla Sofa",
  afterImage: `${CDN}/ISLA-XL-SECTIONAL-CUSTOM-1.png`,
  afterLabel: "Isla XL Sectional",
} as const;

/* ----------------------------------------------------------- series (#3) -- */

export const SERIES_SECTION = {
  title: ["Seven series.", "One system."],
  blurb:
    "Each series is a different silhouette — arm width, seam detail, how the cushions sit. Every shape is available in all of them.",
} as const;

/** Copy keyed by series name; the images and counts come from the database. */
export const SERIES_COPY: Record<string, { tagline: string; copy: string }> = {
  "Stanton II": {
    tagline: "The refined classic",
    copy: "The Stanton silhouette with slimmer arms and cleaner seams. Our most complete series.",
  },
  Stanton: {
    tagline: "Deep and tailored",
    copy: "A squared frame with deep seating. The build most rooms start with.",
  },
  Isla: {
    tagline: "Soft shoulder",
    copy: "Generous proportions and a relaxed, rounded shoulder line.",
  },
  Diane: {
    tagline: "Quiet footprint",
    copy: "Sleek tailored lines for rooms that need the sofa to take up less visual space.",
  },
  Nimbus: {
    tagline: "Fully modular",
    copy: "Cloud-like cushioning on a system designed to be rearranged.",
  },
  Paloma: {
    tagline: "Architectural",
    copy: "Blocky, confident forms that scale up to U-shape and 4×4 plans.",
  },
  Bobby: {
    tagline: "Small-space modular",
    copy: "Modular comfort proportioned for apartments and smaller rooms.",
  },
};

/* ----------------------------------------------- configurator preview (#4) */

export const CONFIGURATOR = {
  eyebrow: "Made to order",
  title: ["Custom without", "the guesswork."],
  blurb:
    "Four choices and you are done. Nothing is built until you have made them, which is why nothing arrives that does not fit.",
  depths: [
    { id: "compact", label: '36" Compact', copy: "Narrow rooms and walkways.", arm: '6" armrest' },
    { id: "comfy", label: '40" Comfy', copy: "The one most people pick.", arm: '8" armrest' },
    { id: "luxe", label: '46" Luxe', copy: "Lounging depth for open rooms.", arm: '8" armrest' },
  ],
  /**
   * The five house materials. `swatch` is the base colour and `sheen` the
   * colour of the light that grazes it — the hero renders the 3D piece from
   * these two values, so the picker up there and the tiles down here stay the
   * same five fabrics instead of two lists that drift apart.
   */
  materials: [
    { id: "textured-weave", label: "Textured Weave", swatch: "#C9BBA6", sheen: "#EFE6D6", note: "Flat, hard-wearing, forgiving." },
    { id: "chenille", label: "Chenille", swatch: "#B9AE9C", sheen: "#E6DCCB", note: "Soft pile with a low shine." },
    { id: "velvet", label: "Velvet", swatch: "#7C6A5B", sheen: "#D8B98F", note: "Catches the light at every angle." },
    { id: "boucle", label: "Bouclé", swatch: "#E3DACB", sheen: "#FFF8EC", note: "Looped texture, for bright rooms." },
    { id: "leatherette", label: "Leatherette", swatch: "#4A3E35", sheen: "#9A7C5C", note: "Wipe-clean, ages dark." },
  ],
  backCushions: [
    { id: "knife-edge", label: "Knife edge", copy: "Loose-back, reversible" },
    { id: "squared", label: "Squared corner", copy: "Loose-back, reversible" },
  ],
  seatStyles: [
    { id: "seamless", label: "Seamless", copy: "One unbroken seat line" },
    { id: "reversible", label: "Reversible", copy: "Flip the cushions to even out wear" },
  ],
} as const;

/** Build specs, straight from the product pages. */
export const SPECS = [
  "Kiln-dried hardwood & plywood frame",
  "Non-sag sinuous spring system",
  "Seats: plush fibre-wrapped 2lb density foam",
  "Back fill: poly-fibre",
  "Frame height 28\" with legs and back cushions removed, for stairwells and tight passages",
] as const;

/* ---------------------------------------------------------------- contact -- */

/**
 * The showroom, as one source of truth.
 *
 * The contact page, the footer and the structured data all read this, so the
 * address can never be current in one place and eighteen months stale in
 * another — which is exactly what had happened to the Queen Street West
 * placeholder that was in both.
 */
export const CONTACT = {
  phone: { label: "+1 647-919-9003", href: "tel:+16479199003" },
  email: { label: "studio@thesofaco.ca", href: "mailto:studio@thesofaco.ca" },
  address: {
    unit: "9",
    street: "3687 Nashua Drive",
    city: "Mississauga",
    province: "ON",
    postalCode: "L4V 1V5",
    country: "Canada",
    /** How it is written in running copy and on one line in the footer. */
    oneLine: "9-3687 Nashua Drive, Mississauga, ON L4V 1V5",
  },
  hours: [
    { days: "Monday – Friday", time: "11am – 6pm" },
    { days: "Saturday", time: "11am – 4pm" },
    { days: "Sunday", time: "By appointment" },
  ],
} as const;

/* ------------------------------------------------------------ trust (#5) -- */

export const TRUST = {
  items: [
    { id: "canada", label: "Handcrafted in Canada", copy: "Built to order in our own workshop." },
    { id: "materials", label: "Premium materials", copy: "Kiln-dried frames, 2lb density foam." },
    { id: "returns", label: "30-day returns", copy: "If the room disagrees, send it back." },
    { id: "delivery", label: "White-glove delivery", copy: "Carried in, assembled, packaging taken away." },
  ],
  marquee: [
    "Made to order in Canada",
    "Free shipping over $200",
    "30-day returns",
    "White-glove delivery",
  ],
} as const;

/* ----------------------------------------------------- testimonials (#6) -- */

const unsplash = (id: string, w = 600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=85`;

export const TESTIMONIALS = {
  title: ["Stories from our", "happy customers."],
  blurb:
    "See why design lovers trust our collections to bring elegance, warmth, and functionality into their homes.",
  items: [
    {
      id: "sarah",
      quote:
        "The quality exceeded my expectations. Every detail feels thoughtfully crafted, and the sectional has become the centrepiece of our living room. Stylish, comfortable, and built to last.",
      name: "Sarah Mitchell",
      role: "Interior Designer",
      photo: unsplash("1494790108377-be9c29b29330"),
    },
    {
      id: "daniel",
      quote:
        "We measured twice and still worried. Dropping a photo of the room in and seeing the 2×3 actually sitting there is what made us hit order. It arrived exactly as it looked.",
      name: "Daniel Okafor",
      role: "Homeowner, Toronto",
      photo: unsplash("1507003211169-0a1dd7228f2d"),
    },
    {
      id: "mireille",
      quote:
        "I specify Sofa Co. for nearly every residential project now. Made-to-order sizing solves rooms that nothing off the shelf ever fits.",
      name: "Mireille Chen",
      role: "Principal, Studio Neve",
      photo: unsplash("1573497019940-1c28c88b4f3e"),
    },
  ],
} as const;

/* ------------------------------------------------------------------- nav -- */

export const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/custom-studio", label: "Custom Studio" },
  { href: "/lookbook", label: "The 2026 Collection" },
  { href: "/our-story", label: "Our Story" },
  { href: "/contact", label: "Contact" },
] as const;
