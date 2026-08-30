/**
 * Ready-made configurator questions for upholstered furniture.
 *
 * Typing out "Select Depth" with three priced choices for every new sofa is the
 * slowest part of listing one, and it is the same list every time. These are
 * the standard question sets; the owner applies one and then edits the labels
 * and prices to match their own range.
 *
 * Prices are deliberately left at zero. A preset should never quietly attach a
 * number to a product — the owner sets what each upgrade actually costs.
 */

export type PresetChoice = {
  label: string;
  value: string;
  description?: string;
  swatchColor?: string;
};

export type PresetGroup = {
  label: string;
  slug: string;
  helpText?: string;
  displayType: "radio" | "dropdown" | "swatch" | "image" | "checkbox" | "text";
  isRequired: boolean;
  choices: PresetChoice[];
};

export type OptionPreset = {
  id: string;
  label: string;
  description: string;
  groups: PresetGroup[];
};

export const OPTION_PRESETS: ReadonlyArray<OptionPreset> = [
  {
    id: "sectional",
    label: "Sectional sofa",
    description: "Orientation, depth, material, colour, cushion and seat style — the full set for a made-to-order sectional.",
    groups: [
      {
        label: "Configuration",
        slug: "configuration",
        helpText: "Which end the chaise sits on, seen while facing the sofa.",
        displayType: "image",
        isRequired: true,
        choices: [
          { label: "LHF Arm Chaise & RHF Loveseat", value: "lhf-chaise-rhf-loveseat", description: "Chaise on the left as you face it." },
          { label: "LHF Loveseat & RHF Arm Chaise", value: "lhf-loveseat-rhf-chaise", description: "Chaise on the right as you face it." },
        ],
      },
      {
        label: "Select Depth",
        slug: "depth",
        helpText: "How deep the seat sits. Deeper suits lounging, shallower suits smaller rooms.",
        displayType: "radio",
        isRequired: true,
        choices: [
          { label: '36" Compact Depth', value: "compact-36" },
          { label: '40" Comfy Depth', value: "comfy-40" },
          { label: '46" Luxe Depth', value: "luxe-46" },
        ],
      },
      {
        label: "Select Material",
        slug: "material",
        displayType: "swatch",
        isRequired: true,
        choices: [
          { label: "Textured Weave", value: "textured-weave", swatchColor: "#C7B7A0" },
          { label: "Chenille", value: "chenille", swatchColor: "#B8A88F" },
          { label: "Velvet", value: "velvet", swatchColor: "#7C6A57" },
          { label: "Bouclé", value: "boucle", swatchColor: "#E4D9C7" },
          { label: "Leatherette", value: "leatherette", swatchColor: "#5A4535" },
        ],
      },
      {
        label: "Select Colour",
        slug: "colour",
        helpText: "Shown as swatches. Add or remove colours to match the material range you stock.",
        displayType: "swatch",
        isRequired: true,
        choices: [
          { label: "Sand", value: "sand", swatchColor: "#D2C3AB" },
          { label: "Oat", value: "oat", swatchColor: "#E4D9C7" },
          { label: "Clay", value: "clay", swatchColor: "#C25620" },
          { label: "Olive", value: "olive", swatchColor: "#7C7F5F" },
          { label: "Charcoal", value: "charcoal", swatchColor: "#453C33" },
          { label: "Ivory", value: "ivory", swatchColor: "#FDFAF5" },
        ],
      },
      {
        label: "Back Cushion Style",
        slug: "back-cushion",
        displayType: "image",
        isRequired: true,
        choices: [
          { label: "Loose-back, reversible, knife edge", value: "knife-edge" },
          { label: "Loose-back, reversible, squared corner", value: "squared-corner" },
        ],
      },
      {
        label: "Seat Style",
        slug: "seat-style",
        displayType: "image",
        isRequired: true,
        choices: [
          { label: "Seamless", value: "seamless", description: "One continuous seat cushion." },
          { label: "Reversible", value: "reversible", description: "Separate cushions that can be flipped." },
        ],
      },
      {
        label: "Arm Style",
        slug: "arm-style",
        displayType: "image",
        isRequired: false,
        choices: [
          { label: "Track arm", value: "track" },
          { label: "Roll arm", value: "roll" },
          { label: "Armless", value: "armless" },
        ],
      },
      {
        label: "Leg Finish",
        slug: "legs",
        displayType: "swatch",
        isRequired: false,
        choices: [
          { label: "Natural oak", value: "natural-oak", swatchColor: "#C8A27A" },
          { label: "Walnut", value: "walnut", swatchColor: "#6B4A2F" },
          { label: "Black metal", value: "black-metal", swatchColor: "#2B2622" },
        ],
      },
    ],
  },
  {
    id: "sofa",
    label: "Standard sofa or loveseat",
    description: "Depth, material, colour, cushion and seat style, without the sectional orientation question.",
    groups: [
      {
        label: "Select Size",
        slug: "size",
        displayType: "radio",
        isRequired: true,
        choices: [
          { label: "Loveseat — 2 seat", value: "loveseat" },
          { label: "Sofa — 3 seat", value: "sofa" },
          { label: "Grand sofa — 4 seat", value: "grand-sofa" },
        ],
      },
      {
        label: "Select Depth",
        slug: "depth",
        displayType: "radio",
        isRequired: true,
        choices: [
          { label: '36" Compact Depth', value: "compact-36" },
          { label: '40" Comfy Depth', value: "comfy-40" },
        ],
      },
      {
        label: "Select Material",
        slug: "material",
        displayType: "swatch",
        isRequired: true,
        choices: [
          { label: "Textured Weave", value: "textured-weave", swatchColor: "#C7B7A0" },
          { label: "Chenille", value: "chenille", swatchColor: "#B8A88F" },
          { label: "Velvet", value: "velvet", swatchColor: "#7C6A57" },
          { label: "Bouclé", value: "boucle", swatchColor: "#E4D9C7" },
        ],
      },
      {
        label: "Select Colour",
        slug: "colour",
        displayType: "swatch",
        isRequired: true,
        choices: [
          { label: "Sand", value: "sand", swatchColor: "#D2C3AB" },
          { label: "Clay", value: "clay", swatchColor: "#C25620" },
          { label: "Olive", value: "olive", swatchColor: "#7C7F5F" },
          { label: "Charcoal", value: "charcoal", swatchColor: "#453C33" },
        ],
      },
      {
        label: "Back Cushion Style",
        slug: "back-cushion",
        displayType: "image",
        isRequired: true,
        choices: [
          { label: "Loose-back, reversible, knife edge", value: "knife-edge" },
          { label: "Loose-back, reversible, squared corner", value: "squared-corner" },
        ],
      },
    ],
  },
  {
    id: "chair",
    label: "Chair or ottoman",
    description: "A short set: material, colour and leg finish.",
    groups: [
      {
        label: "Select Material",
        slug: "material",
        displayType: "swatch",
        isRequired: true,
        choices: [
          { label: "Textured Weave", value: "textured-weave", swatchColor: "#C7B7A0" },
          { label: "Velvet", value: "velvet", swatchColor: "#7C6A57" },
          { label: "Bouclé", value: "boucle", swatchColor: "#E4D9C7" },
        ],
      },
      {
        label: "Select Colour",
        slug: "colour",
        displayType: "swatch",
        isRequired: true,
        choices: [
          { label: "Sand", value: "sand", swatchColor: "#D2C3AB" },
          { label: "Clay", value: "clay", swatchColor: "#C25620" },
          { label: "Charcoal", value: "charcoal", swatchColor: "#453C33" },
        ],
      },
      {
        label: "Leg Finish",
        slug: "legs",
        displayType: "swatch",
        isRequired: false,
        choices: [
          { label: "Natural oak", value: "natural-oak", swatchColor: "#C8A27A" },
          { label: "Walnut", value: "walnut", swatchColor: "#6B4A2F" },
          { label: "Black metal", value: "black-metal", swatchColor: "#2B2622" },
        ],
      },
    ],
  },
];

export function findPreset(id: string): OptionPreset | undefined {
  return OPTION_PRESETS.find(preset => preset.id === id);
}
