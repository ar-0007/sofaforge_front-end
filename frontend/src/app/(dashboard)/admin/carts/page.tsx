import type { Metadata } from "next";
import Carts from "@/features/admin/screens/Carts";

export const metadata: Metadata = {
  title: "Carts",
  description: "Open and abandoned shopping carts.",
};

export default function Page() {
  return <Carts />;
}
