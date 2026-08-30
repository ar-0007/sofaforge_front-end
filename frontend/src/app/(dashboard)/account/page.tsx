import type { Metadata } from "next";
import Page from "@/views/Account";

export const metadata: Metadata = {
  title: "Your account",
  description: "Manage your Sofa Co. orders, saved configurations and details.",
  alternates: { canonical: "/account" },
};

export default Page;
