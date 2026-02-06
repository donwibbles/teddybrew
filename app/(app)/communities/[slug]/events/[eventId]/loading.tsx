function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-background-muted rounded ${className}`} />
  );
}

export default function EventDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-32" />
        <span className="text-foreground-muted">/</span>
        <Skeleton className="h-4 w-16" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Header */}
          <div>
            <Skeleton className="h-8 w-3/4" />
          </div>

          {/* Date & Time Card */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>

          {/* Location Card */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          </div>

          {/* Description Card */}
          <div className="bg-card rounded-lg border border-border p-6">
            <Skeleton className="h-5 w-16 mb-3" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>

          {/* Organizers Card */}
          <div className="bg-card rounded-lg border border-border p-6">
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-28 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attendees Card */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-10 rounded-full border-2 border-white" />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* RSVP Card */}
          <div className="bg-card rounded-lg border border-border p-6 sticky top-24">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>

          {/* Community Card */}
          <div className="bg-card rounded-lg border border-border p-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}
