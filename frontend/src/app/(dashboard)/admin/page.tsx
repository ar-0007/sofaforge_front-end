import type { Metadata } from "next";
import Dashboard from "@/features/admin/screens/Dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Sofa Co. store admin.",
  alternates: { canonical: "/admin" },
};

export default function Page() {
  return <Dashboard />;
}
