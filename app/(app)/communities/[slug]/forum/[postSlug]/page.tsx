import { notFound, redirect } from "next/navigation";
import { getPostBySlug, getPostComments } from "@/lib/db/posts";
import { getMembershipStatus } from "@/lib/actions/membership";
import { getCurrentUserId } from "@/lib/dal";
import { PostDetail } from "@/components/forum/post-detail";
import { CommentsSection } from "@/components/forum/comments-section";

interface PostPageProps {
  params: Promise<{ slug: string; postSlug: string }>;
  searchParams: Promise<{ commentSort?: string }>;
}

export async function generateMetadata({ params }: PostPageProps) {
  const { slug, postSlug } = await params;
  const post = await getPostBySlug(slug, postSlug);

  if (!post) {
    return { title: "Post Not Found" };
  }

  return {
    title: `${post.title} - ${post.community.name} - Hive Community`,
    description: post.content.slice(0, 160),
  };
}

export default async function PostPage({ params, searchParams }: PostPageProps) {
  const { slug, postSlug } = await params;
  const { commentSort } = await searchParams;

  const userId = await getCurrentUserId();
  const post = await getPostBySlug(slug, postSlug, userId || undefined);

  if (!post) {
    notFound();
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
  const { comments, hasMore: hasMoreComments } = await getPostComments(post.id, sort, userId || undefined);

  const isAuthor = userId === post.author.id;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Post Detail */}
      <PostDetail
        id={post.id}
        slug={post.slug}
        title={post.title}
        content={post.content}
        contentJson={post.contentJson as import("@tiptap/react").JSONContent | null}
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
        basePath={`/communities/${slug}/forum/${postSlug}`}
        hasMoreComments={hasMoreComments}
      />
    </div>
  );
}
