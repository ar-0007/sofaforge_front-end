import type { Metadata } from "next";
import Reminders from "@/features/admin/screens/Reminders";

export const metadata: Metadata = {
  title: "Customer reminders",
  description: "Prepare consent-confirmed reminder drafts.",
};

export default function Page() {
  return <Reminders />;
}
