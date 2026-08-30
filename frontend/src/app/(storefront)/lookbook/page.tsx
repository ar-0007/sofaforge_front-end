import type { Metadata } from "next";
import { Lookbook as Page } from "@/views/StaticPages";

export const metadata: Metadata = {
  title: "Lookbook",
  description: "Sofa Co. pieces photographed in real Canadian homes.",
  alternates: { canonical: "/lookbook" },
};

export default Page;
