import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPostById } from "@/lib/db/posts";
import { getSession } from "@/lib/dal";
import { EditPostForm } from "@/components/forum/edit-post-form";

interface EditPostPageProps {
  params: Promise<{ slug: string; postId: string }>;
}

export async function generateMetadata({ params }: EditPostPageProps) {
  const { postId } = await params;
  const post = await getPostById(postId);

  if (!post) {
    return { title: "Post Not Found" };
  }

  return {
    title: `Edit Post - ${post.community.name} - Hive Community`,
  };
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { slug, postId } = await params;

  const session = await getSession();
  if (!session?.user) {
    redirect(`/sign-in?callbackUrl=/communities/${slug}/forum/${postId}/edit`);
  }

  const post = await getPostById(postId, session.user.id!);

  if (!post) {
    notFound();
  }

  // Verify slug matches community
  if (post.community.slug !== slug) {
    redirect(`/communities/${post.community.slug}/forum/${postId}/edit`);
  }

  // Only author can edit
  if (post.author.id !== session.user.id) {
    redirect(`/communities/${slug}/forum/${postId}`);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href={`/communities/${slug}/forum/${postId}`}
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
          communitySlug={post.community.slug}
          initialTitle={post.title}
          initialContent={post.content}
          initialContentJson={post.contentJson as import("@tiptap/react").JSONContent | null}
        />
      </div>
    </div>
  );
}
