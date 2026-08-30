import type { Metadata } from "next";
import CustomStudio from "@/features/admin/screens/CustomStudio";

export const metadata: Metadata = {
  title: "Custom Studio",
  description: "The steps a shopper walks through to design a piece from scratch.",
  alternates: { canonical: "/admin/custom-studio" },
};

export default function Page() {
  return <CustomStudio />;
}
