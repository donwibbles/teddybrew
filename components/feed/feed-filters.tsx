"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { POST_TYPES, POST_TYPE_LABELS, type PostTypeValue } from "@/lib/validations/post";

interface IssueTag {
  id: string;
  slug: string;
  name: string;
}

interface FeedFiltersProps {
  availableTags?: IssueTag[];
  basePath?: string;
}

export function FeedFilters({
  availableTags = [],
  basePath = "/feed",
}: FeedFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [postType, setPostType] = useState(searchParams.get("type") || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get("tags")?.split(",").filter(Boolean) || []
  );

  const updateFilters = useCallback(
    (newParams: { type?: string; tags?: string[] }) => {
      const params = new URLSearchParams(searchParams.toString());

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

  const handleTagToggle = (tagSlug: string) => {
    const newTags = selectedTags.includes(tagSlug)
      ? selectedTags.filter((t) => t !== tagSlug)
      : [...selectedTags, tagSlug];
    setSelectedTags(newTags);
    updateFilters({ tags: newTags });
  };

  const handleClearFilters = () => {
    setPostType("");
    setSelectedTags([]);
    // Keep the sort param
    const params = new URLSearchParams();
    const sortParam = searchParams.get("sort");
    if (sortParam) {
      params.set("sort", sortParam);
    }
    router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const hasActiveFilters = postType || selectedTags.length > 0;

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4 space-y-3">
      {/* First row: Post Type filter */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Post Type filter */}
        <select
          value={postType}
          onChange={(e) => {
            setPostType(e.target.value);
            updateFilters({ type: e.target.value });
          }}
          aria-label="Filter by post type"
          className="px-3 py-2 border border-neutral-300 rounded-lg text-neutral-900 bg-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">All Post Types</option>
          {POST_TYPES.map((type) => (
            <option key={type} value={type}>
              {POST_TYPE_LABELS[type as PostTypeValue]}
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

      {/* Second row: Issue Tags (if available) */}
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
