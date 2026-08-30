import type { Metadata } from "next";
import ConsentBanner from "@/lib/analytics/ConsentBanner";
import { TrackingProvider } from "@/lib/analytics/tracker";

// Public storefront: crawlable.
export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

/**
 * Tracking is mounted here rather than in the root layout so it covers the shop
 * and nothing else — the admin and account screens are not a shopper journey
 * and must never fire an ad platform pixel.
 */
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <TrackingProvider>
      {children}
      <ConsentBanner />
    </TrackingProvider>
  );
}
