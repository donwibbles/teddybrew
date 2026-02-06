"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleFiltersProps {
  children: React.ReactNode;
  activeFilterCount?: number;
  defaultOpen?: boolean;
  label?: string;
}

export function CollapsibleFilters({
  children,
  activeFilterCount = 0,
  defaultOpen = false,
  label = "More filters",
}: CollapsibleFiltersProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-background-hover rounded-lg transition-colors"
        aria-expanded={isOpen}
        aria-controls="collapsible-filters-content"
      >
        <span>{isOpen ? "Less" : label}</span>
        {activeFilterCount > 0 && !isOpen && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-primary-subtle-hover text-primary-700 rounded-full">
            {activeFilterCount}
          </span>
        )}
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      <div
        id="collapsible-filters-content"
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? "max-h-96 opacity-100 mt-3" : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
