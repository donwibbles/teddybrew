import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/db/users";

export default async function ProfileRedirect() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const user = await getUserById(session.user.id);

  if (!user) {
    redirect("/sign-in");
  }

  // If user has no username, redirect to settings to set one up
  if (!user.username) {
    redirect("/settings?setup=username");
  }

  // Redirect to the user's public profile page
  redirect(`/u/${user.username}`);
}
