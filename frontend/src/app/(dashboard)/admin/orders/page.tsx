import type { Metadata } from "next";
import Orders from "@/features/admin/screens/Orders";

export const metadata: Metadata = {
  title: "Orders",
  description: "Review and fulfil customer orders.",
};

export default function Page() {
  return <Orders />;
}
