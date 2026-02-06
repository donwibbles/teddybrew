function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-background-muted rounded ${className}`} />
  );
}

export default function SettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Skeleton */}
      <div>
        <Skeleton className="h-8 w-28 mb-1" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Profile Card */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <Skeleton className="h-6 w-20 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="p-6 space-y-4">
          <div>
            <Skeleton className="h-4 w-28 mb-1" />
            <Skeleton className="h-5 w-36" />
          </div>
          <div>
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Account Card */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <Skeleton className="h-6 w-20 mb-1" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="p-6 space-y-4">
          <div>
            <Skeleton className="h-4 w-28 mb-1" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-56 mt-1" />
          </div>
          <div>
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-5 w-36" />
          </div>
        </div>
      </div>

      {/* Session Card */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <Skeleton className="h-6 w-20 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="p-6 space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Danger Zone Card */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <Skeleton className="h-6 w-28 mb-1" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="p-6 space-y-4">
          <div>
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-9 w-48" />
        </div>
      </div>
    </div>
  );
}
