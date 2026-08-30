import type { Metadata } from "next";
import { Sustainability as Page } from "@/views/StaticPages";

export const metadata: Metadata = {
  title: "Sustainability",
  description: "Responsibly sourced materials and made-to-order production that avoids overstock waste.",
  alternates: { canonical: "/sustainability" },
};

export default Page;
