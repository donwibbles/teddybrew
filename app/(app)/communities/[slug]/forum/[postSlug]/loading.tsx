function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-neutral-200 rounded ${className}`} />
  );
}

export default function PostDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Post Detail Skeleton */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex gap-4">
          {/* Vote Column */}
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-6 w-6" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <div className="space-y-2 mb-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex items-center gap-4 pt-4 border-t border-neutral-100">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Comments Section Skeleton */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-7 w-16" />
          </div>
        </div>

        {/* Comment Input */}
        <div className="mb-6">
          <Skeleton className="h-24 w-full rounded-lg mb-2" />
          <Skeleton className="h-9 w-32" />
        </div>

        {/* Comment List */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-l-2 border-neutral-200 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center gap-2 mt-2">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-4 w-12 ml-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
