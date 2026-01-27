import { redirect } from "next/navigation";

export const metadata = {
  title: "My Events - Hive Community",
  description: "View events you're attending or organizing",
};

export default function MyEventsPage() {
  // Redirect to the new my-communities page
  redirect("/my-communities");
}
