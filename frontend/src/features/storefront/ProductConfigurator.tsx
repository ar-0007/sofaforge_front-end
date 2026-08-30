"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { cn } from "@/lib/utils";
import {
  visibleChoices,
  type ConfiguratorChoice,
  type ConfiguratorGroup,
  type Selections,
} from "./useConfigurator";

/**
 * The questions a shopper answers before a made-to-order piece can be built.
 *
 * Every group comes from the database, so the owner adds a question or reprices
 * an upgrade in the admin rather than here. Only the *rendering* is decided in
 * this file, from the group's `displayType`.
 */

function formatDelta(minorUnits: number): string | null {
  if (minorUnits === 0) return null;
  const sign = minorUnits > 0 ? "+" : "−";
  const amount = Math.abs(minorUnits) / 100;
  return `${sign}$${amount.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function GroupHeading({ group, value }: { group: ConfiguratorGroup; value?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-900">
        {group.label}
        {group.isRequired ? <span className="ml-1 text-clay-500">*</span> : null}
      </h3>
      {value ? <span className="truncate text-xs text-ink-500">{value}</span> : null}
    </div>
  );
}

/** Depth and anything else offered as a labelled chip with a price. */
function ChipGroup({
  choices,
  selectedId,
  onSelect,
}: {
  choices: ConfiguratorChoice[];
  selectedId?: number;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {choices.map(choice => {
        const active = choice.id === selectedId;
        const delta = formatDelta(choice.priceDelta);
        return (
          <button
            type="button"
            key={choice.id}
            onClick={() => onSelect(choice.id)}
            aria-pressed={active}
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition-colors",
              active
                ? "border-ink-900 bg-sand-50 ring-1 ring-ink-900"
                : "border-sand-300 bg-sand-50 hover:border-clay-400"
            )}
          >
            <span className="block text-sm text-ink-900">{choice.label}</span>
            {delta ? (
              <span className="mt-0.5 block text-xs font-medium text-clay-500">{delta}</span>
            ) : (
              <span className="mt-0.5 block text-xs text-ink-500">Included</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Materials: a labelled tile, since the store gives them no swatch photo. */
function MaterialGroup({
  choices,
  selectedId,
  onSelect,
}: {
  choices: ConfiguratorChoice[];
  selectedId?: number;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {choices.map(choice => {
        const active = choice.id === selectedId;
        const delta = formatDelta(choice.priceDelta);
        return (
          <button
            type="button"
            key={choice.id}
            onClick={() => onSelect(choice.id)}
            aria-pressed={active}
            className={cn(
              "rounded-xl border px-4 py-3 text-center transition-colors",
              active
                ? "border-ink-900 bg-sand-50 ring-1 ring-ink-900"
                : "border-sand-300 bg-sand-50 hover:border-clay-400"
            )}
          >
            <span className="block text-sm text-ink-900">{choice.label}</span>
            {delta ? <span className="mt-0.5 block text-xs text-clay-500">{delta}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Fabric colours.
 *
 * The swatch is a photograph of the weave, and at grid size the difference
 * between two creams is invisible — so hovering (or focusing) lifts one out at
 * a readable size with its name, which is how a shopper actually tells
 * "Kingston 109 Ivory" from "Vogue 0103 Ivory".
 */
function SwatchGroup({
  choices,
  selectedId,
  onSelect,
}: {
  choices: ConfiguratorChoice[];
  selectedId?: number;
  onSelect: (id: number) => void;
}) {
  const [preview, setPreview] = useState<ConfiguratorChoice | null>(null);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {choices.map(choice => {
          const active = choice.id === selectedId;
          return (
            <button
              type="button"
              key={choice.id}
              onClick={() => onSelect(choice.id)}
              onMouseEnter={() => setPreview(choice)}
              onMouseLeave={() => setPreview(current => (current?.id === choice.id ? null : current))}
              onFocus={() => setPreview(choice)}
              onBlur={() => setPreview(current => (current?.id === choice.id ? null : current))}
              aria-pressed={active}
              title={choice.label}
              className={cn(
                "relative h-11 w-11 overflow-hidden rounded-lg border transition-all",
                active
                  ? "border-ink-900 ring-2 ring-ink-900 ring-offset-2 ring-offset-sand-100"
                  : "border-sand-300 hover:border-clay-500"
              )}
              style={choice.swatchColor ? { backgroundColor: choice.swatchColor } : undefined}
            >
              {choice.imageUrl ? (
                <OptimizedImage
                  src={choice.imageUrl}
                  alt={choice.label}
                  sizes="44px"
                  className="h-full w-full object-cover"
                />
              ) : null}
              <span className="sr-only">{choice.label}</span>
              {active ? (
                <span className="absolute inset-0 grid place-items-center bg-ink-900/25">
                  <Check size={15} strokeWidth={2.5} className="text-white drop-shadow" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Reserved space, so hovering a swatch never nudges the page. */}
      <div className="mt-3 flex h-[68px] items-center gap-3">
        {preview ? (
          <>
            <div className="h-[68px] w-[68px] shrink-0 overflow-hidden rounded-lg border border-sand-300">
              {preview.imageUrl ? (
                <OptimizedImage
                  src={preview.imageUrl}
                  alt={preview.label}
                  sizes="68px"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full" style={{ backgroundColor: preview.swatchColor ?? "#ddd" }} />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm text-ink-900">{preview.label}</p>
              {formatDelta(preview.priceDelta) ? (
                <p className="mt-0.5 text-xs font-medium text-clay-500">
                  {formatDelta(preview.priceDelta)}
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-xs text-ink-500">Hover a swatch to see the weave and its name.</p>
        )}
      </div>
    </div>
  );
}

/** Cushion and seat styles: a photo per option where the store supplies one. */
function ImageGroup({
  choices,
  selectedId,
  onSelect,
}: {
  choices: ConfiguratorChoice[];
  selectedId?: number;
  onSelect: (id: number) => void;
}) {
  // Small fixed tiles rather than a full-width grid: these say "which cushion
  // shape", which reads at a glance — a large photo of grey upholstery pushes
  // the Add to bag button off the screen without telling the shopper more.
  return (
    <div className="mt-3 flex flex-wrap gap-2.5">
      {choices.map(choice => {
        const active = choice.id === selectedId;
        const delta = formatDelta(choice.priceDelta);
        return (
          <button
            type="button"
            key={choice.id}
            onClick={() => onSelect(choice.id)}
            aria-pressed={active}
            title={choice.label}
            className={cn(
              "w-[124px] overflow-hidden rounded-lg border text-left transition-colors",
              active
                ? "border-ink-900 ring-1 ring-ink-900"
                : "border-sand-300 hover:border-clay-400"
            )}
          >
            {choice.imageUrl ? (
              <div className="aspect-[4/3] bg-sand-200">
                <OptimizedImage
                  src={choice.imageUrl}
                  alt={choice.label}
                  sizes="124px"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
            <span className="block px-2 py-1.5 text-[10px] leading-4 text-ink-900">
              {choice.label}
              {delta ? <span className="mt-0.5 block text-clay-500">{delta}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ProductConfigurator({
  groups,
  selections,
  onSelect,
}: {
  groups: ConfiguratorGroup[];
  selections: Selections;
  onSelect: (groupId: number, choiceId: number) => void;
}) {
  if (groups.length === 0) return null;

  return (
    <div className="mt-8 space-y-7 border-t border-sand-300 pt-8">
      {groups.map(group => {
        const available = visibleChoices(group, selections);
        if (available.length === 0) return null;

        const selectedId = selections[group.id];
        const selected = available.find(choice => choice.id === selectedId);
        const select = (choiceId: number) => onSelect(group.id, choiceId);

        return (
          <section key={group.id} aria-label={group.label}>
            <GroupHeading group={group} value={selected?.label} />
            {group.helpText ? (
              <p className="mt-1.5 text-xs leading-5 text-ink-500">{group.helpText}</p>
            ) : null}

            {group.displayType === "swatch" && available.some(choice => choice.imageUrl) ? (
              <SwatchGroup choices={available} selectedId={selectedId} onSelect={select} />
            ) : group.displayType === "swatch" ? (
              <MaterialGroup choices={available} selectedId={selectedId} onSelect={select} />
            ) : group.displayType === "image" ? (
              <ImageGroup choices={available} selectedId={selectedId} onSelect={select} />
            ) : (
              <ChipGroup choices={available} selectedId={selectedId} onSelect={select} />
            )}
          </section>
        );
      })}
    </div>
  );
}
