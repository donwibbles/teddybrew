import { notFound, redirect } from "next/navigation";
import { getCommunityWithDetails } from "@/lib/db/communities";
import { getMembershipStatus } from "@/lib/actions/membership";
import { getFolders } from "@/lib/db/documents";
import { getCurrentUserId } from "@/lib/dal";
import { DocumentForm } from "@/components/documents";

interface NewDocumentPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: NewDocumentPageProps) {
  const { slug } = await params;
  const community = await getCommunityWithDetails(slug);

  if (!community) {
    return { title: "Community Not Found" };
  }

  return {
    title: `New Document - ${community.name} - Hive Community`,
    description: `Create a new document for ${community.name}`,
  };
}

export default async function NewDocumentPage({ params }: NewDocumentPageProps) {
  const { slug } = await params;

  const community = await getCommunityWithDetails(slug);

  if (!community) {
    notFound();
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect(`/auth/signin?callbackUrl=/communities/${slug}/docs/new`);
  }

  const membership = await getMembershipStatus(community.id);

  // Only owners and moderators can create documents
  if (!membership.isOwner && !membership.isModerator) {
    redirect(`/communities/${slug}/docs`);
  }

  const folders = await getFolders(community.id);

  return (
    <div className="h-[calc(100vh-200px)] min-h-[600px]">
      <DocumentForm
        communityId={community.id}
        communitySlug={community.slug}
        folders={folders}
        currentUserId={userId}
        isNew
      />
    </div>
  );
}
