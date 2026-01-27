"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, MessageSquare, FileText, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommunityTabsProps {
  communitySlug: string;
  isMember: boolean;
}

export function CommunityTabs({ communitySlug, isMember }: CommunityTabsProps) {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Events",
      href: `/communities/${communitySlug}`,
      icon: Calendar,
      exact: true,
    },
    {
      name: "Chat",
      href: `/communities/${communitySlug}/chat`,
      icon: MessageSquare,
      requiresMember: true,
    },
    {
      name: "Forum",
      href: `/communities/${communitySlug}/forum`,
      icon: FileText,
    },
    {
      name: "Docs",
      href: `/communities/${communitySlug}/docs`,
      icon: BookOpen,
    },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="bg-white border-b border-neutral-200">
      <nav className="flex gap-1 px-1 overflow-x-auto overflow-y-hidden scrollbar-hide" style={{ touchAction: "pan-x" }} aria-label="Community navigation">
        {tabs.map((tab) => {
          // Hide chat tab for non-members
          if (tab.requiresMember && !isMember) {
            return null;
          }

          const active = isActive(tab.href, tab.exact);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex-shrink-0",
                active
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
