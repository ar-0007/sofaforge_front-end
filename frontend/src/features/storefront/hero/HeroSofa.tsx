"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RotateCw } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { CONFIGURATOR, HERO_IMAGE } from "@/features/storefront/content";
import { cn } from "@/lib/utils";
import { createSofaControls, DRAG_SENSITIVITY, type SofaControls } from "./sofaControls";

/**
 * The interactive piece at the centre of the hero.
 *
 * Everything three.js touches is behind this boundary: the scene is a
 * client-only dynamic import, so the ~700 kB renderer never lands in the
 * shared bundle and never runs during SSR. Until it resolves — and for anyone
 * whose browser cannot give us a context — the catalogue photograph stands in,
 * which is also what the crawler and the route test see.
 *
 * The fabric picker is not decoration. It is the same five materials the
 * configurator further down the page offers, so the first thing a visitor
 * touches on the home page is the actual buying decision.
 */

const SofaScene = dynamic(() => import("./SofaScene"), { ssr: false });

const FABRICS = CONFIGURATOR.materials;
type FabricId = (typeof FABRICS)[number]["id"];

export function HeroSofa({ className }: { className?: string }) {
  const [fabricId, setFabricId] = useState<FabricId>("velvet");
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hinted, setHinted] = useState(false);

  const controls = useRef<SofaControls>(createSofaControls());
  const lastX = useRef(0);

  const handleReady = useCallback(() => setReady(true), []);

  // three.js is only loaded once the browser is otherwise idle. The hero has
  // to be readable and clickable long before a 3 MB model finishes arriving.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const track = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const input = controls.current;
    input.x = ((event.clientX - box.left) / box.width) * 2 - 1;
    input.y = ((event.clientY - box.top) / box.height) * 2 - 1;
    input.engaged = true;

    if (dragging) {
      input.spin += (event.clientX - lastX.current) * DRAG_SENSITIVITY;
      lastX.current = event.clientX;
    }
  };

  const active = FABRICS.find((fabric) => fabric.id === fabricId) ?? FABRICS[0];

  return (
    <div className={cn("relative flex h-full w-full flex-col justify-end", className)}>
      <div
        // `pan-y` is the whole reason a horizontal drag can rotate the piece on
        // a phone without stealing the vertical scroll that leaves the hero.
        style={{ touchAction: "pan-y" }}
        className={cn(
          "relative min-h-0 flex-1 select-none",
          dragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onPointerMove={track}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          lastX.current = event.clientX;
          setDragging(true);
          setHinted(true);
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          setDragging(false);
        }}
        onPointerCancel={() => setDragging(false)}
        onPointerLeave={() => {
          controls.current.engaged = false;
          setDragging(false);
        }}
      >
        {/* Stand-in until the renderer has a sofa to show. */}
        <motion.div
          aria-hidden={ready}
          animate={{ opacity: ready ? 0 : 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 grid place-items-center"
        >
          <OptimizedImage
            src={HERO_IMAGE}
            alt="A Stanton II XL sectional in a bright, open living room"
            sizes="(min-width: 1024px) 60vw, 100vw"
            priority
            className="h-full w-full object-contain"
          />
        </motion.div>

        {mounted ? (
          <SofaScene fabricId={fabricId} controls={controls} onReady={handleReady} />
        ) : null}

        {/* Shown once, and only after there is something to turn. */}
        <motion.p
          aria-hidden
          animate={{ opacity: ready && !hinted ? 1 : 0 }}
          transition={{ duration: 0.45 }}
          className="pointer-events-none absolute bottom-1 right-1 flex items-center gap-2 rounded-full bg-ink-900/60 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-sand-50 backdrop-blur-sm"
        >
          <RotateCw size={13} strokeWidth={1.8} aria-hidden />
          Drag to turn it
        </motion.p>
      </div>

      {/* ------------------------------------------------------ fabric picker */}
      <div className="shrink-0 pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="radiogroup"
            aria-label="Upholstery fabric"
            className="flex items-center gap-2"
          >
            {FABRICS.map((fabric) => {
              const selected = fabric.id === fabricId;
              return (
                <button
                  key={fabric.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={fabric.label}
                  title={fabric.label}
                  onClick={() => setFabricId(fabric.id)}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 transition-all duration-300",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500",
                    "focus-visible:ring-offset-2 focus-visible:ring-offset-sand-100",
                    selected
                      ? "scale-110 border-clay-500 shadow-[0_6px_18px_-6px_rgba(217,98,43,0.8)]"
                      : "border-ink-900/15 hover:scale-105 hover:border-ink-900/35"
                  )}
                  style={{ backgroundColor: fabric.swatch }}
                />
              );
            })}
          </div>

          <p className="text-sm text-ink-500">
            <span className="font-medium text-ink-900">{active.label}</span>
            <span className="px-2 text-ink-400">·</span>
            {active.note}
          </p>
        </div>

        {/* CC BY asks for attribution wherever the model is shown. */}
        <p className="mt-3 text-[10px] tracking-wide text-ink-400">
          3D model “Low Poly Sectional Couch” by Stephen White —{" "}
          <a
            href="https://poly.pizza/m/2ntmr7Oka5z"
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-ink-400/40 underline-offset-2 hover:text-ink-700"
          >
            CC BY
          </a>
        </p>
      </div>
    </div>
  );
}
