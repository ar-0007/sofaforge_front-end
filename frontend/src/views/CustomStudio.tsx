"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Maximize2, Sparkles } from "lucide-react";
import StoreLayout from "@/components/StoreLayout";
import { OptimizedImage } from "@/components/OptimizedImage";
import { ConfiguratorProgress } from "@/components/StorefrontPrimitives";
import { useCart } from "@/contexts/CartContext";
import { toMajorUnits } from "@/lib/analytics/items";
import { useTracking } from "@/lib/analytics/tracker";
import { trpc } from "@/lib/trpc";
import { STUDIO_STEPS, studioStepCopy } from "@shared/catalog/studioSteps";
import { toast } from "sonner";

/**
 * The Custom Studio: design a piece from nothing, one question at a time.
 *
 * The steps are catalogue data, not code. They come from the global option
 * groups the owner edits under Admin → Custom Studio, so adding a fabric or
 * repricing a size is a form on a screen rather than a deploy. Until those rows
 * exist the page falls back to the four steps it shipped with — the same
 * labels, photos and prices — so the studio is never blank and the migration
 * is invisible to a shopper.
 *
 * Pricing is one rule the whole way down: **the total is the sum of what you
 * picked**. The first step's answers carry the price of the piece and every
 * later answer carries its upgrade, which is what lets the owner add a fifth
 * step without anybody rewriting the arithmetic.
 */

type Choice = {
  id: number | string;
  label: string;
  value: string;
  priceDelta: number;
  description: string | null;
  swatchColor: string | null;
  imageUrl: string | null;
  isDefault: boolean;
};

type Step = {
  id: number | string;
  label: string;
  slug: string;
  helpText: string | null;
  displayType: string;
  choices: Choice[];
};

/** The four steps as they were hard-coded, in the shape the query returns. */
const FALLBACK_STEPS: Step[] = STUDIO_STEPS.map(step => ({
  id: step.slug,
  label: step.label,
  slug: step.slug,
  helpText: step.helpText,
  displayType: step.displayType,
  choices: step.choices.map(choice => ({
    id: `${step.slug}-${choice.value}`,
    label: choice.label,
    value: choice.value,
    priceDelta: choice.priceDelta,
    description: choice.description ?? null,
    swatchColor: choice.swatchColor ?? null,
    imageUrl: choice.imageUrl ?? null,
    isDefault: Boolean(choice.isDefault),
  })),
}));

const money = (minorUnits: number) => `$${(minorUnits / 100).toLocaleString()}`;

export default function CustomStudio() {
  const { addToCart } = useCart();
  const { track } = useTracking();
  const saveConfigMutation = trpc.commerce.saveConfiguration.useMutation();

  // A studio with no steps is the same as no studio, so an empty result falls
  // straight through to the built-in four rather than rendering an empty shell.
  const remote = trpc.commerce.getStudioSteps.useQuery(undefined, {
    staleTime: 5 * 60_000,
    retry: false,
  });
  const steps: Step[] = useMemo(() => {
    const rows = remote.data ?? [];
    const usable = rows.filter(row => row.choices.length > 0);
    return usable.length > 0 ? usable : FALLBACK_STEPS;
  }, [remote.data]);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Record<string, string>>({});

  /**
   * Defaults are applied per step and only where the shopper has not answered,
   * so a slow query that resolves mid-session cannot wipe a choice already
   * made — it only fills in the steps that arrived with it.
   */
  useEffect(() => {
    setPicked(previous => {
      const next = { ...previous };
      let changed = false;
      for (const step of steps) {
        if (next[step.slug] && step.choices.some(choice => choice.value === next[step.slug])) continue;
        const preferred = step.choices.find(choice => choice.isDefault) ?? step.choices[0];
        if (!preferred) continue;
        next[step.slug] = preferred.value;
        changed = true;
      }
      return changed ? next : previous;
    });
    setIndex(current => Math.min(current, Math.max(0, steps.length - 1)));
  }, [steps]);

  const selections = useMemo(
    () =>
      steps.map(step => ({
        step,
        choice: step.choices.find(choice => choice.value === picked[step.slug]) ?? step.choices[0],
      })),
    [steps, picked],
  );

  const totalPrice = selections.reduce((total, entry) => total + (entry.choice?.priceDelta ?? 0), 0);

  /** The piece is named after the first step — the silhouette, as shipped. */
  const headline = selections[0]?.choice?.label ?? "Custom piece";

  /** The first answer carrying a photograph is the one worth previewing. */
  const previewImage =
    selections.find(entry => entry.choice?.imageUrl)?.choice?.imageUrl ?? FALLBACK_STEPS[0].choices[0].imageUrl;

  const summaryLine = selections
    .slice(1)
    .map(entry => entry.choice?.label)
    .filter(Boolean)
    .join(" · ");

  const current = steps[index];
  const copy = current ? studioStepCopy(current.slug, current.label, index) : null;

  // The configurator counts as started once, when the shopper arrives — not on
  // every step change, which would report four starts for one design.
  const reportedStart = useRef(false);
  useEffect(() => {
    if (reportedStart.current) return;
    reportedStart.current = true;
    track("customise_start", { contentName: "Custom Studio", contentCategory: "Custom" });
  }, [track]);

  /** The finished design, described the same way for every event below. */
  const configuredItem = () => ({
    id: `custom-${selections.map(entry => entry.choice?.value ?? "none").join("-")}`,
    name: `Custom ${headline}`,
    category: "Custom",
    price: toMajorUnits(totalPrice),
    quantity: 1,
  });

  /**
   * `customConfigurations` still has four fixed columns, so a saved design
   * keeps the first four answers positionally. Steps beyond the fourth are
   * priced and added to the bag correctly but are not persisted to the
   * shopper's account until that table takes a JSON payload.
   */
  const savedShape = () => ({
    shape: selections[0]?.choice?.label ?? "—",
    fabric: selections[1]?.choice?.label ?? "—",
    colour: selections[2]?.choice?.label ?? "—",
    size: selections[3]?.choice?.label ?? "—",
    totalPrice,
  });

  const handleSaveConfig = async () => {
    try {
      await saveConfigMutation.mutateAsync(savedShape());
      toast.success("Configuration saved", { description: "Find it anytime in your account." });
      track("customise_complete", {
        value: toMajorUnits(totalPrice),
        items: [configuredItem()],
        contentName: `Custom ${headline}`,
        contentCategory: "Custom",
      });
    } catch {
      toast.error("Sign in to save", { description: "Your configuration is ready to add to bag." });
    }
  };

  const handleAddToBag = () => {
    addToCart({
      id: configuredItem().id,
      name: `Custom ${headline}`,
      price: totalPrice,
      quantity: 1,
      image: previewImage ?? undefined,
      variantDetails: summaryLine,
    });
    toast.success("Added to your bag", { description: "Your made-to-order piece is ready for review." });
    // Reaching the bag finishes the design too — a shopper who adds without
    // saving has still completed the configurator.
    track("customise_complete", {
      value: toMajorUnits(totalPrice),
      items: [configuredItem()],
      contentName: `Custom ${headline}`,
      contentCategory: "Custom",
    });
    track("add_to_cart", {
      value: toMajorUnits(totalPrice),
      items: [configuredItem()],
      contentName: `Custom ${headline}`,
      contentCategory: "Custom",
    });
  };

  const last = steps.length - 1;
  const nextStep = () => setIndex(step => Math.min(last, step + 1));
  const previousStep = () => setIndex(step => Math.max(0, step - 1));

  return (
    <StoreLayout>
      <main className="bg-[#f8f4ec]">
        <section className="relative overflow-hidden bg-[#25221d] px-6 py-20 text-[#f8f4ec] sm:px-10 lg:px-16 lg:py-28">
          <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-12 lg:items-end">
            <div className="relative z-10 lg:col-span-8">
              <p className="eyebrow text-[#e6b889]">
                Custom Studio · 01 — {String(steps.length).padStart(2, "0")}
              </p>
              <h1 className="font-display mt-5 max-w-4xl text-7xl leading-[0.84] tracking-[-0.055em] sm:text-8xl lg:text-[9rem]">
                A piece made
                <br />
                around you.
              </h1>
            </div>
            <p className="relative z-10 max-w-sm text-sm leading-7 text-white/60 lg:col-span-4 lg:col-start-9">
              Choose the silhouette, the handfeel, the colour, and the scale. We will build the rest
              with care.
            </p>
          </div>
          <div className="pointer-events-none absolute -bottom-24 right-0 font-display text-[20rem] leading-none text-white/[0.035]">
            {String(steps.length).padStart(2, "0")}
          </div>
        </section>

        <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-14 sm:px-10 lg:grid-cols-12 lg:px-16 lg:py-24">
          <section className="lg:col-span-8">
            <div className="mb-12">
              <ConfiguratorProgress step={index + 1} labels={steps.map(step => step.label)} />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={current?.slug ?? index}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.3 }}
              >
                {current && copy ? (
                  <div>
                    <p className="eyebrow">{copy.eyebrow}</p>
                    <h2 className="font-display mt-4 text-5xl tracking-[-0.04em]">{copy.heading}</h2>
                    {current.helpText ? (
                      <p className="mt-3 max-w-lg text-sm leading-6 text-[#766b5d]">{current.helpText}</p>
                    ) : null}

                    <StepChoices
                      step={current}
                      selected={picked[current.slug]}
                      onSelect={value => setPicked(previous => ({ ...previous, [current.slug]: value }))}
                    />
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>

            <div className="mt-14 flex items-center justify-between border-t border-[#decfbd] pt-6">
              <button
                type="button"
                onClick={previousStep}
                disabled={index === 0}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#766b5d] disabled:opacity-30"
              >
                <ArrowLeft size={15} /> Back
              </button>

              {index < last ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-3 bg-[#25221d] px-7 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f8f4ec] transition-colors hover:bg-[#9b6e4b]"
                >
                  Continue <ArrowRight size={15} />
                </button>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={saveConfigMutation.isPending}
                    aria-busy={saveConfigMutation.isPending}
                    onClick={handleSaveConfig}
                    className="border border-[#25221d] px-5 py-4 text-[10px] font-bold uppercase tracking-[0.18em] disabled:cursor-wait disabled:opacity-60"
                  >
                    {saveConfigMutation.isPending ? "Saving…" : "Save design"}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToBag}
                    className="flex items-center gap-3 bg-[#25221d] px-6 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f8f4ec] transition-colors hover:bg-[#9b6e4b]"
                  >
                    Add to bag <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </section>

          <aside className="lg:col-span-4 lg:col-start-9">
            <div className="sticky top-32 overflow-hidden bg-[#25221d] text-[#f8f4ec]">
              <div className="relative aspect-[1.2] overflow-hidden">
                <motion.div
                  key={previewImage ?? "none"}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45 }}
                  className="h-full w-full"
                >
                  <OptimizedImage
                    src={previewImage ?? undefined}
                    alt="Your custom sofa"
                    priority
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="h-full w-full object-cover"
                  />
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#25221d] via-transparent to-transparent" />
                <span className="absolute bottom-5 left-5 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.17em] text-white/70">
                  <Sparkles size={13} className="text-[#e6b889]" /> Live preview
                </span>
              </div>

              <div className="p-7 sm:p-9">
                <p className="eyebrow text-[#e6b889]">Your configuration</p>
                <h3 className="font-display mt-4 text-4xl leading-none">{headline}</h3>

                {/* Every step after the first, so a fifth one the owner adds
                    shows up here without anybody touching this file. */}
                <div className="mt-8 space-y-3 border-y border-white/15 py-6 text-xs">
                  {selections.slice(1).map(entry => (
                    <div key={entry.step.slug} className="flex justify-between gap-4">
                      <span className="text-white/50">{entry.step.label}</span>
                      <span className="text-right">{entry.choice?.label ?? "—"}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex items-end justify-between">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-white/50">
                    Starting total
                  </span>
                  <span className="font-display text-4xl">{money(totalPrice)}</span>
                </div>

                <p className="mt-6 text-xs leading-5 text-white/50">
                  Made to order in Canada. Includes our 25-year frame warranty and white-glove
                  delivery.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </StoreLayout>
  );
}

/* ---------------------------------------------------------------- choices -- */

/**
 * One step's answers, drawn the way the owner asked for them.
 *
 * `image` gets the photographed tiles the silhouette step needs, `swatch` the
 * colour circles, and everything else the titled card — which is also the
 * honest fallback for a display type this page has no artwork for.
 */
function StepChoices({
  step,
  selected,
  onSelect,
}: {
  step: Step;
  selected: string | undefined;
  onSelect: (value: string) => void;
}) {
  const priceNote = (choice: Choice) =>
    choice.priceDelta > 0 ? ` · +${money(choice.priceDelta)}` : " · Included";

  if (step.displayType === "image") {
    return (
      <div className="mt-9 grid gap-4 sm:grid-cols-2">
        {step.choices.map(choice => (
          <button
            type="button"
            key={choice.value}
            onClick={() => onSelect(choice.value)}
            className={`group overflow-hidden border text-left transition-all ${
              selected === choice.value
                ? "border-[#25221d] bg-[#efe4d6]"
                : "border-[#decfbd] hover:border-[#9b6e4b]"
            }`}
          >
            <div className="relative aspect-[1.45] overflow-hidden bg-[#e9dece]">
              {choice.imageUrl ? (
                <OptimizedImage
                  src={choice.imageUrl}
                  alt={choice.label}
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="image-hover h-full w-full object-cover"
                />
              ) : null}
              {selected === choice.value ? (
                <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-[#f8f4ec]">
                  <Check size={14} />
                </span>
              ) : null}
            </div>
            <div className="p-5">
              <h3 className="font-display text-2xl">{choice.label}</h3>
              <p className="mt-1 text-xs text-[#766b5d]">
                {choice.description ? `${choice.description} · ` : ""}
                From {money(choice.priceDelta)}
              </p>
            </div>
          </button>
        ))}
      </div>
    );
  }

  if (step.displayType === "swatch") {
    return (
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {step.choices.map(choice => (
          <button
            type="button"
            key={choice.value}
            onClick={() => onSelect(choice.value)}
            className={`flex items-center gap-4 border p-5 text-left transition-all ${
              selected === choice.value
                ? "border-[#25221d] bg-[#efe4d6]"
                : "border-[#decfbd] hover:border-[#9b6e4b]"
            }`}
          >
            <span
              className="h-14 w-14 shrink-0 rounded-full border border-black/10 shadow-inner"
              style={{ backgroundColor: choice.swatchColor ?? "#d9cdbb" }}
            />
            <span className="flex-1">
              <span className="block font-display text-2xl">{choice.label}</span>
              <span className="mt-1 block text-[10px] uppercase tracking-[0.15em] text-[#766b5d]">
                {choice.description ?? ""}
                {priceNote(choice)}
              </span>
            </span>
            {selected === choice.value ? <Check size={16} className="text-[#9b6e4b]" /> : null}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-3 sm:grid-cols-3">
      {step.choices.map(choice => (
        <button
          type="button"
          key={choice.value}
          onClick={() => onSelect(choice.value)}
          className={`relative border p-6 text-left transition-all ${
            selected === choice.value
              ? "border-[#25221d] bg-[#efe4d6]"
              : "border-[#decfbd] hover:border-[#9b6e4b]"
          }`}
        >
          {selected === choice.value ? (
            <span className="absolute right-4 top-4 text-[#9b6e4b]">
              <Check size={16} />
            </span>
          ) : null}
          <Maximize2 size={19} strokeWidth={1.3} className="mb-10 text-[#9b6e4b]" />
          <span className="block font-display text-2xl">{choice.label}</span>
          <span className="mt-2 block text-xs leading-5 text-[#766b5d]">
            {choice.description ?? ""}
            {priceNote(choice)}
          </span>
        </button>
      ))}
    </div>
  );
}
