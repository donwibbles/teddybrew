"use client";

import { ChevronDown } from "lucide-react";
import { US_STATES, type USStateCode } from "@/lib/constants/us-states";
import { cn } from "@/lib/utils";

interface StateSelectProps {
  value: USStateCode | null | undefined;
  onChange: (value: USStateCode | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
}

export function StateSelect({
  value,
  onChange,
  placeholder = "Select state (optional)",
  disabled = false,
  error,
  className,
  includeAllOption = false,
  allOptionLabel = "All States",
}: StateSelectProps) {
  return (
    <div className={className}>
      <div className="relative">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? (e.target.value as USStateCode) : null)}
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
          {US_STATES.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
      </div>
      {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
    </div>
  );
}

// Display version for showing state name
interface StateDisplayProps {
  code: string;
  showCode?: boolean;
  className?: string;
}

export function StateDisplay({ code, showCode = false, className }: StateDisplayProps) {
  const state = US_STATES.find((s) => s.code === code);
  if (!state) return null;

  return (
    <span className={className}>
      {showCode ? `${state.name} (${state.code})` : state.name}
    </span>
  );
}
