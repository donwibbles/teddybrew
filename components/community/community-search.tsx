"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useCallback, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useKeyboardShortcut, useSearchShortcut } from "@/hooks/use-keyboard-shortcut";
import { US_STATES } from "@/lib/constants/us-states";
import { CollapsibleFilters } from "@/components/ui/collapsible-filters";

interface CommunitySearchProps {
  initialQuery: string;
  initialSize?: string;
  initialSort?: string;
  initialState?: string;
  initialVirtual?: boolean;
}

export function CommunitySearch({
  initialQuery,
  initialSize = "all",
  initialSort = "recent",
  initialState = "",
  initialVirtual = false,
}: CommunitySearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(initialQuery);
  const [sizeFilter, setSizeFilter] = useState(initialSize);
  const [sortBy, setSortBy] = useState(initialSort);
  const [stateFilter, setStateFilter] = useState(initialState);
  const [virtualOnly, setVirtualOnly] = useState(initialVirtual);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts: Cmd+K or "/" to focus search
  const focusSearch = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useKeyboardShortcut({
    key: "k",
    metaKey: true,
    callback: focusSearch,
  });

  useSearchShortcut(focusSearch);

  const updateSearchParams = useCallback(
    (newQuery: string, newSize: string, newSort: string, newState: string, newVirtual: boolean) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newQuery) {
        params.set("q", newQuery);
      } else {
        params.delete("q");
      }

      if (newSize && newSize !== "all") {
        params.set("size", newSize);
      } else {
        params.delete("size");
      }

      if (newSort && newSort !== "recent") {
        params.set("sort", newSort);
      } else {
        params.delete("sort");
      }

      if (newState) {
        params.set("state", newState);
      } else {
        params.delete("state");
      }

      if (newVirtual) {
        params.set("virtual", "true");
      } else {
        params.delete("virtual");
      }

      startTransition(() => {
        router.push(`/communities?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const debouncedSearch = useDebouncedCallback((value: string) => {
    updateSearchParams(value, sizeFilter, sortBy, stateFilter, virtualOnly);
  }, 300);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSizeFilter(value);
    updateSearchParams(query, value, sortBy, stateFilter, virtualOnly);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSortBy(value);
    updateSearchParams(query, sizeFilter, value, stateFilter, virtualOnly);
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setStateFilter(value);
    updateSearchParams(query, sizeFilter, sortBy, value, virtualOnly);
  };

  const handleVirtualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.checked;
    setVirtualOnly(value);
    updateSearchParams(query, sizeFilter, sortBy, stateFilter, value);
  };

  const handleClear = () => {
    setQuery("");
    setSizeFilter("all");
    setSortBy("recent");
    setStateFilter("");
    setVirtualOnly(false);
    startTransition(() => {
      router.push("/communities");
    });
  };

  // Count active secondary filters
  const activeSecondaryCount = [
    sizeFilter !== "all",
    sortBy !== "recent",
  ].filter(Boolean).length;

  const hasActiveFilters = query || sizeFilter !== "all" || sortBy !== "recent" || stateFilter || virtualOnly;

  return (
    <div className="flex flex-col gap-3">
      {/* Primary filters row: Search, State, Virtual */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isPending ? (
              <svg
                className="animate-spin h-5 w-5 text-foreground-muted"
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
                className="h-5 w-5 text-foreground-muted"
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
            ref={inputRef}
            type="search"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search communities..."
            aria-label="Search communities. Press slash or Command+K to focus."
            className="block w-full pl-10 pr-10 py-2.5 border border-border rounded-lg text-foreground placeholder-foreground-muted
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-foreground-muted hover:text-foreground-muted"
              aria-label="Clear search"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

        {/* State filter */}
        <select
          value={stateFilter}
          onChange={handleStateChange}
          aria-label="Filter by state"
          disabled={virtualOnly}
          className="px-3 py-2 border border-border rounded-lg text-foreground bg-card text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-background-muted disabled:text-foreground-muted"
        >
          <option value="">All States</option>
          {US_STATES.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>

        {/* Virtual toggle */}
        <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-card text-sm cursor-pointer hover:bg-background-hover">
          <input
            type="checkbox"
            checked={virtualOnly}
            onChange={handleVirtualChange}
            className="h-4 w-4 text-primary-500 focus:ring-primary-500 rounded"
          />
          <span className="text-foreground">Virtual</span>
        </label>
      </div>

      {/* Secondary filters row (collapsible) */}
      <div className="flex items-center justify-between">
        <CollapsibleFilters
          activeFilterCount={activeSecondaryCount}
          label="More filters"
        >
          <div className="flex flex-wrap gap-2 items-center">
            {/* Size filter */}
            <select
              value={sizeFilter}
              onChange={handleSizeChange}
              aria-label="Filter by community size"
              className="px-3 py-2 border border-border rounded-lg text-foreground bg-card text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Sizes</option>
              <option value="small">Small (1-10)</option>
              <option value="medium">Medium (11-50)</option>
              <option value="large">Large (51+)</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={handleSortChange}
              aria-label="Sort communities by"
              className="px-3 py-2 border border-border rounded-lg text-foreground bg-card text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="recent">Recently Created</option>
              <option value="popular">Most Members</option>
            </select>
          </div>
        </CollapsibleFilters>

        {/* Clear all filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-background-hover rounded-lg transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
