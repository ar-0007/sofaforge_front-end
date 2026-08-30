import type { Metadata } from "next";
import Settings from "@/features/admin/screens/Settings";

export const metadata: Metadata = {
  title: "Advanced",
  description: "Site verification and maintenance mode.",
};

export default function Page() {
  return <Settings group="advanced" />;
}
