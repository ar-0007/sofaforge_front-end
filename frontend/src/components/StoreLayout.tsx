"use client";

import React from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { usePathname } from "next/navigation";
import { CartDrawer } from "@/features/storefront/CartDrawer";
import { SiteFooter } from "@/features/storefront/SiteFooter";
import { SiteHeader } from "@/features/storefront/SiteHeader";

/**
 * Chrome shared by every storefront page: header, bag, footer.
 *
 * The header renders transparent over the hero and only gains a background
 * once scrolled, so pages own their own top spacing — this layout deliberately
 * adds none.
 */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <div className="min-h-screen bg-sand-100 font-sans text-ink-900 antialiased">
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[70] h-0.5 origin-left bg-clay-500"
      />

      <SiteHeader />
      <CartDrawer />

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.28 }}
          className="min-h-[50vh]"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <SiteFooter />
    </div>
  );
}
