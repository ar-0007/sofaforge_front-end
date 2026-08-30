import type { Metadata } from "next";
import { SwatchRequest as Page } from "@/views/ExperiencePages";

export const metadata: Metadata = {
  title: "Request swatches",
  description: "Order free fabric swatches and feel the material before you commit.",
  alternates: { canonical: "/swatches" },
};

export default Page;
