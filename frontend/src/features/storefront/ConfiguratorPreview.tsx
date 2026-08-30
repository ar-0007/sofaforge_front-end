"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { InView } from "@/components/motion-primitives/in-view";
import { Container, SectionHeading, Eyebrow } from "@/features/storefront/primitives";
import { CONFIGURATOR, SPECS } from "@/features/storefront/content";
import { cn } from "@/lib/utils";

/**
 * Configurator preview: the whole made-to-order decision, on the home page.
 *
 * The live configurator is a long column of required fields, which makes
 * "custom" feel like homework. This section is the counter-argument — four
 * groups, no form, nothing to submit — and the summary line is the payoff:
 * whatever the visitor clicks, the answer is still one short sentence.
 *
 * Deliberately self-contained: local state only, no cart, no API.
 */

const DOT = " · ";

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

/** Small uppercase group label, rendered as a real <legend>. */
function GroupLegend({ children }: { children: React.ReactNode }) {
  return (
    <legend className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-500">
      {children}
    </legend>
  );
}

function ChoiceTile({
  label,
  copy,
  meta,
  selected,
  onSelect,
}: {
  label: string;
  copy: string;
  meta?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex h-full flex-col items-start gap-1 rounded-2xl border px-4 py-4 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-sand-100",
        selected
          ? "border-ink-900 bg-ink-900 text-sand-50"
          : "border-sand-200 bg-sand-50 text-ink-900 hover:border-sand-400"
      )}
    >
      <span className="font-display text-xl leading-none tracking-[-0.02em]">{label}</span>
      <span className={cn("text-xs leading-5", selected ? "text-sand-200" : "text-ink-500")}>
        {copy}
      </span>
      {meta ? (
        <span
          className={cn(
            "mt-1 text-[10px] uppercase tracking-[0.18em]",
            selected ? "text-sand-300" : "text-ink-400"
          )}
        >
          {meta}
        </span>
      ) : null}
    </button>
  );
}

export function ConfiguratorPreview() {
  // Defaults are the choices most people land on, so the summary reads as a
  // real configuration from the first paint rather than an empty form.
  const [depthId, setDepthId] = useState<string>("comfy");
  const [materialId, setMaterialId] = useState<string>("velvet");
  const [backId, setBackId] = useState<string>("knife-edge");
  const [seatId, setSeatId] = useState<string>("reversible");

  const depth = CONFIGURATOR.depths.find((d) => d.id === depthId) ?? CONFIGURATOR.depths[0];
  const material =
    CONFIGURATOR.materials.find((m) => m.id === materialId) ?? CONFIGURATOR.materials[0];
  const back =
    CONFIGURATOR.backCushions.find((b) => b.id === backId) ?? CONFIGURATOR.backCushions[0];
  const seat = CONFIGURATOR.seatStyles.find((s) => s.id === seatId) ?? CONFIGURATOR.seatStyles[0];

  const summary = [depth.label, material.label, back.label, seat.label].join(DOT);

  return (
    <section
      aria-labelledby="configurator-heading"
      className="overflow-hidden bg-sand-100 py-14 lg:py-20"
    >
      <Container>
        <InView
          variants={reveal}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewOptions={{ once: true, amount: 0.2 }}
        >
          <Eyebrow>{CONFIGURATOR.eyebrow}</Eyebrow>
          <SectionHeading
            id="configurator-heading"
            className="mt-4"
            title={CONFIGURATOR.title.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            blurb={CONFIGURATOR.blurb}
          />
        </InView>

        <InView
          variants={reveal}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          viewOptions={{ once: true, amount: 0.2 }}
        >
          <div className="mt-12 grid gap-8 lg:mt-16 lg:grid-cols-2 lg:gap-10">
            {/* 1 — Depth */}
            <fieldset className="min-w-0">
              <GroupLegend>01&nbsp;&nbsp;Depth</GroupLegend>
              <div className="grid gap-3 sm:grid-cols-3">
                {CONFIGURATOR.depths.map((option) => (
                  <ChoiceTile
                    key={option.id}
                    label={option.label}
                    copy={option.copy}
                    meta={option.arm}
                    selected={option.id === depth.id}
                    onSelect={() => setDepthId(option.id)}
                  />
                ))}
              </div>
            </fieldset>

            {/* 2 — Material */}
            <fieldset className="min-w-0">
              <GroupLegend>02&nbsp;&nbsp;Material</GroupLegend>
              <div className="flex flex-wrap gap-2">
                {CONFIGURATOR.materials.map((option) => {
                  const selected = option.id === material.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setMaterialId(option.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-full border py-2 pl-2 pr-4 text-sm transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500",
                        "focus-visible:ring-offset-2 focus-visible:ring-offset-sand-100",
                        selected
                          ? "border-transparent bg-sand-50 text-ink-900 ring-2 ring-clay-500"
                          : "border-sand-200 bg-sand-50 text-ink-700 hover:border-sand-400"
                      )}
                    >
                      {/* The swatch is catalogue data, not a theme colour, which
                          is why it is the one value applied as a raw hex. */}
                      <span
                        aria-hidden
                        className="h-7 w-7 shrink-0 rounded-full border border-sand-300"
                        style={{ backgroundColor: option.swatch }}
                      />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* 3 — Back cushion */}
            <fieldset className="min-w-0">
              <GroupLegend>03&nbsp;&nbsp;Back cushion</GroupLegend>
              <div className="grid gap-3 sm:grid-cols-2">
                {CONFIGURATOR.backCushions.map((option) => (
                  <ChoiceTile
                    key={option.id}
                    label={option.label}
                    copy={option.copy}
                    selected={option.id === back.id}
                    onSelect={() => setBackId(option.id)}
                  />
                ))}
              </div>
            </fieldset>

            {/* 4 — Seat style */}
            <fieldset className="min-w-0">
              <GroupLegend>04&nbsp;&nbsp;Seat style</GroupLegend>
              <div className="grid gap-3 sm:grid-cols-2">
                {CONFIGURATOR.seatStyles.map((option) => (
                  <ChoiceTile
                    key={option.id}
                    label={option.label}
                    copy={option.copy}
                    selected={option.id === seat.id}
                    onSelect={() => setSeatId(option.id)}
                  />
                ))}
              </div>
            </fieldset>
          </div>

          <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-[1.35fr_1fr]">
            {/* The payoff: four clicks, one sentence. */}
            <div className="flex flex-col justify-between gap-7 rounded-2xl border border-sand-200 bg-sand-50 p-6 sm:p-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-clay-500">
                  Your sectional
                </p>
                <p
                  aria-live="polite"
                  className="font-display mt-3 text-2xl leading-[1.15] tracking-[-0.02em] text-ink-900 sm:text-3xl"
                >
                  {summary}
                </p>
                <p className="mt-3 text-sm leading-6 text-ink-500">
                  That is the whole decision. The frame, the springs and the foam are the same
                  on every piece we build.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link
                  href="/shop"
                  className={cn(
                    "inline-flex items-center rounded-full bg-ink-900 px-7 py-3 text-sm font-medium text-sand-50",
                    "transition-colors hover:bg-clay-600",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500",
                    "focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50"
                  )}
                >
                  Build yours
                </Link>
                <span className="text-xs text-ink-400">Nothing is cut until you order.</span>
              </div>
            </div>

            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-6 sm:p-8">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-500">
                In every piece
              </h3>
              <ul className="mt-4 space-y-3">
                {SPECS.map((spec) => (
                  <li key={spec} className="flex items-start gap-3 text-sm leading-6 text-ink-700">
                    <Check
                      size={15}
                      strokeWidth={2}
                      aria-hidden
                      className="mt-1 shrink-0 text-clay-500"
                    />
                    <span>{spec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </InView>
      </Container>
    </section>
  );
}
