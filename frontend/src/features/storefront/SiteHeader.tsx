"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Container } from "@/features/storefront/primitives";
import { NAV_LINKS } from "@/features/storefront/content";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";

/**
 * Storefront header.
 *
 * Sits transparent over the hero image on load and picks up a cream, blurred
 * ground once the page scrolls past the fold's first inch. The two states also
 * swap the text colour — white over photography, ink over cream — so the nav
 * stays readable either way.
 */
/**
 * The nav no longer carries a "/" entry — the logo covers home — so the root
 * path only ever matches exactly, and every other link matches its subtree.
 */
function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { totalItems, setOpen } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The mobile panel is a peer of the page, not of the route — close it whenever
  // navigation lands somewhere new.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Once the panel is open it owns the cream ground, so treat it like the
  // scrolled state for colour purposes.
  const solid = scrolled || menuOpen;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        solid ? "border-b border-sand-300 bg-sand-50/85 backdrop-blur" : "border-b border-transparent"
      )}
    >
      <Container className="flex h-[72px] items-center justify-between gap-6 lg:h-20">
        <Link href="/" aria-label="Sofa Co. — home" className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-8 lg:gap-10">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative inline-block py-1 text-[13px] tracking-[0.02em] transition-colors",
                      active ? "text-clay-500" : "text-ink-700 hover:text-clay-500"
                    )}
                  >
                    {link.label}
                    <span
                      className={cn(
                        "absolute -bottom-0.5 left-0 h-px w-full origin-left transition-transform duration-300",
                        "bg-clay-500",
                        active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2 text-ink-700">
          <Link
            href="/shop"
            aria-label="Search products"
            className={iconButton()}
          >
            <Search size={18} strokeWidth={1.6} />
          </Link>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={totalItems > 0 ? `Open cart, ${totalItems} items` : "Open cart"}
            className={cn(iconButton(), "relative")}
          >
            <ShoppingBag size={18} strokeWidth={1.6} />
            {totalItems > 0 ? (
              <span className="absolute right-0.5 top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-clay-500 px-1 text-[10px] font-semibold leading-none text-white">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            ) : null}
          </button>

          <Link
            href={isAuthenticated ? "/account" : "/login"}
            aria-label={isAuthenticated ? "Your account" : "Sign in"}
            className={cn(iconButton(), "hidden sm:grid")}
          >
            <User size={18} strokeWidth={1.6} />
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="site-header-mobile-nav"
            className={cn(iconButton(), "md:hidden")}
          >
            {menuOpen ? <X size={19} strokeWidth={1.6} /> : <Menu size={19} strokeWidth={1.6} />}
          </button>
        </div>
      </Container>

      <AnimatePresence initial={false}>
        {menuOpen ? (
          <motion.div
            id="site-header-mobile-nav"
            key="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-sand-300 bg-sand-50 md:hidden"
          >
            <nav aria-label="Mobile">
              <Container className="py-2">
                <ul>
                  {NAV_LINKS.map((link) => {
                    const active = isActive(pathname, link.href);
                    return (
                      <li key={link.href} className="border-b border-sand-200 last:border-b-0">
                        <Link
                          href={link.href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            "flex items-center justify-between py-4 text-sm transition-colors",
                            active ? "text-clay-500" : "text-ink-700 hover:text-clay-500"
                          )}
                        >
                          {link.label}
                          <ChevronRight size={16} strokeWidth={1.6} className="text-ink-400" />
                        </Link>
                      </li>
                    );
                  })}
                  <li className="border-t border-sand-200 sm:hidden">
                    <Link
                      href={isAuthenticated ? "/account" : "/login"}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-between py-4 text-sm text-ink-700 transition-colors hover:text-clay-500"
                    >
                      {isAuthenticated ? "Your account" : "Sign in"}
                      <ChevronRight size={16} strokeWidth={1.6} className="text-ink-400" />
                    </Link>
                  </li>
                </ul>
              </Container>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function iconButton() {
  return cn(
    "grid h-10 w-10 place-items-center rounded-full transition-colors",
    "text-ink-700 hover:bg-sand-200 hover:text-clay-500"
  );
}
