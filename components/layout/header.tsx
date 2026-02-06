"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UserDropdown } from "@/components/layout/user-dropdown";
import { cn } from "@/lib/utils";

interface HeaderProps {
  userEmail?: string | null;
  userName?: string | null;
  userId?: string | null;
  userImage?: string | null;
  unreadNotificationCount?: number;
}

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/communities", label: "Communities" },
  { href: "/events", label: "Events" },
  { href: "/feed", label: "Feed" },
];

export function Header({ userEmail, userName, userId, userImage, unreadNotificationCount = 0 }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="font-semibold text-xl text-primary-600"
            aria-label="Hive Community - Go to dashboard"
          >
            Hive Community
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "text-primary-600 bg-primary-subtle"
                      : "text-foreground-muted hover:text-primary-600 hover:bg-background-hover"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User menu - desktop */}
          <div className="hidden md:flex items-center gap-3">
            {userId && (
              <NotificationBell
                userId={userId}
                initialUnreadCount={unreadNotificationCount}
              />
            )}
            <UserDropdown
              userName={userName ?? null}
              userEmail={userEmail ?? null}
              userImage={userImage}
            />
          </div>

          {/* Mobile nav */}
          <MobileNav userEmail={userEmail} userName={userName} />
        </div>
      </div>
    </header>
  );
}
