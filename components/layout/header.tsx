"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";

interface HeaderProps {
  userEmail?: string | null;
  userName?: string | null;
}

const navLinks = [
  { href: "/", label: "Dashboard" },
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
          <Link href="/" className="font-semibold text-xl text-primary-600">
            Hive Community
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

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

          {/* User menu */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-600 hidden sm:inline">
              {userName || userEmail}
            </span>
            <SignOutButton className="px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors" />
          </div>
        </div>
      </div>
    </header>
  );
}
