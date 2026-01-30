import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCommunityWithDetails } from "@/lib/db/communities";
import { getMembershipStatus } from "@/lib/actions/membership";
import { getIssueTags } from "@/lib/actions/community";
import { getSession } from "@/lib/dal";
import { CreatePostForm } from "@/components/forum/create-post-form";

interface NewPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: NewPostPageProps) {
  const { slug } = await params;
  const community = await getCommunityWithDetails(slug);

  if (!community) {
    return { title: "Community Not Found" };
  }

  return {
    title: `New Post - ${community.name} - Hive Community`,
  };
}

export default async function NewPostPage({ params }: NewPostPageProps) {
  const { slug } = await params;
  const community = await getCommunityWithDetails(slug);

  if (!community) {
    notFound();
  }

  const session = await getSession();
  if (!session?.user) {
    redirect(`/sign-in?callbackUrl=/communities/${slug}/forum/new`);
  }

  const [membership, availableTags] = await Promise.all([
    getMembershipStatus(community.id),
    getIssueTags(),
  ]);

  // Only members can create posts
  if (!membership.isMember) {
    redirect(`/communities/${slug}/forum`);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href={`/communities/${slug}/forum`}
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Forum
      </Link>

      {/* Form Card */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">
          Create a new post
        </h1>
        <CreatePostForm
          communityId={community.id}
          communitySlug={community.slug}
          availableTags={availableTags}
        />
      </div>
    </div>
  );
}
