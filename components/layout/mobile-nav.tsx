"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Hash, ChevronDown, ChevronRight } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";

interface Channel {
  id: string;
  name: string;
}

interface MobileNavProps {
  userEmail?: string | null;
  userName?: string | null;
}

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/communities", label: "Communities" },
  { href: "/events", label: "Events" },
  { href: "/feed", label: "Feed" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

export function MobileNav({ userEmail, userName }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const drawerRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Check if we're on a chat page
  const chatMatch = pathname.match(/^\/communities\/([^/]+)\/chat$/);
  const isOnChatPage = !!chatMatch;
  const communitySlug = chatMatch?.[1];
  const currentChannelId = searchParams.get("channel");

  // Close menu function for link clicks
  const closeMenu = () => setIsOpen(false);

  // Fetch channels when on chat page and menu opens
  useEffect(() => {
    if (isOpen && isOnChatPage && communitySlug && channels.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch channels on menu open
      setIsLoadingChannels(true);
      fetch(`/api/communities/${communitySlug}/channels`)
        .then((res) => res.json())
        .then((data) => {
          if (data.channels) {
            setChannels(data.channels);
          }
        })
        .catch((err) => {
          console.error("Failed to load channels:", err);
        })
        .finally(() => {
          setIsLoadingChannels(false);
        });
    }
  }, [isOpen, isOnChatPage, communitySlug, channels.length]);

  // Reset channels when leaving chat page
  useEffect(() => {
    if (!isOnChatPage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset state on page change
      setChannels([]);
    }
  }, [isOnChatPage]);

  // Prevent scroll when menu is open and handle keyboard events
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Focus the close button when drawer opens
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle Escape key and focus trap
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === "Escape") {
        setIsOpen(false);
        openButtonRef.current?.focus();
        return;
      }

      // Focus trap - keep focus within the drawer
      if (event.key === "Tab" && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleChannelSelect = (channelId: string) => {
    router.push(`/communities/${communitySlug}/chat?channel=${channelId}`);
    closeMenu();
  };

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        ref={openButtonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-neutral-600 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-drawer"
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
        ref={drawerRef}
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
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
              ref={closeButtonRef}
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
            {/* Chat Channels Section - Only show on chat page */}
            {isOnChatPage && (
              <div className="mb-4">
                <button
                  onClick={() => setChannelsExpanded(!channelsExpanded)}
                  className="flex items-center justify-between w-full px-4 py-2 text-sm font-semibold text-neutral-500 uppercase tracking-wider"
                >
                  <span>Channels</span>
                  {channelsExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {channelsExpanded && (
                  <ul className="space-y-1">
                    {isLoadingChannels ? (
                      <li className="px-4 py-2 text-sm text-neutral-400">
                        Loading channels...
                      </li>
                    ) : channels.length === 0 ? (
                      <li className="px-4 py-2 text-sm text-neutral-400">
                        No channels available
                      </li>
                    ) : (
                      channels.map((channel) => (
                        <li key={channel.id}>
                          <button
                            onClick={() => handleChannelSelect(channel.id)}
                            className={cn(
                              "flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                              currentChannelId === channel.id
                                ? "bg-primary-50 text-primary-600"
                                : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                            )}
                          >
                            <Hash className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{channel.name}</span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
                <div className="my-3 border-t border-neutral-200" />
              </div>
            )}

            {/* Main Navigation */}
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
