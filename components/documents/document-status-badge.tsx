import { FileText, Eye, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentStatus } from "@prisma/client";

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<DocumentStatus, {
  label: string;
  icon: typeof FileText;
  className: string;
}> = {
  DRAFT: {
    label: "Draft",
    icon: FileText,
    className: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  PUBLISHED: {
    label: "Published",
    icon: Eye,
    className: "bg-green-100 text-green-700 border-green-200",
  },
  ARCHIVED: {
    label: "Archived",
    icon: Archive,
    className: "bg-background-muted text-foreground-muted border-border",
  },
};

export function DocumentStatusBadge({
  status,
  className,
  showIcon = true,
}: DocumentStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </span>
  );
}

/**
 * Status selector dropdown for document editing
 */
interface StatusSelectorProps {
  status: DocumentStatus;
  onChange: (status: DocumentStatus) => void;
  disabled?: boolean;
}

export function StatusSelector({ status, onChange, disabled }: StatusSelectorProps) {
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as DocumentStatus)}
      disabled={disabled}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium",
        statusConfig[status].className,
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <option value="DRAFT">Draft</option>
      <option value="PUBLISHED">Published</option>
      <option value="ARCHIVED">Archived</option>
    </select>
  );
}
