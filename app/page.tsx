import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();

  // Redirect authenticated users to the dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background-muted flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 py-16 md:py-24 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
          Build. Organize. Win.
        </h1>
        <p className="text-lg md:text-xl text-foreground-muted mt-6 max-w-xl mx-auto">
          A community platform by organizers, for organizers.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link
            href="/explore"
            className="bg-primary-subtle0 hover:bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold shadow-md transition-colors"
          >
            Explore
          </Link>
          <Link
            href="/sign-in"
            className="bg-card hover:bg-background-hover text-foreground px-8 py-3 rounded-lg font-semibold border-2 border-border transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
