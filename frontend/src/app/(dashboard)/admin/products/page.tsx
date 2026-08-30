import type { Metadata } from "next";
import { Suspense } from "react";
import Products from "@/features/admin/screens/Products";

export const metadata: Metadata = {
  title: "Products",
  description: "Manage the Sofa Co. catalog.",
};

export default function Page() {
  // The screen reads ?new=1 via useSearchParams, which Next requires be wrapped.
  return (
    <Suspense fallback={null}>
      <Products />
    </Suspense>
  );
}
