"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { X, Plus } from "lucide-react";

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

  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get("tags")?.split(",").filter(Boolean) || []
  );
  const [showTagPicker, setShowTagPicker] = useState(false);

  const updateFilters = useCallback(
    (newParams: { tags?: string[] }) => {
      const params = new URLSearchParams(searchParams.toString());

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

  const handleRemoveTag = (tagSlug: string) => {
    const newTags = selectedTags.filter((t) => t !== tagSlug);
    setSelectedTags(newTags);
    updateFilters({ tags: newTags });
  };

  const handleClearFilters = () => {
    setSelectedTags([]);
    // Keep the sort param
    const params = new URLSearchParams();
    const sortParam = searchParams.get("sort");
    if (sortParam) {
      params.set("sort", sortParam);
    }
    router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const hasActiveFilters = selectedTags.length > 0;

  // Get tag names for selected tags
  const selectedTagObjects = selectedTags
    .map((slug) => availableTags.find((t) => t.slug === slug))
    .filter(Boolean) as IssueTag[];

  // Get unselected tags for the picker
  const unselectedTags = availableTags.filter(
    (t) => !selectedTags.includes(t.slug)
  );

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3">
      {/* Tag chips row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-foreground-muted">Tags:</span>

        {/* Selected tag chips */}
        {selectedTagObjects.map((tag) => (
          <button
            key={tag.slug}
            type="button"
            onClick={() => handleRemoveTag(tag.slug)}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full bg-primary-subtle-hover text-primary-700 border border-primary-300 hover:bg-primary-200 transition-colors"
          >
            {tag.name}
            <X className="h-3 w-3" />
          </button>
        ))}

        {/* Add tag button */}
        {unselectedTags.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTagPicker(!showTagPicker)}
              className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full bg-card text-foreground-muted border border-border hover:bg-background-hover transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>

            {/* Tag picker dropdown */}
            {showTagPicker && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowTagPicker(false)}
                />
                <div className="absolute top-full left-0 mt-1 z-20 bg-card rounded-lg border border-border shadow-lg py-2 max-h-64 overflow-y-auto min-w-[200px]">
                  {unselectedTags.map((tag) => (
                    <button
                      key={tag.slug}
                      type="button"
                      onClick={() => {
                        handleTagToggle(tag.slug);
                        setShowTagPicker(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-left text-foreground hover:bg-background-hover transition-colors"
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-3 py-1 text-sm text-foreground-muted hover:text-foreground hover:bg-background-hover rounded-lg transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
