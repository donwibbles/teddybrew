function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-background-muted rounded ${className}`} />
  );
}

export default function ForumLoading() {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Sort Tabs Skeleton */}
      <div className="flex gap-1 bg-background-muted p-1 rounded-lg w-fit">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>

      {/* Post List Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-card rounded-lg border border-border p-4"
          >
            <div className="flex gap-4">
              {/* Vote Column */}
              <div className="flex flex-col items-center gap-1">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-6 w-6" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-3" />
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
