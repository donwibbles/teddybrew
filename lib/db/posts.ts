import { prisma } from "@/lib/prisma";

export type PostSortType = "hot" | "new" | "top";

/**
 * Check if a post slug already exists in a community
 */
export async function postSlugExists(
  communityId: string,
  slug: string,
  excludePostId?: string
): Promise<boolean> {
  const existing = await prisma.post.findFirst({
    where: {
      communityId,
      slug,
      ...(excludePostId ? { id: { not: excludePostId } } : {}),
    },
    select: { id: true },
  });
  return !!existing;
}

/**
 * Generate a unique post slug within a community
 */
export async function generateUniquePostSlug(
  communityId: string,
  baseSlug: string,
  excludePostId?: string
): Promise<string> {
  // Ensure base slug is not empty
  let slug = baseSlug || "post";

  // Truncate to leave room for counter suffix
  slug = slug.slice(0, 300);

  if (!(await postSlugExists(communityId, slug, excludePostId))) {
    return slug;
  }

  // Try with counter
  for (let i = 2; i <= 100; i++) {
    const candidate = `${slug}-${i}`;
    if (!(await postSlugExists(communityId, candidate, excludePostId))) {
      return candidate;
    }
  }

  // Fallback to timestamp
  return `${slug}-${Date.now()}`;
}

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
        select: {
          id: true,
          name: true,
          image: true,
          username: true,
          isPublic: true,
          memberships: {
            where: { communityId },
            select: { role: true },
          },
        },
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
    // Apply pagination manually - use cursor position or start from beginning
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = sortedPosts.findIndex((p) => p.id === cursor);
      // If cursor not found in hot sort window, fall back to "new" sort
      if (cursorIndex === -1) {
        return getPosts(communityId, "new", limit, cursor, userId);
      }
      startIndex = cursorIndex + 1;
    }
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
      author: {
        id: post.author.id,
        name: post.author.name,
        image: post.author.image,
        username: post.author.username,
        isPublic: post.author.isPublic,
        role: post.author.memberships[0]?.role ?? null,
      },
      userVote: userId && "votes" in post ? post.votes[0]?.value ?? 0 : 0,
      commentCount: post.commentCount,
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
        select: { id: true, name: true, image: true, username: true, isPublic: true },
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

  // Get author's role in this community
  const authorMembership = await prisma.member.findUnique({
    where: {
      userId_communityId: {
        userId: post.authorId,
        communityId: post.communityId,
      },
    },
    select: { role: true },
  });

  return {
    ...post,
    author: {
      ...post.author,
      role: authorMembership?.role ?? null,
    },
    userVote: userId && "votes" in post ? post.votes[0]?.value ?? 0 : 0,
    commentCount: post.commentCount,
  };
}

/**
 * Get a single post by community slug + post slug
 */
export async function getPostBySlug(
  communitySlug: string,
  postSlug: string,
  userId?: string
) {
  const post = await prisma.post.findFirst({
    where: {
      slug: postSlug,
      community: { slug: communitySlug },
      deletedAt: null,
    },
    include: {
      author: {
        select: { id: true, name: true, image: true, username: true, isPublic: true },
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

  if (!post) return null;

  // Get author's role in this community
  const authorMembership = await prisma.member.findUnique({
    where: {
      userId_communityId: {
        userId: post.authorId,
        communityId: post.communityId,
      },
    },
    select: { role: true },
  });

  return {
    ...post,
    author: {
      ...post.author,
      role: authorMembership?.role ?? null,
    },
    userVote: userId && "votes" in post ? post.votes[0]?.value ?? 0 : 0,
    commentCount: post.commentCount,
  };
}

/**
 * Get posts from all PUBLIC communities for global forum
 */
export async function getPublicPosts(
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
      deletedAt: null,
      community: {
        type: "PUBLIC",
      },
    },
    take: sort === "hot" ? 100 : limit + 1,
    cursor: cursor && sort !== "hot" ? { id: cursor } : undefined,
    skip: cursor && sort !== "hot" ? 1 : 0,
    orderBy,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
          username: true,
          isPublic: true,
        },
      },
      community: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
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
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = sortedPosts.findIndex((p) => p.id === cursor);
      // If cursor not found in hot sort window, fall back to "new" sort
      if (cursorIndex === -1) {
        return getPublicPosts("new", limit, cursor, userId);
      }
      startIndex = cursorIndex + 1;
    }
    sortedPosts = sortedPosts.slice(startIndex, startIndex + limit + 1);
  }

  const hasMore = sortedPosts.length > limit;
  const items = hasMore ? sortedPosts.slice(0, -1) : sortedPosts;
  const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

  return {
    posts: items.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      contentJson: post.contentJson,
      voteScore: post.voteScore,
      isPinned: post.isPinned,
      createdAt: post.createdAt,
      author: {
        id: post.author.id,
        name: post.author.name,
        image: post.author.image,
        username: post.author.username,
        isPublic: post.author.isPublic,
      },
      community: {
        id: post.community.id,
        slug: post.community.slug,
        name: post.community.name,
      },
      userVote: userId && "votes" in post ? post.votes[0]?.value ?? 0 : 0,
      commentCount: post.commentCount,
    })),
    nextCursor,
    hasMore,
  };
}

/**
 * Get comments for a post with nested structure (paginated)
 * Top-level comments are paginated, replies are fetched level-by-level with bounded limits.
 */
export async function getPostComments(
  postId: string,
  sort: "best" | "new" = "best",
  userId?: string,
  limit: number = 50,
  cursor?: string
) {
  // Get post to find community ID
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { communityId: true },
  });

  if (!post) return { comments: [], nextCursor: undefined, hasMore: false };

  const orderBy =
    sort === "new"
      ? { createdAt: "desc" as const }
      : { voteScore: "desc" as const };

  const commentInclude = {
    author: {
      select: {
        id: true,
        name: true,
        image: true,
        username: true,
        isPublic: true,
        memberships: {
          where: { communityId: post.communityId },
          select: { role: true },
        },
      },
    },
    ...(userId
      ? {
          votes: {
            where: { userId },
            select: { value: true },
          },
        }
      : {}),
    _count: { select: { replies: true } },
  };

  // Step 1: Fetch paginated top-level comments
  const topLevelRaw = await prisma.comment.findMany({
    where: { postId, parentId: null, deletedAt: null },
    orderBy,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    include: commentInclude,
  });

  const hasMore = topLevelRaw.length > limit;
  const paginatedTopLevel = hasMore ? topLevelRaw.slice(0, -1) : topLevelRaw;
  const nextCursor = hasMore
    ? paginatedTopLevel[paginatedTopLevel.length - 1]?.id
    : undefined;

  if (paginatedTopLevel.length === 0) {
    return { comments: [], nextCursor: undefined, hasMore: false };
  }

  // Step 2: Fetch replies level-by-level, bounded per level
  const topLevelIds = paginatedTopLevel.map((c) => c.id);
  let currentParentIds = topLevelIds;
  const allReplies: typeof topLevelRaw = [];

  for (let depth = 0; depth < 5 && currentParentIds.length > 0; depth++) {
    const levelReplies = await prisma.comment.findMany({
      where: {
        postId,
        parentId: { in: currentParentIds },
        deletedAt: null,
      },
      orderBy,
      take: Math.min(currentParentIds.length * 20, 1000),
      include: commentInclude,
    });
    allReplies.push(...levelReplies);
    currentParentIds = levelReplies.map((r) => r.id);
  }

  // Step 3: Build nested tree structure
  const allComments = [...paginatedTopLevel, ...allReplies];

  type EnrichedComment = {
    id: string;
    content: string;
    postId: string;
    authorId: string;
    parentId: string | null;
    depth: number;
    voteScore: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    deletedById: string | null;
    author: {
      id: string;
      name: string | null;
      image: string | null;
      username: string | null;
      isPublic: boolean;
      role: string | null;
    };
    userVote: number;
    replies: EnrichedComment[];
    replyCount: number;
  };

  const commentsMap = new Map<string | null, EnrichedComment[]>();

  // Initialize with empty arrays for all possible parentIds
  commentsMap.set(null, []);
  allComments.forEach((c) => {
    if (!commentsMap.has(c.id)) {
      commentsMap.set(c.id, []);
    }
  });

  // Populate the map
  allComments.forEach((comment) => {
    const enrichedComment: EnrichedComment = {
      id: comment.id,
      content: comment.content,
      postId: comment.postId,
      authorId: comment.authorId,
      parentId: comment.parentId,
      depth: comment.depth,
      voteScore: comment.voteScore,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      deletedAt: comment.deletedAt,
      deletedById: comment.deletedById,
      author: {
        id: comment.author.id,
        name: comment.author.name,
        image: comment.author.image,
        username: comment.author.username,
        isPublic: comment.author.isPublic,
        role: comment.author.memberships[0]?.role ?? null,
      },
      userVote: userId && "votes" in comment ? comment.votes[0]?.value ?? 0 : 0,
      replies: commentsMap.get(comment.id) || [],
      replyCount: comment._count.replies,
    };

    const parentList = commentsMap.get(comment.parentId) || [];
    parentList.push(enrichedComment);
    commentsMap.set(comment.parentId, parentList);
  });

  return {
    comments: commentsMap.get(null) || [],
    nextCursor,
    hasMore,
  };
}

/**
 * Get replies for a specific comment (paginated, for on-demand loading)
 */
export async function getCommentReplies(
  postId: string,
  parentId: string,
  sort: "best" | "new" = "best",
  userId?: string,
  limit: number = 20,
  cursor?: string
) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { communityId: true },
  });

  if (!post) return { replies: [], nextCursor: undefined, hasMore: false };

  const orderBy =
    sort === "new"
      ? { createdAt: "desc" as const }
      : { voteScore: "desc" as const };

  const repliesRaw = await prisma.comment.findMany({
    where: { postId, parentId, deletedAt: null },
    orderBy,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
          username: true,
          isPublic: true,
          memberships: {
            where: { communityId: post.communityId },
            select: { role: true },
          },
        },
      },
      ...(userId
        ? {
            votes: {
              where: { userId },
              select: { value: true },
            },
          }
        : {}),
      _count: { select: { replies: true } },
    },
  });

  const hasMore = repliesRaw.length > limit;
  const paginated = hasMore ? repliesRaw.slice(0, -1) : repliesRaw;
  const nextCursor = hasMore
    ? paginated[paginated.length - 1]?.id
    : undefined;

  return {
    replies: paginated.map((comment) => ({
      id: comment.id,
      content: comment.content,
      postId: comment.postId,
      authorId: comment.authorId,
      parentId: comment.parentId,
      depth: comment.depth,
      voteScore: comment.voteScore,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      deletedAt: comment.deletedAt,
      deletedById: comment.deletedById,
      author: {
        id: comment.author.id,
        name: comment.author.name,
        image: comment.author.image,
        username: comment.author.username,
        isPublic: comment.author.isPublic,
        role: comment.author.memberships[0]?.role ?? null,
      },
      userVote:
        userId && "votes" in comment ? comment.votes[0]?.value ?? 0 : 0,
      replies: [],
      replyCount: comment._count.replies,
    })),
    nextCursor,
    hasMore,
  };
}
