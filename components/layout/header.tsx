"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { cn } from "@/lib/utils";

interface HeaderProps {
  userEmail?: string | null;
  userName?: string | null;
}

const navLinks = [
  { href: "/communities", label: "Communities" },
  { href: "/events", label: "Events" },
  { href: "/my-events", label: "My Events" },
  { href: "/profile", label: "Profile" },
];

export function Header({ userEmail, userName }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/communities" className="font-semibold text-xl text-primary-600">
            Hive Community
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "text-primary-600 bg-primary-50"
                      : "text-neutral-600 hover:text-primary-600 hover:bg-neutral-50"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User menu - desktop */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/settings"
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
              aria-label="Settings"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <span className="text-sm text-neutral-600">
              {userName || userEmail}
            </span>
            <SignOutButton className="px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors" />
          </div>

          {/* Mobile nav */}
          <MobileNav userEmail={userEmail} userName={userName} />
        </div>
      </div>
    </header>
  );
}
