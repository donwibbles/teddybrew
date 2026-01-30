"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface TagBadgeProps {
  name: string;
  href?: string;
  onClick?: () => void;
  size?: "sm" | "md";
  variant?: "default" | "primary" | "outline";
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

export function TagBadge({
  name,
  href,
  onClick,
  size = "sm",
  variant = "default",
  removable = false,
  onRemove,
  className,
}: TagBadgeProps) {
  const baseClasses = cn(
    "inline-flex items-center gap-1 rounded-full font-medium transition-colors",
    {
      "px-2 py-0.5 text-xs": size === "sm",
      "px-3 py-1 text-sm": size === "md",
    },
    {
      "bg-neutral-100 text-neutral-700 hover:bg-neutral-200": variant === "default",
      "bg-primary-100 text-primary-700 hover:bg-primary-200": variant === "primary",
      "border border-neutral-300 text-neutral-600 hover:border-neutral-400 hover:text-neutral-700": variant === "outline",
    },
    className
  );

  const content = (
    <>
      <span>{name}</span>
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:text-error-600 focus:outline-none"
          aria-label={`Remove ${name} tag`}
        >
          <svg
            className={cn("w-3 h-3", { "w-3.5 h-3.5": size === "md" })}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClasses}>
        {content}
      </button>
    );
  }

  return <span className={baseClasses}>{content}</span>;
}

interface TagBadgeListProps {
  tags: Array<{ slug: string; name: string }>;
  maxVisible?: number;
  size?: "sm" | "md";
  variant?: "default" | "primary" | "outline";
  onTagClick?: (slug: string) => void;
  getTagHref?: (slug: string) => string;
  className?: string;
}

export function TagBadgeList({
  tags,
  maxVisible = 3,
  size = "sm",
  variant = "default",
  onTagClick,
  getTagHref,
  className,
}: TagBadgeListProps) {
  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visibleTags.map((tag) => (
        <TagBadge
          key={tag.slug}
          name={tag.name}
          size={size}
          variant={variant}
          href={getTagHref ? getTagHref(tag.slug) : undefined}
          onClick={onTagClick ? () => onTagClick(tag.slug) : undefined}
        />
      ))}
      {hiddenCount > 0 && (
        <span
          className={cn(
            "inline-flex items-center rounded-full font-medium text-neutral-500",
            {
              "px-2 py-0.5 text-xs": size === "sm",
              "px-3 py-1 text-sm": size === "md",
            }
          )}
        >
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}
