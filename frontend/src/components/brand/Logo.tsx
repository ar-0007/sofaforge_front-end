import { cn } from "@/lib/utils";

/**
 * Sofa Co. mark — a terracotta square holding an abstract sofa silhouette:
 * a low seat with two arms, drawn with a single rounded cutout. Reads clearly
 * at 20px in the header and scales cleanly to a favicon.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Sofa Co."
      className={cn("h-7 w-7", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-clay-500" />
      {/* backrest */}
      <rect x="8" y="10" width="16" height="6" rx="3" className="fill-sand-50" />
      {/* seat */}
      <rect x="6.5" y="15" width="19" height="5.5" rx="2.75" className="fill-sand-50" />
      {/* arms */}
      <rect x="5" y="14" width="3.5" height="7" rx="1.75" className="fill-sand-50" />
      <rect x="23.5" y="14" width="3.5" height="7" rx="1.75" className="fill-sand-50" />
      {/* legs */}
      <rect x="7.5" y="21" width="2" height="2.5" rx="1" className="fill-sand-50/70" />
      <rect x="22.5" y="21" width="2" height="2.5" rx="1" className="fill-sand-50/70" />
    </svg>
  );
}

export function Logo({
  className,
  wordmarkClassName,
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span
        className={cn(
          "font-display text-[22px] font-semibold leading-none tracking-[-0.02em] text-ink-900",
          wordmarkClassName
        )}
      >
        Sofa Co<span className="text-clay-500">.</span>
      </span>
    </span>
  );
}
