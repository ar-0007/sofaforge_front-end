"use client";

import type { LucideIcon } from "lucide-react";
import { Hammer, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { InfiniteSlider } from "@/components/motion-primitives/infinite-slider";
import { Container } from "@/features/storefront/primitives";
import { TRUST } from "@/features/storefront/content";

/**
 * Trust strip: the last objections, answered quietly.
 *
 * Everything above this point sells the piece; this only removes risk, so it
 * stays deliberately flat — no cards, no hover states, hairline dividers and
 * one slow marquee underneath.
 */

const ICONS: Record<string, LucideIcon> = {
  canada: Hammer,
  materials: ShieldCheck,
  returns: RotateCcw,
  delivery: Truck,
};

export function TrustStrip() {
  return (
    <section aria-label="Why buy from us" className="bg-sand-100 pt-16 lg:pt-20">
      <Container>
        <div className="grid gap-y-10 border-y border-sand-300 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-sand-300 lg:py-12">
          {TRUST.items.map((item) => {
            const Icon = ICONS[item.id] ?? ShieldCheck;
            return (
              <div key={item.id} className="px-0 lg:px-8 lg:first:pl-0 lg:last:pr-0">
                <Icon size={20} strokeWidth={1.5} aria-hidden className="text-clay-500" />
                <h3 className="mt-4 text-sm font-medium text-ink-900">{item.label}</h3>
                <p className="mt-1.5 max-w-[26ch] text-sm leading-6 text-ink-500">{item.copy}</p>
              </div>
            );
          })}
        </div>
      </Container>

      {/* Decorative repetition — the same four promises, said again quietly. */}
      <div aria-hidden className="mt-16 overflow-hidden bg-ink-900 py-4 text-sand-100/70 lg:mt-20">
        <InfiniteSlider gap={0} speed={22}>
          {TRUST.marquee.map((line) => (
            <div key={line} className="flex shrink-0 items-center">
              <span className="whitespace-nowrap text-[11px] uppercase tracking-[0.28em]">
                {line}
              </span>
              <span className="px-6 text-[9px] text-clay-500 sm:px-10">◆</span>
            </div>
          ))}
        </InfiniteSlider>
      </div>
    </section>
  );
}
