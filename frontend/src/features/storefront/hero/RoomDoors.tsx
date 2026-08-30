"use client";

import { useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A pair of doors onto the room, opened by scrolling.
 *
 * The catalogue photography is all room scenes and the pitch is "built around
 * your room", so the page opens the way a room does. Nothing here moves on a
 * timer: every value is derived from scroll position, which means the visitor
 * is the one turning the hinges and the doors sit perfectly still if they
 * stop. That is the whole difference between this and the drifting decoration
 * it replaced.
 *
 * The leaves live inside the hero's rounded frame rather than covering the
 * screen — a window onto a room, not a splash screen holding the site hostage.
 */

/**
 * The reveal, as fractions of the pinned scroll distance.
 *
 * `HOLD` gives the closed doors a beat before anything happens, so the first
 * flick of the wheel does not skip the shot. The gap between `SWUNG` and
 * `GONE` is where the leaves dissolve instead of shrinking into the wings.
 */
const HOLD = 0.07;
const SWUNG = 0.52;
const GONE = 0.64;

/** A little past ninety degrees, which is what makes it read as real hinges. */
const SWING = 104;

/* ------------------------------------------------------------- materials -- */

/**
 * Walnut, in three layers: an irregular grain, a broad tonal drift across the
 * leaf, and the timber underneath. The irregular stripe widths matter — evenly
 * spaced ones moiré against the pixel grid and the door turns into corrugated
 * card.
 */
const WALNUT = [
  [
    "repeating-linear-gradient(94deg,",
    "rgba(18,9,3,0.22) 0px, rgba(18,9,3,0.22) 2px,",
    "rgba(255,222,184,0.06) 7px,",
    "rgba(18,9,3,0.10) 16px,",
    "rgba(255,222,184,0.04) 25px,",
    "rgba(18,9,3,0.16) 38px)",
  ].join(" "),
  [
    "linear-gradient(101deg,",
    "rgba(0,0,0,0.42) 0%, rgba(255,206,158,0.10) 26%,",
    "rgba(0,0,0,0.28) 52%, rgba(255,206,158,0.07) 74%,",
    "rgba(0,0,0,0.45) 100%)",
  ].join(" "),
  "linear-gradient(180deg, #613E22 0%, #4B2F19 55%, #35200F 100%)",
].join(", ");

const BRASS = "linear-gradient(180deg, #F8E7BC 0%, #D8B26C 38%, #A5813C 72%, #6E5222 100%)";

export function RoomDoors({ progress }: { progress: MotionValue<number> }) {
  // While the doors are shut they also have to swallow pointer events, or a
  // drag lands on the sofa nobody can see yet.
  const [sealed, setSealed] = useState(true);
  useMotionValueEvent(progress, "change", (value) => setSealed(value < GONE));

  const leftYaw = useTransform(progress, [HOLD, SWUNG], [0, -SWING]);
  const rightYaw = useTransform(progress, [HOLD, SWUNG], [0, SWING]);

  // The leaves also pull back into the frame as they turn, so the opening
  // reads as depth rather than two rectangles rotating on a flat plane.
  const depth = useTransform(progress, [HOLD, SWUNG], [0, -90]);

  const opacity = useTransform(progress, [SWUNG - 0.05, GONE], [1, 0]);
  const blur = useTransform(progress, [SWUNG - 0.02, GONE], [0, 7]);
  const doorFilter = useTransform(blur, (value) => `blur(${value}px)`);

  // The inner face turns away from the light as it opens.
  const shade = useTransform(progress, [HOLD, SWUNG], [0, 0.8]);

  // Warm light through the widening gap, gone by the time the doors are.
  const spillOpacity = useTransform(progress, [HOLD, 0.22, SWUNG], [0, 1, 0]);
  const spillWidth = useTransform(progress, [HOLD, SWUNG], ["3%", "115%"]);

  const cue = useTransform(progress, [0, HOLD], [1, 0]);

  return (
    <motion.div
      aria-hidden
      style={{ opacity, perspective: 1800 }}
      className={cn(
        "absolute inset-0 z-40 overflow-hidden",
        sealed ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      {/* The room's own light, seen through the gap. Behind the leaves. */}
      <motion.div
        style={{
          opacity: spillOpacity,
          width: spillWidth,
          background:
            "radial-gradient(58% 60% at 50% 46%, rgba(255,236,206,0.95), rgba(255,224,180,0.30) 42%, rgba(255,224,180,0) 74%)",
        }}
        className="absolute inset-y-0 left-1/2 -translate-x-1/2"
      />

      <Leaf side="left" yaw={leftYaw} depth={depth} shade={shade} filter={doorFilter} />
      <Leaf side="right" yaw={rightYaw} depth={depth} shade={shade} filter={doorFilter} />

      {/* ------------------------------------------------------------- cue -- */}
      <motion.div
        style={{ opacity: cue }}
        className="absolute inset-0 z-10 flex flex-col items-center justify-between px-6 py-[9%] text-center"
      >
        <p className="font-display max-w-lg text-4xl leading-[1.06] tracking-[-0.03em] text-sand-50 drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)] sm:text-5xl">
          Every sofa starts
          <span className="block">with a room.</span>
        </p>

        <div className="flex flex-col items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-sand-200/80">
            Scroll to open it
          </span>
          {/* The one looping animation on the page, and it is gone the instant
              the visitor does the thing it is asking for. */}
          <motion.span
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="grid h-9 w-9 place-items-center rounded-full border border-sand-100/35 text-sand-100"
          >
            <ChevronDown size={16} strokeWidth={1.8} />
          </motion.span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ leaf -- */

/** One walnut leaf: stiles and rails, two recessed panels, one brass pull. */
function Leaf({
  side,
  yaw,
  depth,
  shade,
  filter,
}: {
  side: "left" | "right";
  yaw: MotionValue<number>;
  depth: MotionValue<number>;
  shade: MotionValue<number>;
  filter: MotionValue<string>;
}) {
  const left = side === "left";

  return (
    <motion.div
      style={{
        rotateY: yaw,
        z: depth,
        filter,
        transformOrigin: left ? "left center" : "right center",
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden",
        background: WALNUT,
        boxShadow: left
          ? // A hard dark edge where the two leaves meet, and a lit outer stile.
            "inset -14px 0 26px -14px rgba(0,0,0,0.95), inset -1px 0 0 rgba(0,0,0,0.9), inset 3px 0 0 rgba(255,216,168,0.14)"
          : "inset 14px 0 26px -14px rgba(0,0,0,0.95), inset 1px 0 0 rgba(0,0,0,0.9), inset -3px 0 0 rgba(255,216,168,0.14)",
      }}
      className={cn(
        "absolute inset-y-0 w-1/2 will-change-transform",
        left ? "left-0" : "right-0"
      )}
    >
      {/* The frame line that separates stiles and rails from the panels. */}
      <div
        className="absolute inset-[5%] rounded-[4px]"
        style={{ boxShadow: "inset 0 0 0 1px rgba(255,222,180,0.09)" }}
      />

      <Panel className="inset-x-[12%] top-[9%] h-[31%]" />
      <Panel className="inset-x-[12%] bottom-[9%] h-[44%]" />

      {/* Brass pull on the meeting edge: backplate, then the bar. */}
      <div
        className={cn(
          "absolute top-[45%] h-36 w-9 -translate-y-1/2 rounded-[14px]",
          left ? "right-3" : "left-3"
        )}
        style={{
          background: "linear-gradient(180deg, rgba(255,224,180,0.10), rgba(0,0,0,0.22))",
          boxShadow:
            "inset 0 1px 0 rgba(255,232,196,0.28), 0 6px 16px -8px rgba(0,0,0,0.8)",
        }}
      />
      <div
        className={cn(
          "absolute top-[45%] h-28 w-3 -translate-y-1/2 rounded-full",
          left ? "right-[30px]" : "left-[30px]"
        )}
        style={{
          background: BRASS,
          boxShadow:
            "0 16px 28px -12px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -1px 0 rgba(0,0,0,0.4)",
        }}
      />

      {/* Light falls off down the leaf, and the whole face darkens as it turns
          out of the room's light. */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-white/[0.07] via-transparent to-black/25"
      />
      <motion.div
        style={{ opacity: shade }}
        className={cn(
          "absolute inset-0",
          left
            ? "bg-gradient-to-r from-transparent via-black/30 to-black/85"
            : "bg-gradient-to-l from-transparent via-black/30 to-black/85"
        )}
      />
    </motion.div>
  );
}

function Panel({ className }: { className: string }) {
  return (
    <div
      className={cn("absolute rounded-[6px]", className)}
      style={{
        background:
          "linear-gradient(163deg, rgba(0,0,0,0.30) 0%, rgba(255,208,158,0.07) 55%, rgba(0,0,0,0.18) 100%)",
        boxShadow: [
          "inset 0 7px 16px rgba(0,0,0,0.62)",
          "inset 0 -6px 14px rgba(255,206,156,0.10)",
          "inset 0 0 0 1px rgba(0,0,0,0.35)",
          "0 1px 0 rgba(255,222,180,0.13)",
        ].join(", "),
      }}
    />
  );
}
