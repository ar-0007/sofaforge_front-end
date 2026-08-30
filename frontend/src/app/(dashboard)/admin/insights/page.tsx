import type { Metadata } from "next";
import Insights from "@/features/admin/screens/Insights";

export const metadata: Metadata = {
  title: "Insights",
  description: "First-party storefront analytics.",
};

export default function Page() {
  return <Insights />;
}
