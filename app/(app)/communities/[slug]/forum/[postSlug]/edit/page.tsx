import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPostBySlug } from "@/lib/db/posts";
import { getIssueTags } from "@/lib/actions/community";
import { getSession } from "@/lib/dal";
import { EditPostForm } from "@/components/forum/edit-post-form";

interface EditPostPageProps {
  params: Promise<{ slug: string; postSlug: string }>;
}

export async function generateMetadata({ params }: EditPostPageProps) {
  const { slug, postSlug } = await params;
  const post = await getPostBySlug(slug, postSlug);

  if (!post) {
    return { title: "Post Not Found" };
  }

  return {
    title: `Edit Post - ${post.community.name} - Hive Community`,
  };
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { slug, postSlug } = await params;

  const session = await getSession();
  if (!session?.user) {
    redirect(`/sign-in?callbackUrl=/communities/${slug}/forum/${postSlug}/edit`);
  }

  const [post, availableTags] = await Promise.all([
    getPostBySlug(slug, postSlug, session.user.id!),
    getIssueTags(),
  ]);

  if (!post) {
    notFound();
  }

  // Only author can edit
  if (post.author.id !== session.user.id) {
    redirect(`/communities/${slug}/forum/${postSlug}`);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href={`/communities/${slug}/forum/${postSlug}`}
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Post
      </Link>

      {/* Form Card */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">
          Edit post
        </h1>
        <EditPostForm
          postId={post.id}
          postSlug={post.slug}
          communitySlug={post.community.slug}
          initialTitle={post.title}
          initialContent={post.content}
          initialContentJson={post.contentJson as import("@tiptap/react").JSONContent | null}
          initialTagIds={post.issueTags?.map((t) => t.id) || []}
          availableTags={availableTags}
        />
      </div>
    </div>
  );
}
