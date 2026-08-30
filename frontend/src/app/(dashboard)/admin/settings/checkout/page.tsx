import type { Metadata } from "next";
import Settings from "@/features/admin/screens/Settings";

export const metadata: Metadata = {
  title: "Checkout & shipping",
  description: "Currency, tax and shipping rules.",
};

export default function Page() {
  return <Settings group="checkout" />;
}
