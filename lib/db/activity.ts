import { prisma } from "@/lib/prisma";

export type ActivityType = "event" | "post";

export interface EventActivityData {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  nextSessionDate: Date | null;
  rsvpCount: number;
  timezone: string | null;
}

export interface PostActivityData {
  id: string;
  title: string;
  content: string;
  authorName: string | null;
  authorImage: string | null;
  commentCount: number;
  voteScore: number;
}

export interface ActivityItem {
  type: ActivityType;
  id: string;
  createdAt: Date;
  community: {
    id: string;
    slug: string;
    name: string;
  };
  data: EventActivityData | PostActivityData;
}

/**
 * Get recent activity from user's communities (events and posts from last 7 days)
 */
export async function getUserCommunityActivity(
  userId: string,
  limit: number = 20,
  cursor?: Date
): Promise<{ items: ActivityItem[]; nextCursor?: Date; hasMore: boolean }> {
  // Get communities the user is a member of
  const memberships = await prisma.member.findMany({
    where: { userId },
    select: { communityId: true },
  });

  const communityIds = memberships.map((m) => m.communityId);

  if (communityIds.length === 0) {
    return { items: [], hasMore: false };
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const whereDate = cursor
    ? { lt: cursor, gte: sevenDaysAgo }
    : { gte: sevenDaysAgo };

  // Fetch recent events and posts in parallel
  const [events, posts] = await Promise.all([
    prisma.event.findMany({
      where: {
        communityId: { in: communityIds },
        createdAt: whereDate,
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        community: {
          select: { id: true, slug: true, name: true },
        },
        sessions: {
          where: { startTime: { gte: new Date() } },
          orderBy: { startTime: "asc" },
          take: 1,
          select: {
            startTime: true,
            _count: { select: { rsvps: true } },
          },
        },
      },
    }),
    prisma.post.findMany({
      where: {
        communityId: { in: communityIds },
        createdAt: whereDate,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        community: {
          select: { id: true, slug: true, name: true },
        },
        author: {
          select: { name: true, image: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    }),
  ]);

  // Transform to activity items
  const eventItems: ActivityItem[] = events.map((event) => ({
    type: "event" as const,
    id: event.id,
    createdAt: event.createdAt,
    community: event.community,
    data: {
      id: event.id,
      title: event.title,
      description: event.description,
      coverImage: event.coverImage,
      nextSessionDate: event.sessions[0]?.startTime ?? null,
      rsvpCount: event.sessions[0]?._count?.rsvps ?? 0,
      timezone: event.timezone,
    } as EventActivityData,
  }));

  const postItems: ActivityItem[] = posts.map((post) => ({
    type: "post" as const,
    id: post.id,
    createdAt: post.createdAt,
    community: post.community,
    data: {
      id: post.id,
      title: post.title,
      content: post.content,
      authorName: post.author.name,
      authorImage: post.author.image,
      commentCount: post._count.comments,
      voteScore: post.voteScore,
    } as PostActivityData,
  }));

  // Merge and sort by createdAt
  const allItems = [...eventItems, ...postItems].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  // Apply pagination
  const hasMore = allItems.length > limit;
  const items = hasMore ? allItems.slice(0, limit) : allItems;
  const nextCursor = hasMore ? items[items.length - 1]?.createdAt : undefined;

  return { items, nextCursor, hasMore };
}

/**
 * Get user's communities for sidebar/dropdown
 */
export async function getUserCommunities(userId: string) {
  const memberships = await prisma.member.findMany({
    where: { userId },
    take: 100,
    include: {
      community: {
        select: {
          id: true,
          slug: true,
          name: true,
          cardImage: true,
          _count: {
            select: { members: true },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return memberships.map((m) => ({
    id: m.community.id,
    slug: m.community.slug,
    name: m.community.name,
    logoUrl: m.community.cardImage,
    memberCount: m.community._count.members,
    role: m.role,
    joinedAt: m.joinedAt,
  }));
}
