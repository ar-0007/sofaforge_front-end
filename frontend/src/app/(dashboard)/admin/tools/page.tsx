import type { Metadata } from "next";
import Tools from "@/features/admin/screens/Tools";

export const metadata: Metadata = {
  title: "Danger zone",
  description: "Permanent deletions, behind a confirmation.",
};

export default function Page() {
  return <Tools />;
}
