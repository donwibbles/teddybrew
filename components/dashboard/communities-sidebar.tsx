import Link from "next/link";
import Image from "next/image";
import { Users } from "lucide-react";
import { getUserUnreadChatSummary } from "@/lib/db/activity";

interface Community {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  memberCount: number;
  role: string;
  joinedAt: Date;
}

interface CommunitiesSidebarProps {
  communities: Community[];
  userId: string;
}

export async function CommunitiesSidebar({ communities, userId }: CommunitiesSidebarProps) {
  const unreadSummary = await getUserUnreadChatSummary(userId);
  const unreadMap = new Map(unreadSummary.map((u) => [u.communityId, u.totalUnread]));

  if (communities.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <p className="text-sm text-foreground-muted mb-3">
          You haven&apos;t joined any communities yet.
        </p>
        <Link
          href="/communities"
          className="inline-flex items-center px-3 py-1.5 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
        >
          Browse Communities
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-3 border-b border-border bg-background-muted">
        <h3 className="font-medium text-foreground text-sm">Your Communities</h3>
      </div>
      <div className="divide-y divide-border">
        {communities.slice(0, 8).map((community) => {
          const unread = unreadMap.get(community.id) || 0;
          return (
            <Link
              key={community.id}
              href={`/communities/${community.slug}`}
              className="flex items-center gap-3 p-3 hover:bg-background-hover transition-colors"
            >
              {community.logoUrl ? (
                <Image
                  src={community.logoUrl}
                  alt={community.name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary-subtle-hover flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary-600" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground text-sm truncate">
                  {community.name}
                </p>
                <p className="text-xs text-foreground-muted">
                  {community.memberCount} members
                </p>
              </div>
              {unread > 0 && (
                <span className="shrink-0 bg-primary-500 text-white text-xs font-medium rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      {communities.length > 8 && (
        <Link
          href="/communities"
          className="block p-3 text-center text-sm text-primary-600 hover:bg-background-hover border-t border-border"
        >
          View all communities
        </Link>
      )}
    </div>
  );
}

export function CommunitiesSidebarSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-3 border-b border-border bg-background-muted">
        <div className="h-4 w-32 bg-background-muted rounded animate-pulse" />
      </div>
      <div className="divide-y divide-border">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="w-8 h-8 rounded-lg bg-background-muted animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-background-muted rounded animate-pulse mb-1" />
              <div className="h-3 w-16 bg-background-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
