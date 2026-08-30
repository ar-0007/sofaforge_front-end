"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * The configurator's rules, kept out of the markup so they can be tested.
 *
 * Two things here are easy to get wrong and expensive when they are:
 *
 *  - **Dependent choices.** Fabric colours belong to a material — the store
 *    carries 51 of them across five materials. Picking "Velvet" must narrow the
 *    grid to the velvet range, and a colour left selected from the previous
 *    material has to be replaced rather than silently kept.
 *  - **Price.** Every amount is minor units. A choice can add ($4,000 depth) or
 *    subtract, and the running total is what the shopper is agreeing to pay.
 */

export type ConfiguratorChoice = {
  id: number;
  parentChoiceId: number | null;
  label: string;
  value: string;
  priceDelta: number;
  imageUrl: string | null;
  swatchColor: string | null;
  description: string | null;
  isDefault: boolean;
};

export type ConfiguratorGroup = {
  id: number;
  label: string;
  slug: string;
  helpText: string | null;
  displayType: string;
  isRequired: boolean;
  choices: ConfiguratorChoice[];
};

/** Selected choice id per group id. */
export type Selections = Record<number, number>;

/**
 * The choices a group can currently offer.
 *
 * A group whose choices carry a `parentChoiceId` only shows the ones belonging
 * to something already selected; every other group shows all of its choices.
 */
export function visibleChoices(group: ConfiguratorGroup, selections: Selections): ConfiguratorChoice[] {
  const dependent = group.choices.some(choice => choice.parentChoiceId !== null);
  if (!dependent) return group.choices;

  const selectedIds = new Set(Object.values(selections));
  return group.choices.filter(
    choice => choice.parentChoiceId !== null && selectedIds.has(choice.parentChoiceId)
  );
}

/** The choice a group should start on: its marked default, else the first one. */
function initialChoice(choices: ConfiguratorChoice[]): ConfiguratorChoice | undefined {
  return choices.find(choice => choice.isDefault) ?? choices[0];
}

/**
 * Fills in a selection for every group, in order.
 *
 * Order matters: a colour group can only resolve once its material is chosen,
 * and groups arrive sorted with the parent ahead of its dependants.
 */
export function resolveSelections(groups: ConfiguratorGroup[], preferred: Selections = {}): Selections {
  const next: Selections = {};

  for (const group of groups) {
    const available = visibleChoices(group, next);
    if (available.length === 0) continue;

    const wanted = preferred[group.id];
    // Keep what the shopper already picked, but only while it is still offered.
    const keep = available.find(choice => choice.id === wanted);
    const chosen = keep ?? initialChoice(available);
    if (chosen) next[group.id] = chosen.id;
  }

  return next;
}

export function selectedChoices(groups: ConfiguratorGroup[], selections: Selections): ConfiguratorChoice[] {
  return groups
    .map(group => group.choices.find(choice => choice.id === selections[group.id]))
    .filter((choice): choice is ConfiguratorChoice => Boolean(choice));
}

/** Base price plus every selected choice's delta, in minor units. */
export function configuredPrice(
  basePrice: number,
  groups: ConfiguratorGroup[],
  selections: Selections
): number {
  const delta = selectedChoices(groups, selections).reduce((total, choice) => total + choice.priceDelta, 0);
  // A configuration should never be able to price a piece below nothing.
  return Math.max(0, basePrice + delta);
}

/** "40&quot; Comfy Depth · Velvet · Zed 206 Sand" — what the cart line shows. */
export function configurationSummary(groups: ConfiguratorGroup[], selections: Selections): string {
  return selectedChoices(groups, selections)
    .map(choice => choice.label)
    .join(" · ");
}

/** Every answer, keyed by group slug — stored with the order, read by analytics. */
export function configurationBySlug(
  groups: ConfiguratorGroup[],
  selections: Selections
): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const group of groups) {
    const choice = group.choices.find(item => item.id === selections[group.id]);
    if (choice) entries[group.slug] = choice.label;
  }
  return entries;
}

export function useConfigurator(groups: ConfiguratorGroup[], basePrice: number) {
  /**
   * Only what the shopper actually picked.
   *
   * The defaults are *derived* below rather than written into state by an
   * effect: effects do not run during a server render, so an effect-based
   * default would ship HTML with nothing selected and the bare base price —
   * which is the page Google indexes.
   *
   * A pick for a choice that is no longer offered is kept rather than deleted,
   * so going Velvet -> Weave -> Velvet returns to the velvet colour the shopper
   * had already chosen. `resolveSelections` ignores it while it is unavailable.
   */
  const [picks, setPicks] = useState<Selections>({});

  const selections = useMemo(() => resolveSelections(groups, picks), [groups, picks]);

  const select = useCallback((groupId: number, choiceId: number) => {
    setPicks(previous => ({ ...previous, [groupId]: choiceId }));
  }, []);

  const total = useMemo(
    () => configuredPrice(basePrice, groups, selections),
    [basePrice, groups, selections]
  );

  const summary = useMemo(() => configurationSummary(groups, selections), [groups, selections]);

  return { selections, select, total, summary };
}
