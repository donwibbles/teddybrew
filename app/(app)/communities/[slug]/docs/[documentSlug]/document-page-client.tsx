"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { DocumentViewer } from "@/components/documents";
import { VersionHistoryDialog } from "@/components/documents/version-history-dialog";
import { DocumentStatus } from "@prisma/client";

interface DocumentData {
  id: string;
  title: string;
  slug: string;
  content: JSONContent;
  contentHtml: string;
  status: DocumentStatus;
  isPinned: boolean;
  version: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  publishedBy: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  folder: {
    id: string;
    name: string;
    slug: string;
  } | null;
  isLocked: boolean;
  lockedBy: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  community: {
    id: string;
    slug: string;
    name: string;
  };
}

interface DocumentPageClientProps {
  document: DocumentData;
  canEdit: boolean;
}

export function DocumentPageClient({ document, canEdit }: DocumentPageClientProps) {
  const router = useRouter();
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);

  const handleRestore = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <>
      <DocumentViewer
        document={document}
        canEdit={canEdit}
        onVersionHistory={() => setVersionDialogOpen(true)}
      />
      <VersionHistoryDialog
        open={versionDialogOpen}
        onOpenChange={setVersionDialogOpen}
        documentId={document.id}
        onRestore={handleRestore}
      />
    </>
  );
}
