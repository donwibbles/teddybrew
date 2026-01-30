"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { US_STATES } from "@/lib/constants/us-states";
import { EVENT_TYPES, EVENT_TYPE_LABELS, type EventTypeValue } from "@/lib/validations/event";

interface Community {
  id: string;
  slug: string;
  name: string;
}

interface IssueTag {
  id: string;
  slug: string;
  name: string;
}

interface EventFiltersProps {
  communities: Community[];
  availableTags?: IssueTag[];
  basePath?: string;
}

export function EventFilters({
  communities,
  availableTags = [],
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
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get("tags")?.split(",").filter(Boolean) || []
  );

  const updateFilters = useCallback(
    (newParams: {
      q?: string;
      community?: string;
      showPast?: boolean;
      state?: string;
      virtual?: boolean;
      type?: string;
      tags?: string[];
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

      if (newParams.tags !== undefined) {
        if (newParams.tags.length > 0) {
          params.set("tags", newParams.tags.join(","));
        } else {
          params.delete("tags");
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

  const handleTagToggle = (tagSlug: string) => {
    const newTags = selectedTags.includes(tagSlug)
      ? selectedTags.filter((t) => t !== tagSlug)
      : [...selectedTags, tagSlug];
    setSelectedTags(newTags);
    updateFilters({ tags: newTags });
  };

  const handleClearFilters = () => {
    setQuery("");
    setCommunity("");
    setShowPast(false);
    setStateFilter("");
    setVirtualOnly(false);
    setEventType("");
    setSelectedTags([]);
    router.push(basePath);
  };

  const hasActiveFilters =
    query ||
    community ||
    showPast ||
    stateFilter ||
    virtualOnly ||
    eventType ||
    selectedTags.length > 0;

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4 space-y-4">
      {/* First row: Search, Community, Past toggle */}
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

        {/* Past Events Toggle */}
        <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-neutral-300 rounded-lg bg-white hover:bg-neutral-50">
          <input
            type="checkbox"
            checked={showPast}
            onChange={(e) => {
              setShowPast(e.target.checked);
              updateFilters({ showPast: e.target.checked });
            }}
            className="w-4 h-4 text-primary-500 border-neutral-300 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-neutral-700 whitespace-nowrap">Past Events</span>
        </label>
      </div>

      {/* Second row: Location, Event Type filters */}
      <div className="flex flex-wrap gap-2 items-center">
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

      {/* Third row: Issue Tags (if available) */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-100">
          <span className="text-sm text-neutral-500 py-1">Issues:</span>
          {availableTags.map((tag) => (
            <button
              key={tag.slug}
              type="button"
              onClick={() => handleTagToggle(tag.slug)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                selectedTags.includes(tag.slug)
                  ? "bg-primary-100 text-primary-700 border-primary-300"
                  : "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
