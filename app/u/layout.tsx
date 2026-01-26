import { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { getUnreadNotificationCount } from "@/lib/db/notifications";

export default async function PublicProfileLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  // Fetch unread count for authenticated users
  const unreadCount = session?.user?.id
    ? await getUnreadNotificationCount(session.user.id)
    : 0;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {session?.user ? (
        <Header
          userEmail={session.user.email}
          userName={session.user.name}
          userId={session.user.id}
          unreadNotificationCount={unreadCount}
        />
      ) : (
        <header className="bg-white border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="font-semibold text-xl text-primary-600">
                Hive Community
              </Link>

              {/* Auth Actions */}
              <div className="flex items-center gap-4">
                <Link
                  href="/sign-in"
                  className="text-sm text-neutral-600 hover:text-primary-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-in"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
