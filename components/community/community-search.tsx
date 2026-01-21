"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";

interface CommunitySearchProps {
  initialQuery: string;
  initialType: string;
}

export function CommunitySearch({
  initialQuery,
  initialType,
}: CommunitySearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState(initialType);

  const updateSearchParams = useCallback(
    (newQuery: string, newType: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newQuery) {
        params.set("q", newQuery);
      } else {
        params.delete("q");
      }

      if (newType && newType !== "ALL") {
        params.set("type", newType);
      } else {
        params.delete("type");
      }

      startTransition(() => {
        router.push(`/communities?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const debouncedSearch = useDebouncedCallback((value: string) => {
    updateSearchParams(value, typeFilter);
  }, 300);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTypeFilter(value);
    updateSearchParams(query, value);
  };

  const handleClear = () => {
    setQuery("");
    setTypeFilter("ALL");
    startTransition(() => {
      router.push("/communities");
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search input */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isPending ? (
            <svg
              className="animate-spin h-5 w-5 text-neutral-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search communities..."
          className="block w-full pl-10 pr-10 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Type filter */}
      <select
        value={typeFilter}
        onChange={handleTypeChange}
        className="px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 bg-white
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                   min-w-[140px]"
      >
        <option value="ALL">All Types</option>
        <option value="PUBLIC">Public</option>
        <option value="PRIVATE">Private</option>
      </select>
    </div>
  );
}
