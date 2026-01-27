import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPostBySlug, getPostComments } from "@/lib/db/posts";
import { PostDetail } from "@/components/forum/post-detail";
import { CommentsSection } from "@/components/forum/comments-section";

interface PublicPostPageProps {
  params: Promise<{ slug: string; postSlug: string }>;
  searchParams: Promise<{ commentSort?: string }>;
}

export async function generateMetadata({ params }: PublicPostPageProps) {
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

export default async function PublicPostPage({ params, searchParams }: PublicPostPageProps) {
  const { slug, postSlug } = await params;
  const { commentSort } = await searchParams;
  const session = await auth();

  // Redirect authenticated users to the full experience
  if (session?.user) {
    redirect(`/communities/${slug}/forum/${postSlug}`);
  }

  const post = await getPostBySlug(slug, postSlug); // no userId for public view

  if (!post) {
    notFound();
  }

  // Check if community is private
  const communityType = await (
    await import("@/lib/prisma")
  ).prisma.community.findUnique({
    where: { id: post.community.id },
    select: { type: true },
  });

  if (communityType?.type === "PRIVATE") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 text-neutral-500 mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            Private Community
          </h1>
          <p className="text-neutral-600 mb-6">
            This post is in a private community. Sign in to request access or view if you&apos;re already a member.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary-500 text-white font-medium rounded-lg
                       hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                       transition-colors"
          >
            Sign In to View
          </Link>
        </div>
      </div>
    );
  }

  const sort = commentSort === "new" ? "new" : "best";
  const { comments, hasMore: hasMoreComments } = await getPostComments(post.id, sort);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Sign in banner */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-medium text-primary-900">
              Want to join the discussion?
            </p>
            <p className="text-sm text-primary-700 mt-1">
              Sign in to vote, comment, and participate.
            </p>
          </div>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg
                       hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                       transition-colors whitespace-nowrap"
          >
            Sign in to Join
          </Link>
        </div>
      </div>

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
        userVote={0}
        isPinned={post.isPinned}
        communitySlug={post.community.slug}
        isAuthor={false}
        canModerate={false}
        isPublicView
        basePath="/explore"
      />

      {/* Comments Section */}
      <CommentsSection
        postId={post.id}
        comments={comments}
        commentCount={post.commentCount}
        currentUserId={undefined}
        canModerate={false}
        isMember={false}
        currentSort={sort}
        basePath={`/explore/${slug}/forum/${postSlug}`}
        isPublicView
        hasMoreComments={hasMoreComments}
      />
    </div>
  );
}
