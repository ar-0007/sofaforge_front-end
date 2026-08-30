import { describe, expect, it } from "vitest";
import {
  configuredPrice,
  configurationBySlug,
  configurationSummary,
  resolveSelections,
  visibleChoices,
  type ConfiguratorChoice,
  type ConfiguratorGroup,
} from "./useConfigurator";

function choice(over: Partial<ConfiguratorChoice> & { id: number; label: string }): ConfiguratorChoice {
  return {
    parentChoiceId: null,
    value: over.label.toLowerCase().replace(/\W+/g, "-"),
    priceDelta: 0,
    imageUrl: null,
    swatchColor: null,
    description: null,
    isDefault: false,
    ...over,
  };
}

/** The real shape of the imported store: depth, material, then colours under it. */
const depth: ConfiguratorGroup = {
  id: 1,
  label: "Select Depth",
  slug: "depth",
  helpText: null,
  displayType: "radio",
  isRequired: true,
  choices: [
    choice({ id: 11, label: '36" Compact Depth', priceDelta: 400000, isDefault: true }),
    choice({ id: 12, label: '40" Comfy Depth', priceDelta: 200000 }),
    choice({ id: 13, label: '46" Luxe Depth', priceDelta: 5999990 }),
  ],
};

const material: ConfiguratorGroup = {
  id: 2,
  label: "Select Material",
  slug: "material",
  helpText: null,
  displayType: "swatch",
  isRequired: true,
  choices: [
    choice({ id: 21, label: "Textured Weave", isDefault: true }),
    choice({ id: 22, label: "Velvet" }),
  ],
};

const colour: ConfiguratorGroup = {
  id: 3,
  label: "Select Colour",
  slug: "colour",
  helpText: null,
  displayType: "swatch",
  isRequired: true,
  choices: [
    choice({ id: 31, label: "Zed 206 Sand", parentChoiceId: 21, isDefault: true }),
    choice({ id: 32, label: "Kingston 109 Ivory", parentChoiceId: 21 }),
    choice({ id: 33, label: "Empress 110 Cream", parentChoiceId: 22, priceDelta: 25000 }),
  ],
};

const groups = [depth, material, colour];
const BASE = 440000;

describe("visibleChoices", () => {
  it("shows every choice in a group that depends on nothing", () => {
    expect(visibleChoices(depth, {})).toHaveLength(3);
  });

  it("narrows a dependent group to the selected parent's range", () => {
    const weave = visibleChoices(colour, { 2: 21 }).map(item => item.label);
    expect(weave).toEqual(["Zed 206 Sand", "Kingston 109 Ivory"]);

    const velvet = visibleChoices(colour, { 2: 22 }).map(item => item.label);
    expect(velvet).toEqual(["Empress 110 Cream"]);
  });

  it("offers nothing while the parent is unanswered", () => {
    expect(visibleChoices(colour, {})).toEqual([]);
  });
});

describe("resolveSelections", () => {
  it("starts each group on its marked default", () => {
    expect(resolveSelections(groups)).toEqual({ 1: 11, 2: 21, 3: 31 });
  });

  it("keeps what the shopper already picked", () => {
    expect(resolveSelections(groups, { 1: 13, 2: 21, 3: 32 })).toEqual({ 1: 13, 2: 21, 3: 32 });
  });

  it("replaces a colour that the newly picked material does not offer", () => {
    // Switching to Velvet must not leave a Textured Weave colour selected.
    expect(resolveSelections(groups, { 1: 11, 2: 22, 3: 32 })).toEqual({ 1: 11, 2: 22, 3: 33 });
  });

  it("falls back to the first choice when a group marks no default", () => {
    const noDefault: ConfiguratorGroup = { ...depth, choices: depth.choices.map(c => ({ ...c, isDefault: false })) };
    expect(resolveSelections([noDefault])).toEqual({ 1: 11 });
  });
});

describe("configuredPrice", () => {
  it("adds every selected choice's delta to the base price", () => {
    // $4,400 base + $4,000 compact depth = $8,400, which is what the page shows.
    expect(configuredPrice(BASE, groups, { 1: 11, 2: 21, 3: 31 })).toBe(840000);
  });

  it("counts a premium colour on top of the depth", () => {
    expect(configuredPrice(BASE, groups, { 1: 12, 2: 22, 3: 33 })).toBe(BASE + 200000 + 25000);
  });

  it("is the base price when nothing is selected yet", () => {
    expect(configuredPrice(BASE, groups, {})).toBe(BASE);
  });

  it("never prices a piece below zero, whatever the discounts", () => {
    const discount: ConfiguratorGroup = {
      ...depth,
      choices: [choice({ id: 11, label: "Impossible discount", priceDelta: -9_000_000, isDefault: true })],
    };
    expect(configuredPrice(BASE, [discount], { 1: 11 })).toBe(0);
  });
});

describe("configurationSummary", () => {
  it("reads as the cart line the shopper will recognise", () => {
    expect(configurationSummary(groups, { 1: 12, 2: 22, 3: 33 })).toBe(
      '40" Comfy Depth · Velvet · Empress 110 Cream'
    );
  });

  it("skips groups with no answer rather than leaving empty separators", () => {
    expect(configurationSummary(groups, { 1: 12 })).toBe('40" Comfy Depth');
  });
});

describe("configurationBySlug", () => {
  it("keys every answer by its group slug", () => {
    expect(configurationBySlug(groups, { 1: 11, 2: 21, 3: 31 })).toEqual({
      depth: '36" Compact Depth',
      material: "Textured Weave",
      colour: "Zed 206 Sand",
    });
  });
});
