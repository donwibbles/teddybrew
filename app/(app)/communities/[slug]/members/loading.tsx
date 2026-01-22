function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-neutral-200 rounded ${className}`} />
  );
}

export default function MembersLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Skeleton */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-4 w-32" />
          <span className="text-neutral-300">/</span>
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-8 w-48 mb-1" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Member List Skeleton */}
      <div className="bg-white rounded-lg border border-neutral-200 divide-y divide-neutral-200">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
