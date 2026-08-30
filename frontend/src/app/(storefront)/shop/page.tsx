import type { Metadata } from "next";
import { Suspense } from "react";
import Shop from "@/views/Shop";

export const metadata: Metadata = {
  title: "Shop the collection",
  description: "Browse handcrafted sofas, chairs and sectionals from Sofa Co. Made to order in Toronto.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage() {
  // Shop reads ?series= via useSearchParams, which Next requires be wrapped.
  return (
    <Suspense fallback={null}>
      <Shop />
    </Suspense>
  );
}
