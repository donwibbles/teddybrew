"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DocumentCard } from "./document-card";
import { FolderSidebar } from "./folder-sidebar";
import { FolderDialog } from "./folder-dialog";
import {
  pinDocument,
  archiveDocument,
  restoreDocument,
  deleteDocument,
  createFolder,
  updateFolder,
  deleteFolder,
} from "@/lib/actions/document";
import { DocumentStatus } from "@prisma/client";

interface Document {
  id: string;
  title: string;
  slug: string;
  status: DocumentStatus;
  isPinned: boolean;
  updatedAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
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
}

interface Folder {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  documentCount: number;
}

interface DocumentCounts {
  total: number;
  drafts: number;
  published: number;
  archived: number;
}

interface DocumentListProps {
  communityId: string;
  communitySlug: string;
  documents: Document[];
  folders: Folder[];
  counts: DocumentCounts;
  canEdit: boolean;
  currentFilter?: {
    folder?: string;
    status?: string;
  };
}

export function DocumentList({
  communityId,
  communitySlug,
  documents,
  folders,
  counts,
  canEdit,
  currentFilter,
}: DocumentListProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  // Document actions
  const handlePin = useCallback(async (documentId: string, isPinned: boolean) => {
    const result = await pinDocument({ documentId, isPinned });
    if (result.success) {
      router.refresh();
    }
  }, [router]);

  const handleArchive = useCallback(async (documentId: string) => {
    const result = await archiveDocument({ documentId });
    if (result.success) {
      router.refresh();
    }
  }, [router]);

  const handleRestore = useCallback(async (documentId: string) => {
    const result = await restoreDocument({ documentId });
    if (result.success) {
      router.refresh();
    }
  }, [router]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!documentToDelete) return;

    setIsDeleting(true);
    const result = await deleteDocument({ documentId: documentToDelete });
    setIsDeleting(false);

    if (result.success) {
      setDocumentToDelete(null);
      router.refresh();
    }
  }, [documentToDelete, router]);

  // Folder actions
  const handleCreateFolder = useCallback(() => {
    setFolderToEdit(null);
    setFolderDialogOpen(true);
  }, []);

  const handleEditFolder = useCallback((folder: Folder) => {
    setFolderToEdit(folder);
    setFolderDialogOpen(true);
  }, []);

  const handleFolderSave = useCallback(async (data: { name: string; description?: string }) => {
    if (folderToEdit) {
      // Update
      const result = await updateFolder({
        folderId: folderToEdit.id,
        name: data.name,
        description: data.description,
      });
      if (result.success) {
        setFolderDialogOpen(false);
        setFolderToEdit(null);
        router.refresh();
      }
      return result;
    } else {
      // Create
      const result = await createFolder({
        communityId,
        name: data.name,
        description: data.description,
      });
      if (result.success) {
        setFolderDialogOpen(false);
        router.refresh();
      }
      return result;
    }
  }, [folderToEdit, communityId, router]);

  const handleDeleteFolderConfirm = useCallback(async () => {
    if (!folderToDelete) return;

    setIsDeleting(true);
    const result = await deleteFolder({ folderId: folderToDelete });
    setIsDeleting(false);

    if (result.success) {
      setFolderToDelete(null);
      router.refresh();
    }
  }, [folderToDelete, router]);

  // Get filter title
  const getFilterTitle = () => {
    if (currentFilter?.folder) {
      const folder = folders.find(f => f.slug === currentFilter.folder);
      return folder?.name || "Folder";
    }
    if (currentFilter?.status === "DRAFT") return "Drafts";
    if (currentFilter?.status === "PUBLISHED") return "Published";
    if (currentFilter?.status === "ARCHIVED") return "Archived";
    return "All Documents";
  };

  return (
    <>
      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-shrink-0 lg:block">
          <div className="sticky top-20">
            <FolderSidebar
              communitySlug={communitySlug}
              folders={folders}
              counts={counts}
              canEdit={canEdit}
              onCreateFolder={canEdit ? handleCreateFolder : undefined}
              onEditFolder={canEdit ? handleEditFolder : undefined}
              onDeleteFolder={canEdit ? setFolderToDelete : undefined}
            />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-900">
              {getFilterTitle()}
            </h2>
            {canEdit && (
              <Button asChild>
                <a href={`/communities/${communitySlug}/docs/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Document
                </a>
              </Button>
            )}
          </div>

          {/* Document Grid */}
          {documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              description={
                canEdit
                  ? "Create your first document to share guides, FAQs, or reference content with your community."
                  : "No documents have been published yet."
              }
              action={
                canEdit ? (
                  <Button asChild>
                    <a href={`/communities/${communitySlug}/docs/new`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Document
                    </a>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {documents.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  communitySlug={communitySlug}
                  canEdit={canEdit}
                  onPin={canEdit ? handlePin : undefined}
                  onArchive={canEdit ? handleArchive : undefined}
                  onRestore={canEdit ? handleRestore : undefined}
                  onDelete={canEdit ? setDocumentToDelete : undefined}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Delete Document Dialog */}
      <AlertDialog
        open={!!documentToDelete}
        onOpenChange={(open) => !open && setDocumentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-error-500 hover:bg-error-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Folder Dialog */}
      <AlertDialog
        open={!!folderToDelete}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this folder? Documents in this folder
              will be moved to &quot;All Documents&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolderConfirm}
              disabled={isDeleting}
              className="bg-error-500 hover:bg-error-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Folder Dialog */}
      <FolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        folder={folderToEdit}
        onSave={handleFolderSave}
      />
    </>
  );
}
