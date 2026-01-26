import { notFound, redirect } from "next/navigation";
import { getPostById, getPostComments } from "@/lib/db/posts";
import { getMembershipStatus } from "@/lib/actions/membership";
import { getCurrentUserId } from "@/lib/dal";
import { PostDetail } from "@/components/forum/post-detail";
import { CommentsSection } from "@/components/forum/comments-section";

interface PostPageProps {
  params: Promise<{ slug: string; postId: string }>;
  searchParams: Promise<{ commentSort?: string }>;
}

export async function generateMetadata({ params }: PostPageProps) {
  const { postId } = await params;
  const post = await getPostById(postId);

  if (!post) {
    return { title: "Post Not Found" };
  }

  return {
    title: `${post.title} - ${post.community.name} - Hive Community`,
    description: post.content.slice(0, 160),
  };
}

export default async function PostPage({ params, searchParams }: PostPageProps) {
  const { slug, postId } = await params;
  const { commentSort } = await searchParams;

  const userId = await getCurrentUserId();
  const post = await getPostById(postId, userId || undefined);

  if (!post) {
    notFound();
  }

  // Verify slug matches community
  if (post.community.slug !== slug) {
    redirect(`/communities/${post.community.slug}/forum/${postId}`);
  }

  const membership = await getMembershipStatus(post.community.id);

  // Private community - non-members cannot view posts
  if (
    post.community.ownerId !== userId &&
    !membership.isMember
  ) {
    const communityType = await (
      await import("@/lib/prisma")
    ).prisma.community.findUnique({
      where: { id: post.community.id },
      select: { type: true },
    });

    if (communityType?.type === "PRIVATE") {
      redirect(`/communities/${slug}`);
    }
  }

  const sort = commentSort === "new" ? "new" : "best";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comments = await getPostComments(postId, sort, userId || undefined) as any[];

  const isAuthor = userId === post.author.id;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Post Detail */}
      <PostDetail
        id={post.id}
        title={post.title}
        content={post.content}
        author={post.author}
        createdAt={post.createdAt}
        updatedAt={post.updatedAt}
        voteScore={post.voteScore}
        userVote={post.userVote}
        isPinned={post.isPinned}
        communitySlug={post.community.slug}
        isAuthor={isAuthor}
        canModerate={membership.canModerate}
      />

      {/* Comments Section */}
      <CommentsSection
        postId={post.id}
        comments={comments}
        commentCount={post.commentCount}
        currentUserId={userId || undefined}
        canModerate={membership.canModerate}
        isMember={membership.isMember}
        currentSort={sort}
        basePath={`/communities/${slug}/forum/${postId}`}
      />
    </div>
  );
}
