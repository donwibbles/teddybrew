import { ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getUnreadNotificationCount } from "@/lib/db/notifications";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  // Protect all routes under (app) - redirect unauthenticated users to sign-in
  // Note: Auth check happens here (not middleware) because Auth.js with Prisma
  // adapter requires Node.js runtime, but middleware runs in edge runtime
  if (!session?.user) {
    redirect("/sign-in");
  }

  Sentry.setUser({
    id: session.user.id ?? undefined,
    email: session.user.email ?? undefined,
    username: session.user.name ?? undefined,
  });

  // Fetch unread notification count
  const unreadCount = session.user.id
    ? await getUnreadNotificationCount(session.user.id)
    : 0;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <Header
        userEmail={session.user.email}
        userName={session.user.name}
        userId={session.user.id}
        userImage={session.user.image}
        unreadNotificationCount={unreadCount}
      />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
