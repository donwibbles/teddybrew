"use client";

import { ChevronDown } from "lucide-react";
import { POST_TYPES, POST_TYPE_LABELS, type PostTypeValue } from "@/lib/validations/post";
import { cn } from "@/lib/utils";

interface PostTypeSelectProps {
  value: PostTypeValue | null | undefined;
  onChange: (value: PostTypeValue | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
}

export function PostTypeSelect({
  value,
  onChange,
  placeholder = "Select post type (optional)",
  disabled = false,
  error,
  className,
  includeAllOption = false,
  allOptionLabel = "All Types",
}: PostTypeSelectProps) {
  return (
    <div className={className}>
      <div className="relative">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? (e.target.value as PostTypeValue) : null)}
          disabled={disabled}
          className={cn(
            "w-full px-3 py-2 pr-10 border rounded-lg text-sm appearance-none",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
            disabled
              ? "bg-neutral-100 cursor-not-allowed text-neutral-500"
              : "bg-white cursor-pointer",
            error ? "border-error-500" : "border-neutral-300",
            !value && "text-neutral-400"
          )}
        >
          <option value="">{includeAllOption ? allOptionLabel : placeholder}</option>
          {POST_TYPES.map((type) => (
            <option key={type} value={type}>
              {POST_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
      </div>
      {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
    </div>
  );
}

// Inline badge version for display
interface PostTypeBadgeProps {
  type: PostTypeValue;
  size?: "sm" | "md";
  className?: string;
}

export function PostTypeBadge({ type, size = "sm", className }: PostTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-medium bg-purple-100 text-purple-700",
        {
          "px-2 py-0.5 text-xs": size === "sm",
          "px-2.5 py-1 text-sm": size === "md",
        },
        className
      )}
    >
      {POST_TYPE_LABELS[type]}
    </span>
  );
}
