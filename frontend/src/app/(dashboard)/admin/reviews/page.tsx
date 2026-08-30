import type { Metadata } from "next";
import Reviews from "@/features/admin/screens/Reviews";

export const metadata: Metadata = {
  title: "Reviews",
  description: "Approve or reject product reviews.",
};

export default function Page() {
  return <Reviews />;
}
