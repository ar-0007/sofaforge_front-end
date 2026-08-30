import type { Metadata } from "next";
import Collections from "@/features/admin/screens/Collections";

export const metadata: Metadata = {
  title: "Collections",
  description: "Manage catalog collections.",
};

export default function Page() {
  return <Collections />;
}
