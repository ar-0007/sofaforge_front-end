import type { Metadata } from "next";
import Marketing from "@/features/admin/screens/Marketing";

export const metadata: Metadata = {
  title: "Pixels & tracking",
  description: "Connect Meta, TikTok and Google tracking.",
};

export default function Page() {
  return <Marketing />;
}
