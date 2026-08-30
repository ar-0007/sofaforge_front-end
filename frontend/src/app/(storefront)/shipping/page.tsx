import type { Metadata } from "next";
import { ShippingReturns as Page } from "@/views/StaticPages";

export const metadata: Metadata = {
  title: "Shipping & Returns",
  description: "Delivery timelines, white-glove options and the Sofa Co. returns policy.",
  alternates: { canonical: "/shipping" },
};

export default Page;
