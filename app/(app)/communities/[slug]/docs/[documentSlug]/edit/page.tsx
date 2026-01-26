import { notFound, redirect } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { getCommunityWithDetails } from "@/lib/db/communities";
import { getMembershipStatus } from "@/lib/actions/membership";
import { getDocumentBySlug, getFolders } from "@/lib/db/documents";
import { getCurrentUserId } from "@/lib/dal";
import { DocumentForm } from "@/components/documents";

interface EditDocumentPageProps {
  params: Promise<{ slug: string; documentSlug: string }>;
}

export async function generateMetadata({ params }: EditDocumentPageProps) {
  const { slug, documentSlug } = await params;
  const document = await getDocumentBySlug(slug, documentSlug);

  if (!document) {
    return { title: "Document Not Found" };
  }

  return {
    title: `Edit: ${document.title} - ${document.community.name} - Hive Community`,
    description: `Edit ${document.title} document`,
  };
}

export default async function EditDocumentPage({ params }: EditDocumentPageProps) {
  const { slug, documentSlug } = await params;

  const community = await getCommunityWithDetails(slug);

  if (!community) {
    notFound();
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect(`/auth/signin?callbackUrl=/communities/${slug}/docs/${documentSlug}/edit`);
  }

  const membership = await getMembershipStatus(community.id);

  // Only owners and moderators can edit documents
  if (!membership.isOwner && !membership.isModerator) {
    redirect(`/communities/${slug}/docs/${documentSlug}`);
  }

  const document = await getDocumentBySlug(slug, documentSlug);

  if (!document) {
    notFound();
  }

  const folders = await getFolders(community.id);

  // Transform document for the form
  const documentData = {
    id: document.id,
    title: document.title,
    slug: document.slug,
    content: document.content as JSONContent,
    status: document.status,
    folderId: document.folderId,
    version: document.version,
    isLocked: document.isLocked,
    lockedById: document.lockedById,
  };

  return (
    <div className="h-[calc(100vh-200px)] min-h-[600px]">
      <DocumentForm
        communityId={community.id}
        communitySlug={community.slug}
        document={documentData}
        folders={folders}
        currentUserId={userId}
      />
    </div>
  );
}
