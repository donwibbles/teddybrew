function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-background-muted rounded ${className}`} />
  );
}

export default function ChatLoading() {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
      </div>

      {/* Chat Layout Skeleton */}
      <div className="flex h-[calc(100vh-220px)] min-h-[500px] rounded-lg border border-border bg-card overflow-hidden">
        {/* Channel Sidebar */}
        <div className="w-60 border-r border-border flex-shrink-0 hidden md:block">
          <div className="p-4 border-b border-border">
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="p-2 space-y-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Channel Header */}
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2 items-end">
              <Skeleton className="h-10 flex-1 rounded-lg" />
              <Skeleton className="h-10 w-10 rounded-md" />
            </div>
          </div>
        </div>

        {/* Members Sidebar */}
        <div className="w-60 border-l border-border flex-shrink-0 hidden lg:block">
          <div className="p-4 border-b border-border">
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="p-2 space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
