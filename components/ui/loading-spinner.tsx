import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-3",
};

/**
 * Loading spinner component
 * Shows an animated spinner to indicate loading state
 */
export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-neutral-200 border-t-primary-600",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface LoadingPageProps {
  message?: string;
}

/**
 * Full page loading state
 * Use in loading.tsx files for route segments
 */
export function LoadingPage({ message = "Loading..." }: LoadingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-neutral-600">{message}</p>
    </div>
  );
}

/**
 * Inline loading state for buttons and small areas
 */
export function LoadingInline({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LoadingSpinner size="sm" />
      <span className="text-sm text-neutral-600">Loading...</span>
    </div>
  );
}
