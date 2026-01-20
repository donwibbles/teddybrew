import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  // Double-check authentication (middleware should handle this, but be safe)
  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/communities" className="font-semibold text-xl text-zinc-900">
              Hive Community
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/communities"
                className="text-zinc-600 hover:text-zinc-900 text-sm font-medium"
              >
                Communities
              </Link>
              <Link
                href="/events"
                className="text-zinc-600 hover:text-zinc-900 text-sm font-medium"
              >
                Events
              </Link>
            </nav>

            {/* User menu */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-600">
                {session.user.email}
              </span>
              <SignOutButton
                className="px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
