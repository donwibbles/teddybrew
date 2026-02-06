import { Prisma } from "@prisma/client";
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
 * Get posts for a community with sorting and pagination
 */
export async function getPosts(
  communityId: string,
  sort: PostSortType,
  limit: number = 20,
  cursor?: string,
  userId?: string
) {
  // For hot sort, use raw SQL to compute and sort by hot score in the database
  if (sort === "hot") {
    // Fetch sorted IDs using raw SQL with hot score formula
    const hotIds = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT "id" FROM "Post"
       WHERE "communityId" = $1 AND "deletedAt" IS NULL
       ${cursor ? `AND ("voteScore" - EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 7200) < (SELECT "voteScore" - EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 7200 FROM "Post" WHERE "id" = $3)` : ""}
       ORDER BY ("voteScore" - EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 7200) DESC
       LIMIT $2`,
      ...(cursor
        ? [communityId, limit + 1, cursor]
        : [communityId, limit + 1])
    );

    if (hotIds.length === 0) {
      return { posts: [], nextCursor: undefined, hasMore: false };
    }

    const orderedIds = hotIds.map((r) => r.id);

    // Fetch full post data with relations
    const posts = await prisma.post.findMany({
      where: { id: { in: orderedIds } },
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

    // Restore the hot-score order from the raw query
    const postsById = new Map(posts.map((p) => [p.id, p]));
    const sortedPosts = orderedIds.map((id) => postsById.get(id)!).filter(Boolean);

    // Separate pinned posts (always at top on first page)
    const pinnedPosts = sortedPosts.filter((p) => p.isPinned);
    const regularPosts = sortedPosts.filter((p) => !p.isPinned);
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

  // Build order by clause based on sort type
  const orderBy: object[] =
    sort === "top"
      ? [{ voteScore: "desc" as const }, { createdAt: "desc" as const }]
      : [{ createdAt: "desc" as const }];

  const posts = await prisma.post.findMany({
    where: {
      communityId,
      deletedAt: null,
    },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
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

  const sortedPosts = posts;

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
 * Optimized to fetch author's community role in a single query
 */
export async function getPostById(postId: string, userId?: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
          username: true,
          isPublic: true,
          memberships: {
            select: { communityId: true, role: true },
          },
        },
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

  // Find the author's role in this specific community from the included memberships
  const authorRole = post.author.memberships.find(
    (m) => m.communityId === post.communityId
  )?.role ?? null;

  return {
    ...post,
    author: {
      id: post.author.id,
      name: post.author.name,
      image: post.author.image,
      username: post.author.username,
      isPublic: post.author.isPublic,
      role: authorRole,
    },
    userVote: userId && "votes" in post ? post.votes[0]?.value ?? 0 : 0,
    commentCount: post.commentCount,
  };
}

/**
 * Get a single post by community slug + post slug
 * Optimized to fetch author's community role in a single query
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
        select: {
          id: true,
          name: true,
          image: true,
          username: true,
          isPublic: true,
          memberships: {
            select: { communityId: true, role: true },
          },
        },
      },
      community: {
        select: { id: true, slug: true, name: true, ownerId: true },
      },
      issueTags: {
        select: { id: true, slug: true, name: true },
        orderBy: { sortOrder: "asc" },
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

  // Find the author's role in this specific community from the included memberships
  const authorRole = post.author.memberships.find(
    (m) => m.communityId === post.communityId
  )?.role ?? null;

  return {
    ...post,
    author: {
      id: post.author.id,
      name: post.author.name,
      image: post.author.image,
      username: post.author.username,
      isPublic: post.author.isPublic,
      role: authorRole,
    },
    userVote: userId && "votes" in post ? post.votes[0]?.value ?? 0 : 0,
    commentCount: post.commentCount,
  };
}

/**
 * Filter parameters for public posts
 */
export interface GetPublicPostsParams {
  sort?: PostSortType;
  limit?: number;
  cursor?: string;
  userId?: string;
  issueTagSlugs?: string[];
}

/**
 * Get posts from all PUBLIC communities for global forum
 * Supports filtering by post type and issue tags
 */
export async function getPublicPosts(
  sortOrParams: PostSortType | GetPublicPostsParams,
  limitArg?: number,
  cursorArg?: string,
  userIdArg?: string
) {
  // Support both old positional args and new params object
  let sort: PostSortType;
  let limit: number;
  let cursor: string | undefined;
  let userId: string | undefined;
  let issueTagSlugs: string[] | undefined;

  if (typeof sortOrParams === "object") {
    sort = sortOrParams.sort ?? "hot";
    limit = sortOrParams.limit ?? 20;
    cursor = sortOrParams.cursor;
    userId = sortOrParams.userId;
    issueTagSlugs = sortOrParams.issueTagSlugs;
  } else {
    sort = sortOrParams;
    limit = limitArg ?? 20;
    cursor = cursorArg;
    userId = userIdArg;
  }

  // For hot sort, use raw SQL to compute and sort by hot score in the database
  if (sort === "hot") {
    // Build parameterized query for hot-sorted IDs
    const params: unknown[] = [limit + 1];
    let paramIdx = 2;

    // Build WHERE clause for issue tag filters
    let tagJoin = "";
    if (issueTagSlugs?.length) {
      for (const slug of issueTagSlugs) {
        tagJoin += ` AND EXISTS (SELECT 1 FROM "_IssueTagToPost" itp JOIN "IssueTag" it ON it."id" = itp."A" WHERE itp."B" = p."id" AND it."slug" = $${paramIdx})`;
        params.push(slug);
        paramIdx++;
      }
    }

    let cursorClause = "";
    if (cursor) {
      cursorClause = ` AND (p."voteScore" - EXTRACT(EPOCH FROM (NOW() - p."createdAt")) / 7200) < (SELECT "voteScore" - EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 7200 FROM "Post" WHERE "id" = $${paramIdx})`;
      params.push(cursor);
      paramIdx++;
    }

    const hotIds = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT p."id" FROM "Post" p
       JOIN "Community" c ON c."id" = p."communityId"
       WHERE p."deletedAt" IS NULL AND c."type" = 'PUBLIC'${tagJoin}${cursorClause}
       ORDER BY (p."voteScore" - EXTRACT(EPOCH FROM (NOW() - p."createdAt")) / 7200) DESC
       LIMIT $1`,
      ...params
    );

    if (hotIds.length === 0) {
      return { posts: [], nextCursor: undefined, hasMore: false };
    }

    const orderedIds = hotIds.map((r) => r.id);

    // Fetch full post data with relations
    const posts = await prisma.post.findMany({
      where: { id: { in: orderedIds } },
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
        issueTags: {
          select: {
            slug: true,
            name: true,
          },
          orderBy: { sortOrder: "asc" },
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

    // Restore hot-score order
    const postsById = new Map(posts.map((p) => [p.id, p]));
    const sortedPosts = orderedIds.map((id) => postsById.get(id)!).filter(Boolean);

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
        issueTags: post.issueTags,
        userVote: userId && "votes" in post ? post.votes[0]?.value ?? 0 : 0,
        commentCount: post.commentCount,
      })),
      nextCursor,
      hasMore,
    };
  }

  // Build order by clause for non-hot sorts
  const orderBy: object[] =
    sort === "top"
      ? [{ voteScore: "desc" as const }, { createdAt: "desc" as const }]
      : [{ createdAt: "desc" as const }];

  // Build where conditions
  const andConditions: Prisma.PostWhereInput[] = [
    { deletedAt: null },
    { community: { type: "PUBLIC" } },
  ];

  // Issue tag filter (AND logic)
  if (issueTagSlugs?.length) {
    for (const slug of issueTagSlugs) {
      andConditions.push({ issueTags: { some: { slug } } });
    }
  }

  const whereConditions: Prisma.PostWhereInput = { AND: andConditions };

  const posts = await prisma.post.findMany({
    where: whereConditions,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
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
      issueTags: {
        select: {
          slug: true,
          name: true,
        },
        orderBy: { sortOrder: "asc" },
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

  const sortedPosts = posts;

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
      issueTags: post.issueTags,
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

  // Step 2: Fetch ALL replies for this post in a single query
  const topLevelIds = new Set(paginatedTopLevel.map((c) => c.id));
  const allRepliesRaw = await prisma.comment.findMany({
    where: { postId, parentId: { not: null }, deletedAt: null },
    orderBy,
    include: commentInclude,
  });

  // Filter to only keep descendants of the paginated top-level comments
  // Build a Set of valid ancestor IDs, then walk replies keeping those with a valid parent
  const validIds = new Set<string>(topLevelIds);
  // Sort by depth so we process parents before children
  const sortedReplies = [...allRepliesRaw].sort((a, b) => a.depth - b.depth);
  const allReplies: typeof topLevelRaw = [];
  for (const reply of sortedReplies) {
    if (reply.parentId && validIds.has(reply.parentId)) {
      validIds.add(reply.id);
      allReplies.push(reply);
    }
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
