import type { Metadata } from "next";
import Inquiries from "@/features/admin/screens/Inquiries";

export const metadata: Metadata = {
  title: "Inquiries",
  description: "Messages from the storefront contact form.",
};

export default function Page() {
  return <Inquiries />;
}
