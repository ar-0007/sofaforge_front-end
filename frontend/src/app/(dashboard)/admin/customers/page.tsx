import type { Metadata } from "next";
import Customers from "@/features/admin/screens/Customers";

export const metadata: Metadata = {
  title: "Customers",
  description: "Customer accounts and lifetime spend.",
};

export default function Page() {
  return <Customers />;
}
