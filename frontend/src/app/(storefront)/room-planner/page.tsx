import type { Metadata } from "next";
import { RoomPlanner as Page } from "@/views/ExperiencePages";

export const metadata: Metadata = {
  title: "Room Planner",
  description: "Plan your room with Sofa Co. — a few gentle principles for a considered, comfortable space.",
  alternates: { canonical: "/room-planner" },
};

export default Page;
