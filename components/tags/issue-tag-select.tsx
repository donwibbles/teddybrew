"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface IssueTag {
  id: string;
  slug: string;
  name: string;
}

interface IssueTagSelectProps {
  availableTags: IssueTag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function IssueTagSelect({
  availableTags,
  selectedTagIds,
  onChange,
  placeholder = "Select issue tags...",
  maxTags = 10,
  disabled = false,
  error,
  className,
}: IssueTagSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedTags = availableTags.filter((tag) => selectedTagIds.includes(tag.id));
  const filteredTags = availableTags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else if (selectedTagIds.length < maxTags) {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const removeTag = (tagId: string) => {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Selected tags and input */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
        className={cn(
          "min-h-[42px] w-full px-3 py-2 border rounded-lg cursor-text",
          "flex flex-wrap gap-1.5 items-center",
          disabled
            ? "bg-background-muted cursor-not-allowed"
            : "bg-card hover:border-border",
          error ? "border-error-500" : "border-border",
          isOpen && "ring-2 ring-primary-500 border-primary-500"
        )}
      >
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-subtle-hover text-primary-700 text-sm rounded-md"
          >
            {tag.name}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag.id);
                }}
                className="hover:text-primary-900 focus:outline-none"
                aria-label={`Remove ${tag.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={selectedTags.length === 0 ? placeholder : ""}
          disabled={disabled}
          className={cn(
            "flex-1 min-w-[120px] outline-none bg-transparent text-sm",
            "placeholder:text-foreground-muted",
            disabled && "cursor-not-allowed"
          )}
        />
        <ChevronDown
          className={cn(
            "w-4 h-4 text-foreground-muted transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredTags.length === 0 ? (
            <div className="px-3 py-2 text-sm text-foreground-muted">No tags found</div>
          ) : (
            filteredTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              const isMaxReached = selectedTagIds.length >= maxTags && !isSelected;

              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => !isMaxReached && toggleTag(tag.id)}
                  disabled={isMaxReached}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm flex items-center justify-between",
                    "hover:bg-background-hover focus:bg-background-muted focus:outline-none",
                    isSelected && "bg-primary-subtle text-primary-700",
                    isMaxReached && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span>{tag.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary-600" />}
                </button>
              );
            })
          )}
          {selectedTagIds.length >= maxTags && (
            <div className="px-3 py-2 text-xs text-foreground-muted border-t border-border">
              Maximum {maxTags} tags allowed
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && <p className="mt-1 text-sm text-error-600">{error}</p>}

      {/* Helper text */}
      {selectedTagIds.length > 0 && (
        <p className="mt-1 text-xs text-foreground-muted">
          {selectedTagIds.length} of {maxTags} tags selected
        </p>
      )}
    </div>
  );
}
