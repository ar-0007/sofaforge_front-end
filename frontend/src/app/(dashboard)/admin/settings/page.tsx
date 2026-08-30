import type { Metadata } from "next";
import Settings from "@/features/admin/screens/Settings";

export const metadata: Metadata = {
  title: "Store details",
  description: "Name, contact routes and social profiles.",
};

export default function Page() {
  return <Settings group="store" />;
}
