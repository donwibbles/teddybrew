import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCommunityWithDetails } from "@/lib/db/communities";
import { getMembershipStatus } from "@/lib/actions/membership";
import { getDocuments, getFolders, getDocumentCounts } from "@/lib/db/documents";
import { DocumentList } from "@/components/documents";
import { DocumentStatus } from "@prisma/client";

interface DocsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ folder?: string; status?: string }>;
}

export async function generateMetadata({ params }: DocsPageProps) {
  const { slug } = await params;
  const community = await getCommunityWithDetails(slug);

  if (!community) {
    return { title: "Community Not Found" };
  }

  return {
    title: `Docs - ${community.name} - Hive Community`,
    description: `Guides and documentation for ${community.name}`,
  };
}

export default async function DocsPage({ params, searchParams }: DocsPageProps) {
  const { slug } = await params;
  const { folder, status } = await searchParams;

  const community = await getCommunityWithDetails(slug);

  if (!community) {
    notFound();
  }

  const membership = await getMembershipStatus(community.id);

  // Private community - non-members cannot view docs
  if (community.type === "PRIVATE" && !membership.isMember) {
    redirect(`/communities/${slug}`);
  }

  // Determine what documents to fetch based on permissions
  const canEdit = membership.isOwner || membership.isModerator;
  let statusFilter: DocumentStatus | undefined;

  if (status) {
    statusFilter = status as DocumentStatus;
    // Non-editors can only see published
    if (!canEdit && statusFilter !== DocumentStatus.PUBLISHED) {
      statusFilter = DocumentStatus.PUBLISHED;
    }
  } else if (!canEdit) {
    // Non-editors only see published by default
    statusFilter = DocumentStatus.PUBLISHED;
  }

  // Get folder by slug if provided
  let folderId: string | null | undefined;
  if (folder) {
    const folders = await getFolders(community.id);
    const folderData = folders.find((f) => f.slug === folder);
    if (folderData) {
      folderId = folderData.id;
    }
  }

  // Fetch documents, folders, and counts in parallel
  const [documentsResult, folders, counts] = await Promise.all([
    getDocuments(community.id, {
      folderId,
      status: statusFilter,
      includeArchived: canEdit && status === "ARCHIVED",
      limit: 50,
    }),
    getFolders(community.id),
    getDocumentCounts(community.id),
  ]);

  // Adjust counts for non-editors (they can only see published)
  const adjustedCounts = canEdit
    ? counts
    : { ...counts, total: counts.published, drafts: 0, archived: 0 };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link
          href={`/communities/${slug}`}
          className="hover:text-primary-600"
        >
          {community.name}
        </Link>
        <span>/</span>
        <span>Docs</span>
      </div>

      <DocumentList
        communityId={community.id}
        communitySlug={community.slug}
        documents={documentsResult.documents}
        folders={folders}
        counts={adjustedCounts}
        canEdit={canEdit}
        currentFilter={{ folder, status }}
      />
    </div>
  );
}
