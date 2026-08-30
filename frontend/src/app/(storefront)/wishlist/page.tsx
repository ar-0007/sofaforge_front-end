import type { Metadata } from "next";
import { Wishlist as Page } from "@/views/ExperiencePages";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "The Sofa Co. pieces you have saved for later.",
  alternates: { canonical: "/wishlist" },
};

export default Page;
