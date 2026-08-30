"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useTracking } from "@/lib/analytics/tracker";
import { trpc } from "@/lib/trpc";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Container, Eyebrow } from "@/features/storefront/primitives";
import { CONTACT } from "@/features/storefront/content";

const FOOTER_COLUMNS = [
  {
    heading: "Explore",
    links: [
      { href: "/shop", label: "Shop all" },
      { href: "/custom-studio", label: "Custom studio" },
      { href: "/lookbook", label: "Lookbook" },
      { href: "/room-planner", label: "Room planner" },
    ],
  },
  {
    heading: "About",
    links: [
      { href: "/our-story", label: "Our story" },
      { href: "/craftsmanship", label: "Craftsmanship" },
      { href: "/sustainability", label: "Sustainability" },
    ],
  },
  {
    heading: "Support",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/swatches", label: "Order swatches" },
      { href: "/shipping", label: "Shipping & returns" },
      { href: "/care-guide", label: "Care guide" },
    ],
  },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const { track } = useTracking();
  const subscribeMutation = trpc.commerce.subscribeNewsletter.useMutation();

  const handleSubscribe = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;
    try {
      await subscribeMutation.mutateAsync({ email });
      toast.success("Welcome to the design list", {
        description: "We will keep you close to what is new.",
      });
      track("sign_up", { contentName: "Newsletter" });
      setEmail("");
    } catch {
      toast.error("Subscription failed", { description: "Please try again in a moment." });
    }
  };

  return (
    <footer className="bg-ink-900 text-sand-100">
      <Container className="py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <Logo wordmarkClassName="text-sand-50" />
            <p className="mt-6 max-w-sm text-sm leading-7 text-sand-100/60">
              Made-to-order sofas and seating, cut and stitched by hand in Canada. Every frame is
              built to your room, your fabric, and your measurements — then finished to last decades
              rather than seasons.
            </p>
            <address className="mt-7 space-y-1 text-sm not-italic text-sand-100/60">
              <span className="block">{CONTACT.address.oneLine}</span>
              <a href={CONTACT.phone.href} className="block transition-colors hover:text-sand-50">
                {CONTACT.phone.label}
              </a>
            </address>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-7">
            {FOOTER_COLUMNS.map((column) => (
              <nav key={column.heading} aria-label={column.heading}>
                <Eyebrow>{column.heading}</Eyebrow>
                <ul className="mt-5 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-sand-100/60 transition-colors hover:text-sand-50"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-6 border-t border-sand-100/12 pt-10 lg:grid-cols-12 lg:items-center lg:gap-10">
          <div className="lg:col-span-5">
            <h2 className="font-display text-2xl leading-snug text-sand-50">
              New pieces, twice a season.
            </h2>
            <p className="mt-2 text-sm leading-6 text-sand-100/60">
              Studio notes, fabric drops, and first look at new collections.
            </p>
          </div>

          <form
            onSubmit={handleSubscribe}
            className="flex flex-col gap-3 sm:flex-row lg:col-span-7 lg:justify-end"
          >
            <label htmlFor="footer-newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="footer-newsletter-email"
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="h-12 w-full rounded-none border border-sand-100/20 bg-transparent px-4 text-sm text-sand-50 placeholder:text-sand-100/35 focus:border-clay-500 focus:outline-none sm:max-w-xs"
            />
            <button
              type="submit"
              disabled={subscribeMutation.isPending}
              aria-busy={subscribeMutation.isPending}
              className="inline-flex h-12 items-center justify-center gap-2 bg-clay-500 px-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-clay-600 disabled:cursor-wait disabled:opacity-60"
            >
              {subscribeMutation.isPending ? "Joining…" : "Subscribe"}
              <ArrowRight size={15} strokeWidth={1.8} />
            </button>
          </form>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-sand-100/12 pt-7 text-xs text-sand-100/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Sofa Co.</p>
          <p>Handmade in Canada · Free delivery across Ontario</p>
        </div>
      </Container>
    </footer>
  );
}
