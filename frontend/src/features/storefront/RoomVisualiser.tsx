"use client";

import Link from "next/link";
import { ArrowRight, MoveHorizontal } from "lucide-react";
import { InView } from "@/components/motion-primitives/in-view";
import {
  ImageComparison,
  ImageComparisonImage,
  ImageComparisonSlider,
} from "@/components/motion-primitives/image-comparison";
import { Container, Eyebrow } from "@/features/storefront/primitives";
import { ROOM_VISUALISER } from "@/features/storefront/content";
import { cn } from "@/lib/utils";

/**
 * Room visualiser: the reassurance beat of the home page.
 *
 * A dark band between two cream sections so the page's one genuinely rare
 * feature reads as the centrepiece. The right column demonstrates rather than
 * describes — the visitor drags the room photo away and watches the piece
 * appear in it, which is the whole promise in one gesture.
 */

const rise = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0 },
};

/** Small corner caption over the comparison frame. */
function FrameLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute z-20 rounded-full bg-ink-900/70 px-3 py-1.5",
        "text-[10px] font-semibold uppercase tracking-[0.18em] text-sand-50 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </span>
  );
}

export function RoomVisualiser() {
  return (
    // An inset dark card rather than a full-width band, so the sticky header
    // never lands on a hard black edge.
    <section
      id="room-visualiser"
      aria-labelledby="room-visualiser-heading"
      className="bg-sand-100 px-4 py-6 sm:px-6 lg:px-6 lg:py-10"
    >
      <div className="overflow-hidden rounded-[28px] bg-ink-900 py-16 text-sand-100 lg:py-24">
      <Container>
        <InView
          variants={rise}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          viewOptions={{ once: true, amount: 0.25 }}
          once
        >
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
            {/* ---------------------------------------------------- the pitch */}
            <div>
              <Eyebrow className="text-clay-400">{ROOM_VISUALISER.eyebrow}</Eyebrow>

              <h2
                id="room-visualiser-heading"
                className="font-display mt-5 text-4xl leading-[1.03] tracking-[-0.03em] text-sand-50 lg:text-5xl"
              >
                {ROOM_VISUALISER.title.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h2>

              <p className="mt-6 max-w-[30rem] text-[15px] leading-7 text-sand-100/65">
                {ROOM_VISUALISER.blurb}
              </p>

              <ol className="mt-10 max-w-[30rem] border-t border-sand-100/12">
                {ROOM_VISUALISER.steps.map((item) => (
                  <li
                    key={item.step}
                    className="flex gap-5 border-b border-sand-100/12 py-5 sm:gap-6"
                  >
                    <span
                      aria-hidden="true"
                      className="font-display text-2xl leading-none text-clay-400 sm:text-[1.7rem]"
                    >
                      {item.step}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium leading-6 text-sand-50">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-sand-100/55">{item.copy}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <Link
                href={ROOM_VISUALISER.cta.href}
                className={cn(
                  "mt-9 inline-flex items-center gap-2.5 rounded-full bg-clay-500 px-7 py-3.5",
                  "text-sm font-semibold text-white transition-colors hover:bg-clay-600",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                  "focus-visible:outline-clay-400"
                )}
              >
                {ROOM_VISUALISER.cta.label}
                <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
              </Link>
            </div>

            {/* -------------------------------------------- the demonstration */}
            <div>
              <ImageComparison
                /* pan-y keeps the page scrollable on touch while horizontal
                   drags still reach the slider. */
                className="aspect-[4/3] w-full touch-pan-y rounded-2xl ring-1 ring-sand-100/10"
                springOptions={{ bounce: 0, duration: 0 }}
              >
                <ImageComparisonImage
                  src={ROOM_VISUALISER.beforeImage}
                  alt="An empty living room photographed on a phone, before the sofa is placed"
                  position="left"
                />
                <ImageComparisonImage
                  src={ROOM_VISUALISER.afterImage}
                  alt="The same living room with a made-to-order Sofa Co. sectional rendered into it"
                  position="right"
                />

                <FrameLabel className="left-4 top-4">{ROOM_VISUALISER.beforeLabel}</FrameLabel>
                <FrameLabel className="right-4 top-4">{ROOM_VISUALISER.afterLabel}</FrameLabel>

                <ImageComparisonSlider className="w-0.5 bg-sand-50/80">
                  <div
                    aria-hidden="true"
                    className={cn(
                      "absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2",
                      "place-items-center rounded-full bg-sand-50 text-ink-900 shadow-lg"
                    )}
                  >
                    <MoveHorizontal size={17} strokeWidth={1.8} />
                  </div>
                </ImageComparisonSlider>
              </ImageComparison>

              <p className="mt-4 text-xs leading-5 text-sand-100/60">
                Drag the handle to compare · JPG, PNG or WEBP · max 10MB
              </p>
            </div>
          </div>
        </InView>
      </Container>
      </div>
    </section>
  );
}
