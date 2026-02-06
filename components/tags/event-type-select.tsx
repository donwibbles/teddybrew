"use client";

import { ChevronDown } from "lucide-react";
import { EVENT_TYPES, EVENT_TYPE_LABELS, type EventTypeValue } from "@/lib/validations/event";
import { cn } from "@/lib/utils";

interface EventTypeSelectProps {
  value: EventTypeValue | null | undefined;
  onChange: (value: EventTypeValue | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
}

export function EventTypeSelect({
  value,
  onChange,
  placeholder = "Select event type (optional)",
  disabled = false,
  error,
  className,
  includeAllOption = false,
  allOptionLabel = "All Types",
}: EventTypeSelectProps) {
  return (
    <div className={className}>
      <div className="relative">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? (e.target.value as EventTypeValue) : null)}
          disabled={disabled}
          className={cn(
            "w-full px-3 py-2 pr-10 border rounded-lg text-sm appearance-none",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
            disabled
              ? "bg-background-muted cursor-not-allowed text-foreground-muted"
              : "bg-card cursor-pointer",
            error ? "border-error-500" : "border-border",
            !value && "text-foreground-muted"
          )}
        >
          <option value="">{includeAllOption ? allOptionLabel : placeholder}</option>
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {EVENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
      </div>
      {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
    </div>
  );
}

// Inline badge version for display
interface EventTypeBadgeProps {
  type: EventTypeValue;
  size?: "sm" | "md";
  className?: string;
}

export function EventTypeBadge({ type, size = "sm", className }: EventTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-medium bg-blue-100 text-blue-700",
        {
          "px-2 py-0.5 text-xs": size === "sm",
          "px-2.5 py-1 text-sm": size === "md",
        },
        className
      )}
    >
      {EVENT_TYPE_LABELS[type]}
    </span>
  );
}
