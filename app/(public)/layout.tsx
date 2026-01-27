import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { PublicHeader } from "@/components/layout/public-header";
import { getUnreadNotificationCount } from "@/lib/db/notifications";

export default async function PublicLayout({ children }: { children: ReactNode }) {
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
        <PublicHeader />
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
