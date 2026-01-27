"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";

interface Community {
  id: string;
  slug: string;
  name: string;
}

interface EventFiltersProps {
  communities: Community[];
  basePath?: string;
}

export function EventFilters({ communities, basePath = "/events" }: EventFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [community, setCommunity] = useState(searchParams.get("community") || "");
  const [showPast, setShowPast] = useState(searchParams.get("showPast") === "true");

  const updateFilters = useCallback(
    (newParams: { q?: string; community?: string; showPast?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newParams.q !== undefined) {
        if (newParams.q) {
          params.set("q", newParams.q);
        } else {
          params.delete("q");
        }
      }

      if (newParams.community !== undefined) {
        if (newParams.community) {
          params.set("community", newParams.community);
        } else {
          params.delete("community");
        }
      }

      if (newParams.showPast !== undefined) {
        if (newParams.showPast) {
          params.set("showPast", "true");
        } else {
          params.delete("showPast");
        }
      }

      router.push(`${basePath}?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: query });
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events..."
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </form>

        {/* Community Filter */}
        <select
          value={community}
          onChange={(e) => {
            setCommunity(e.target.value);
            updateFilters({ community: e.target.value });
          }}
          className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-900 bg-white
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">All Communities</option>
          {communities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Past Events Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showPast}
            onChange={(e) => {
              setShowPast(e.target.checked);
              updateFilters({ showPast: e.target.checked });
            }}
            className="w-4 h-4 text-primary-500 border-neutral-300 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-neutral-700 whitespace-nowrap">
            Show past events
          </span>
        </label>
      </div>
    </div>
  );
}
