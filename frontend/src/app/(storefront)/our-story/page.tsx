import type { Metadata } from "next";
import { OurStory as Page } from "@/views/StaticPages";

export const metadata: Metadata = {
  title: "Our Story",
  description: "Sofa Co. has been building made-to-order furniture in Toronto since 2024. This is why.",
  alternates: { canonical: "/our-story" },
};

export default Page;
