import { notFound, redirect } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { getCommunityWithDetails } from "@/lib/db/communities";
import { getMembershipStatus } from "@/lib/actions/membership";
import { getDocumentBySlug } from "@/lib/db/documents";
import { DocumentStatus } from "@prisma/client";
import { DocumentPageClient } from "./document-page-client";

interface DocumentPageProps {
  params: Promise<{ slug: string; documentSlug: string }>;
}

export async function generateMetadata({ params }: DocumentPageProps) {
  const { slug, documentSlug } = await params;
  const document = await getDocumentBySlug(slug, documentSlug);

  if (!document) {
    return { title: "Document Not Found" };
  }

  return {
    title: `${document.title} - ${document.community.name} - Hive Community`,
    description: `${document.title} - Document from ${document.community.name}`,
  };
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { slug, documentSlug } = await params;

  const community = await getCommunityWithDetails(slug);

  if (!community) {
    notFound();
  }

  const membership = await getMembershipStatus(community.id);

  // Private community - non-members cannot view docs
  if (community.type === "PRIVATE" && !membership.isMember) {
    redirect(`/communities/${slug}`);
  }

  const document = await getDocumentBySlug(slug, documentSlug);

  if (!document) {
    notFound();
  }

  const canEdit = membership.isOwner || membership.isModerator;

  // Non-editors can only see published documents
  if (!canEdit && document.status !== DocumentStatus.PUBLISHED) {
    notFound();
  }

  // Transform the document data for the client component
  const documentData = {
    id: document.id,
    title: document.title,
    slug: document.slug,
    content: document.content as JSONContent,
    contentHtml: document.contentHtml,
    status: document.status,
    isPinned: document.isPinned,
    version: document.version,
    publishedAt: document.publishedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    author: document.author,
    publishedBy: document.publishedBy,
    folder: document.folder,
    isLocked: document.isLocked,
    lockedBy: document.lockedBy,
    community: document.community,
  };

  return <DocumentPageClient document={documentData} canEdit={canEdit} />;
}
