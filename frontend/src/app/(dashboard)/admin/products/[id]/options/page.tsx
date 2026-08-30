import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductOptions from "@/features/admin/screens/ProductOptions";

export const metadata: Metadata = {
  title: "Product options",
  description: "Build the configurator a shopper answers on this product.",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  // A non-numeric id can only come from a hand-typed URL; 404 rather than
  // firing a query the backend will reject.
  if (!Number.isInteger(productId) || productId <= 0) notFound();
  return <ProductOptions productId={productId} />;
}
