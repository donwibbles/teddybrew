"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  userEmail?: string | null;
  userName?: string | null;
}

const navLinks = [
  { href: "/communities", label: "Communities" },
  { href: "/events", label: "Events" },
  { href: "/my-events", label: "My Events" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

export function MobileNav({ userEmail, userName }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu function for link clicks
  const closeMenu = () => setIsOpen(false);

  // Prevent scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-neutral-600 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-out drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-200">
            <span className="font-semibold text-lg text-primary-600">Menu</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-neutral-600 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg"
              aria-label="Close menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={closeMenu}
                      className={cn(
                        "block px-4 py-3 rounded-lg text-base font-medium transition-colors",
                        isActive
                          ? "bg-primary-50 text-primary-600"
                          : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User info & sign out */}
          <div className="p-4 border-t border-neutral-200">
            <div className="mb-3">
              <p className="text-sm font-medium text-neutral-900 truncate">
                {userName || "User"}
              </p>
              <p className="text-xs text-neutral-500 truncate">{userEmail}</p>
            </div>
            <SignOutButton className="w-full px-4 py-2.5 text-sm font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
}
