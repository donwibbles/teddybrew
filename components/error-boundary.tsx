"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}

/**
 * Reusable error boundary component for route segments
 * Use in error.tsx files within route segments
 *
 * Features:
 * - Shows user-friendly error message
 * - Reset button that clears router cache and resets boundary
 * - Shows error details in development mode only
 */
export function ErrorBoundary({
  error,
  reset,
  title = "Something went wrong",
  description = "We encountered an unexpected error. Please try again.",
}: ErrorBoundaryProps) {
  const router = useRouter();

  useEffect(() => {
    // Log error to console (Sentry integration in Phase 7)
    console.error("Error boundary caught:", error);
  }, [error]);

  const handleReset = () => {
    // Clear router cache and reset the error boundary
    router.refresh();
    reset();
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
        <p className="text-foreground-muted mb-6">{description}</p>

        {process.env.NODE_ENV === "development" && (
          <div className="mb-6 p-3 bg-background-muted rounded-lg text-left">
            <p className="text-sm font-mono text-foreground break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-foreground-muted mt-1">Error ID: {error.digest}</p>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button onClick={handleReset}>Try Again</Button>
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
