import { Skeleton } from "@/components/ui/skeleton";

export function DocumentItemSkeleton() {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-4 w-full max-w-md mb-2" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  );
}

export function DocumentListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 divide-y divide-neutral-200">
      {Array.from({ length: count }).map((_, i) => (
        <DocumentItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function FolderGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-neutral-200 p-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
