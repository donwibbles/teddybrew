"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExploreCommunityTabsProps {
  communitySlug: string;
}

export function ExploreCommunityTabs({ communitySlug }: ExploreCommunityTabsProps) {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Events",
      href: `/explore/${communitySlug}`,
      icon: Calendar,
      exact: true,
    },
    {
      name: "Forum",
      href: `/explore/${communitySlug}/forum`,
      icon: FileText,
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
