"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { US_STATES } from "@/lib/constants/us-states";
import { EVENT_TYPES, EVENT_TYPE_LABELS, type EventTypeValue } from "@/lib/validations/event";
import { CollapsibleFilters } from "@/components/ui/collapsible-filters";

interface Community {
  id: string;
  slug: string;
  name: string;
}

interface EventFiltersProps {
  communities: Community[];
  basePath?: string;
}

export function EventFilters({
  communities,
  basePath = "/events",
}: EventFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [community, setCommunity] = useState(searchParams.get("community") || "");
  const [showPast, setShowPast] = useState(searchParams.get("showPast") === "true");
  const [stateFilter, setStateFilter] = useState(searchParams.get("state") || "");
  const [virtualOnly, setVirtualOnly] = useState(searchParams.get("virtual") === "true");
  const [eventType, setEventType] = useState(searchParams.get("type") || "");

  const updateFilters = useCallback(
    (newParams: {
      q?: string;
      community?: string;
      showPast?: boolean;
      state?: string;
      virtual?: boolean;
      type?: string;
    }) => {
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

      if (newParams.state !== undefined) {
        if (newParams.state) {
          params.set("state", newParams.state);
        } else {
          params.delete("state");
        }
      }

      if (newParams.virtual !== undefined) {
        if (newParams.virtual) {
          params.set("virtual", "true");
        } else {
          params.delete("virtual");
        }
      }

      if (newParams.type !== undefined) {
        if (newParams.type) {
          params.set("type", newParams.type);
        } else {
          params.delete("type");
        }
      }

      router.push(`${basePath}?${params.toString()}`);
    },
    [router, searchParams, basePath]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: query });
  };

  const handleClearFilters = () => {
    setQuery("");
    setCommunity("");
    setShowPast(false);
    setStateFilter("");
    setVirtualOnly(false);
    setEventType("");
    router.push(basePath);
  };

  const hasActiveFilters =
    query ||
    community ||
    stateFilter ||
    virtualOnly ||
    eventType;

  // Count active secondary filters (for collapsible badge)
  const activeSecondaryCount = [virtualOnly, community].filter(Boolean).length;

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4 space-y-4">
      {/* Prominent Upcoming/Past tabs */}
      <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => {
            setShowPast(false);
            updateFilters({ showPast: false });
          }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            !showPast
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Upcoming
        </button>
        <button
          type="button"
          onClick={() => {
            setShowPast(true);
            updateFilters({ showPast: true });
          }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            showPast
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Past
        </button>
      </div>

      {/* Primary filters row: Search, Event Type, State */}
      <div className="flex flex-col sm:flex-row gap-3">
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

        {/* Event Type filter */}
        <select
          value={eventType}
          onChange={(e) => {
            setEventType(e.target.value);
            updateFilters({ type: e.target.value });
          }}
          aria-label="Filter by event type"
          className="px-3 py-2 border border-neutral-300 rounded-lg text-neutral-900 bg-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">All Types</option>
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {EVENT_TYPE_LABELS[type as EventTypeValue]}
            </option>
          ))}
        </select>

        {/* State filter */}
        <select
          value={stateFilter}
          onChange={(e) => {
            setStateFilter(e.target.value);
            updateFilters({ state: e.target.value });
          }}
          aria-label="Filter by state"
          disabled={virtualOnly}
          className="px-3 py-2 border border-neutral-300 rounded-lg text-neutral-900 bg-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-neutral-100 disabled:text-neutral-500"
        >
          <option value="">All States</option>
          {US_STATES.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>
      </div>

      {/* Collapsible secondary filters */}
      <div className="flex items-center justify-between">
        <CollapsibleFilters
          activeFilterCount={activeSecondaryCount}
          label="More filters"
        >
          <div className="flex flex-wrap gap-3 items-center">
            {/* Virtual toggle */}
            <label className="flex items-center gap-2 px-3 py-2 border border-neutral-300 rounded-lg bg-white text-sm cursor-pointer hover:bg-neutral-50">
              <input
                type="checkbox"
                checked={virtualOnly}
                onChange={(e) => {
                  setVirtualOnly(e.target.checked);
                  updateFilters({ virtual: e.target.checked });
                }}
                className="h-4 w-4 text-primary-500 focus:ring-primary-500 rounded"
              />
              <span className="text-neutral-700">Virtual Only</span>
            </label>

            {/* Community Filter */}
            <select
              value={community}
              onChange={(e) => {
                setCommunity(e.target.value);
                updateFilters({ community: e.target.value });
              }}
              aria-label="Filter by community"
              className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-900 bg-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Communities</option>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </CollapsibleFilters>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
