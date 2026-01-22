import { prisma } from "@/lib/prisma";

export type PostSortType = "hot" | "new" | "top";

/**
 * Calculate "hot" score based on votes and age
 * Reddit-style algorithm
 */
function getHotScore(voteScore: number, createdAt: Date): number {
  const ageInHours =
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  // Score decays with time, boosted by votes
  return voteScore - ageInHours / 2;
}

/**
 * Get posts for a community with sorting and pagination
 */
export async function getPosts(
  communityId: string,
  sort: PostSortType,
  limit: number = 20,
  cursor?: string,
  userId?: string
) {
  // Build order by clause based on sort type
  let orderBy: object[];

  switch (sort) {
    case "new":
      orderBy = [{ createdAt: "desc" as const }];
      break;
    case "top":
      orderBy = [{ voteScore: "desc" as const }, { createdAt: "desc" as const }];
      break;
    case "hot":
    default:
      // For hot, we'll sort in memory after fetching
      orderBy = [{ createdAt: "desc" as const }];
      break;
  }

  const posts = await prisma.post.findMany({
    where: {
      communityId,
      deletedAt: null,
    },
    take: sort === "hot" ? 100 : limit + 1, // Fetch more for hot sorting
    cursor: cursor && sort !== "hot" ? { id: cursor } : undefined,
    skip: cursor && sort !== "hot" ? 1 : 0,
    orderBy,
    include: {
      author: {
        select: { id: true, name: true, image: true },
      },
      _count: {
        select: { comments: true },
      },
      ...(userId
        ? {
            votes: {
              where: { userId },
              select: { value: true },
            },
          }
        : {}),
    },
  });

  // Apply hot sorting in memory if needed
  let sortedPosts = posts;
  if (sort === "hot") {
    sortedPosts = [...posts].sort((a, b) => {
      const aScore = getHotScore(a.voteScore, a.createdAt);
      const bScore = getHotScore(b.voteScore, b.createdAt);
      return bScore - aScore;
    });
    // Apply pagination manually
    const startIndex = cursor
      ? sortedPosts.findIndex((p) => p.id === cursor) + 1
      : 0;
    sortedPosts = sortedPosts.slice(startIndex, startIndex + limit + 1);
  }

  // Separate pinned posts (always at top for non-top sort)
  const pinnedPosts = sortedPosts.filter((p) => p.isPinned);
  const regularPosts = sortedPosts.filter((p) => !p.isPinned);

  // Combine pinned first (only on first page)
  const finalPosts = !cursor
    ? [...pinnedPosts, ...regularPosts]
    : regularPosts;

  const hasMore = finalPosts.length > limit;
  const items = hasMore ? finalPosts.slice(0, -1) : finalPosts;
  const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

  return {
    posts: items.map((post) => ({
      ...post,
      userVote: userId && "votes" in post ? post.votes[0]?.value ?? 0 : 0,
      commentCount: post._count.comments,
    })),
    nextCursor,
    hasMore,
  };
}

/**
 * Get a single post by ID
 */
export async function getPostById(postId: string, userId?: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: { id: true, name: true, image: true },
      },
      community: {
        select: { id: true, slug: true, name: true, ownerId: true },
      },
      _count: {
        select: { comments: true },
      },
      ...(userId
        ? {
            votes: {
              where: { userId },
              select: { value: true },
            },
          }
        : {}),
    },
  });

  if (!post || post.deletedAt) return null;

  return {
    ...post,
    userVote: userId && "votes" in post ? post.votes[0]?.value ?? 0 : 0,
    commentCount: post._count.comments,
  };
}

/**
 * Get comments for a post with nested structure
 */
export async function getPostComments(
  postId: string,
  sort: "best" | "new" = "best",
  userId?: string
) {
  const orderBy =
    sort === "new"
      ? { createdAt: "desc" as const }
      : { voteScore: "desc" as const };

  const comments = await prisma.comment.findMany({
    where: {
      postId,
      deletedAt: null,
    },
    orderBy,
    include: {
      author: {
        select: { id: true, name: true, image: true },
      },
      ...(userId
        ? {
            votes: {
              where: { userId },
              select: { value: true },
            },
          }
        : {}),
    },
  });

  // Build nested tree structure
  const commentsMap = new Map<
    string | null,
    (typeof comments[number] & { userVote: number; replies: unknown[] })[]
  >();

  // Initialize with empty arrays for all possible parentIds
  commentsMap.set(null, []);
  comments.forEach((c) => {
    if (!commentsMap.has(c.id)) {
      commentsMap.set(c.id, []);
    }
  });

  // Populate the map
  comments.forEach((comment) => {
    const enrichedComment = {
      ...comment,
      userVote: userId && "votes" in comment ? comment.votes[0]?.value ?? 0 : 0,
      replies: commentsMap.get(comment.id) || [],
    };

    const parentList = commentsMap.get(comment.parentId) || [];
    parentList.push(enrichedComment);
    commentsMap.set(comment.parentId, parentList);
  });

  return commentsMap.get(null) || [];
}
