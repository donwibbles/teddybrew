"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Flame, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ForumSortTabsProps {
  currentSort: "hot" | "new" | "top";
  basePath: string;
}

const sortOptions = [
  { value: "hot", label: "Hot", icon: Flame },
  { value: "new", label: "New", icon: Clock },
  { value: "top", label: "Top", icon: TrendingUp },
] as const;

export function ForumSortTabs({ currentSort, basePath }: ForumSortTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortChange = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === "hot") {
      params.delete("sort");
    } else {
      params.set("sort", sort);
    }
    const queryString = params.toString();
    router.push(`${basePath}${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
      {sortOptions.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => handleSortChange(value)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            currentSort === value
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
