import { redirect } from "next/navigation";

/**
 * The old combined operations screen is now two: destructive actions live in
 * Tools, reminder drafting in Marketing -> Customer reminders. Bookmarks and
 * old links land on the danger zone.
 */
export default function Page() {
  redirect("/admin/tools");
}
