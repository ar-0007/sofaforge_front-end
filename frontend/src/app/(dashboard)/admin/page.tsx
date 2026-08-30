import type { Metadata } from "next";
import Page from "@/views/AdminPanel";

export const metadata: Metadata = {
  title: "Admin",
  description: "Sofa Co. admin panel.",
  alternates: { canonical: "/admin" },
};

export default Page;
