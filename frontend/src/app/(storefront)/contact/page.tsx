import type { Metadata } from "next";
import Page from "@/views/Contact";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to the Sofa Co. team in Toronto about a piece, a custom configuration, or a trade order.",
  alternates: { canonical: "/contact" },
};

export default Page;
