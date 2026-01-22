function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-neutral-200 rounded ${className}`} />
  );
}

export default function EventsLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Skeleton */}
      <div>
        <Skeleton className="h-8 w-24 mb-1" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Events Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-neutral-200 overflow-hidden"
          >
            <div className="p-4 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-6 w-6 rounded-full border-2 border-white" />
                  ))}
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
