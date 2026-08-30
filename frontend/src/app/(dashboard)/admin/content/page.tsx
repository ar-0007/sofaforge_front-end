import type { Metadata } from "next";
import Content from "@/features/admin/screens/Content";

export const metadata: Metadata = {
  title: "Storefront content",
  description: "Control hero, featured rows and banners.",
};

export default function Page() {
  return <Content />;
}
