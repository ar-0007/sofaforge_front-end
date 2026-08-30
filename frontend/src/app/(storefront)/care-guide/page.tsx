import type { Metadata } from "next";
import { CareGuide as Page } from "@/views/StaticPages";

export const metadata: Metadata = {
  title: "Care Guide",
  description: "How to clean, rotate and care for your Sofa Co. upholstery so it ages well.",
  alternates: { canonical: "/care-guide" },
};

export default Page;
