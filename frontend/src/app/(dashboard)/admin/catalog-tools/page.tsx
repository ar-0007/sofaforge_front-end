import type { Metadata } from "next";
import CatalogTools from "@/features/admin/screens/CatalogTools";

export const metadata: Metadata = {
  title: "Variants & media",
  description: "Product variants and gallery images.",
};

export default function Page() {
  return <CatalogTools />;
}
