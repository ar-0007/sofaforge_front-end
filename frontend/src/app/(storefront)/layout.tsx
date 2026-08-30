import type { Metadata } from "next";

// Public storefront: crawlable.
export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
