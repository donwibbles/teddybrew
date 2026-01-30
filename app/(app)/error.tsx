"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, RefreshCw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("App route error:", error);
    Sentry.captureException(error, {
      tags: { route_group: "app" },
    });
  }, [error]);

  const handleReset = () => {
    router.refresh();
    reset();
  };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
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
          <CardTitle className="text-xl text-neutral-900">Something went wrong</CardTitle>
          <CardDescription>
            We encountered an unexpected error. Please try again or return to your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === "development" && (
            <div className="p-3 bg-neutral-100 rounded-lg">
              <p className="text-sm font-mono text-neutral-700 break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-neutral-500 mt-1">Error ID: {error.digest}</p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button onClick={handleReset} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => router.push("/communities")} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Go to Communities
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
