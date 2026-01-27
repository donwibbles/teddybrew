"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { JSONContent } from "@tiptap/react";
import { ArrowLeft, Save, Eye, Users, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { TipTapEditor } from "./tiptap";
import { DocumentStatusBadge } from "./document-status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createDocument,
  updateDocument,
  publishDocument,
  lockDocument,
  unlockDocument,
  refreshDocumentLock,
} from "@/lib/actions/document";
import { DocumentStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";

interface Folder {
  id: string;
  name: string;
  slug: string;
}

interface Viewer {
  id: string;
  name: string | null;
  image: string | null;
}

interface DocumentFormProps {
  communityId: string;
  communitySlug: string;
  document?: {
    id: string;
    title: string;
    slug: string;
    content: JSONContent;
    status: DocumentStatus;
    folderId: string | null;
    version: number;
    isLocked: boolean;
    lockedById: string | null;
  } | null;
  folders: Folder[];
  currentUserId: string;
  viewers?: Viewer[];
  isNew?: boolean;
}

// Autosave debounce time (30 seconds)
const AUTOSAVE_DEBOUNCE_MS = 30000;
// Lock refresh interval (2 minutes)
const LOCK_REFRESH_MS = 2 * 60 * 1000;

export function DocumentForm({
  communityId,
  communitySlug,
  document,
  folders,
  currentUserId,
  viewers = [],
  isNew = false,
}: DocumentFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(document?.title || "");
  const [content, setContent] = useState<JSONContent>(
    document?.content || { type: "doc", content: [{ type: "paragraph" }] }
  );
  const [contentHtml, setContentHtml] = useState("");
  const [folderId, setFolderId] = useState<string | null>(document?.folderId || null);
  const [status, setStatus] = useState<DocumentStatus>(document?.status || DocumentStatus.DRAFT);

  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Lock state
  const [, setIsLocked] = useState(document?.isLocked || false);
  const [lockedByOther, setLockedByOther] = useState(
    document?.isLocked && document?.lockedById !== currentUserId
  );

  // Refs for autosave
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lockRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const documentIdRef = useRef(document?.id);

  const backUrl = `/communities/${communitySlug}/docs`;

  // Acquire lock on mount for existing documents
  useEffect(() => {
    if (document?.id && !isNew && !lockedByOther) {
      lockDocument({ documentId: document.id }).then((result) => {
        if (result.success) {
          setIsLocked(true);
          // Start lock refresh interval
          lockRefreshIntervalRef.current = setInterval(() => {
            if (documentIdRef.current) {
              refreshDocumentLock(documentIdRef.current);
            }
          }, LOCK_REFRESH_MS);
        } else {
          setLockedByOther(true);
          setError(result.error || "Document is locked");
        }
      });
    }

    // Cleanup: release lock on unmount
    return () => {
      if (documentIdRef.current && !isNew) {
        unlockDocument({ documentId: documentIdRef.current });
      }
      if (lockRefreshIntervalRef.current) {
        clearInterval(lockRefreshIntervalRef.current);
      }
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [document?.id, isNew, lockedByOther]);

  // Handle editor ready - get initial HTML
  const handleEditorReady = useCallback((html: string) => {
    // Only set if we don't already have content HTML (prevents override on re-mount)
    if (!contentHtml) {
      setContentHtml(html);
    }
  }, [contentHtml]);

  // Handle content change
  const handleContentChange = useCallback((newContent: JSONContent, html: string) => {
    setContent(newContent);
    setContentHtml(html);
    setHasUnsavedChanges(true);

    // Schedule autosave
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    if (documentIdRef.current) {
      autosaveTimeoutRef.current = setTimeout(() => {
        handleSave(true);
      }, AUTOSAVE_DEBOUNCE_MS);
    }
  }, []);

  // Ref to store the slug after save (for publish navigation)
  const savedSlugRef = useRef(document?.slug);

  // Internal save function that returns result (used by handleSave and handlePublish)
  const saveInternal = useCallback(async (isAutosave = false): Promise<{ success: boolean; slug?: string }> => {
    if (lockedByOther) return { success: false };
    if (!title.trim()) {
      if (!isAutosave) setError("Title is required");
      return { success: false };
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isNew || !documentIdRef.current) {
        // Create new document
        // Deep-clone content to remove TipTap prototype methods/Symbol properties
        // that can't be serialized for server actions
        const result = await createDocument({
          communityId,
          title,
          content: JSON.parse(JSON.stringify(content)),
          contentHtml,
          folderId,
        });

        if (result.success) {
          documentIdRef.current = result.data.documentId;
          savedSlugRef.current = result.data.slug;
          setLastSaved(new Date());
          setHasUnsavedChanges(false);
          return { success: true, slug: result.data.slug };
        } else {
          setError(result.error || "Failed to create document");
          return { success: false };
        }
      } else {
        // Update existing document
        // Deep-clone content to remove TipTap prototype methods/Symbol properties
        const result = await updateDocument({
          documentId: documentIdRef.current,
          title,
          content: JSON.parse(JSON.stringify(content)),
          contentHtml,
          folderId,
        });

        if (result.success) {
          setLastSaved(new Date());
          setHasUnsavedChanges(false);
          return { success: true, slug: savedSlugRef.current };
        } else {
          setError(result.error || "Failed to save document");
          return { success: false };
        }
      }
    } catch (err) {
      setError("Failed to save document");
      return { success: false };
    } finally {
      setIsSaving(false);
    }
  }, [isNew, communityId, title, content, contentHtml, folderId, lockedByOther]);

  // Save document (public handler that redirects after create)
  const handleSave = useCallback(async (isAutosave = false) => {
    const result = await saveInternal(isAutosave);
    if (result.success && result.slug && (isNew || !document?.id)) {
      // Redirect to edit page after creating new document
      router.replace(`/communities/${communitySlug}/docs/${result.slug}/edit`);
    }
  }, [saveInternal, isNew, document?.id, communitySlug, router]);

  // Publish document
  const handlePublish = useCallback(async () => {
    if (lockedByOther) return;

    // Validate title before anything
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      // For new documents, save first to create them
      if (!documentIdRef.current) {
        const saveResult = await saveInternal();
        if (!saveResult.success) {
          setIsPublishing(false);
          return;
        }
      } else if (hasUnsavedChanges) {
        // Save existing doc if there are unsaved changes
        const saveResult = await saveInternal();
        if (!saveResult.success) {
          setIsPublishing(false);
          return;
        }
      }

      // Now publish (documentIdRef.current is guaranteed to be set)
      const result = await publishDocument({
        documentId: documentIdRef.current!,
      });

      if (result.success) {
        setStatus(DocumentStatus.PUBLISHED);
        setLastSaved(new Date());
        // Navigate to view page using the saved slug
        router.push(`/communities/${communitySlug}/docs/${savedSlugRef.current}`);
      } else {
        setError(result.error || "Failed to publish document");
      }
    } catch (err) {
      setError("Failed to publish document");
    } finally {
      setIsPublishing(false);
    }
  }, [communitySlug, title, hasUnsavedChanges, saveInternal, lockedByOther, router]);

  // Handle beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={backUrl}
            className="flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Docs</span>
          </Link>

          <div className="hidden h-6 w-px bg-neutral-200 sm:block" />

          <DocumentStatusBadge status={status} />
        </div>

        <div className="flex items-center gap-2">
          {/* Viewers */}
          {viewers.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-neutral-500">
              <Users className="h-4 w-4" />
              <span>{viewers.length} viewing</span>
            </div>
          )}

          {/* Save Status */}
          <div className="text-sm text-neutral-500">
            {isSaving && (
              <span className="flex items-center gap-1">
                <LoadingSpinner size="sm" />
                Saving...
              </span>
            )}
            {!isSaving && lastSaved && (
              <span className="flex items-center gap-1">
                <Check className="h-4 w-4 text-green-500" />
                Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
              </span>
            )}
            {hasUnsavedChanges && !isSaving && (
              <span className="text-amber-600">Unsaved changes</span>
            )}
          </div>

          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave()}
            disabled={isSaving || isPublishing || lockedByOther}
          >
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>

          {status !== DocumentStatus.PUBLISHED && (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={isSaving || isPublishing || lockedByOther || !title.trim()}
            >
              {isPublishing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Publishing...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Publish
                </>
              )}
            </Button>
          )}
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 bg-error-50 px-4 py-2 text-sm text-error-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Locked Banner */}
      {lockedByOther && (
        <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4" />
          This document is being edited by another user. You can view but not edit.
        </div>
      )}

      {/* Form */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Document title"
              className="text-lg font-semibold"
              disabled={lockedByOther}
            />
          </div>

          {/* Folder */}
          <div className="space-y-2">
            <Label htmlFor="folder">Folder (optional)</Label>
            <Select
              value={folderId || "none"}
              onValueChange={(value) => {
                setFolderId(value === "none" ? null : value);
                setHasUnsavedChanges(true);
              }}
              disabled={lockedByOther}
            >
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No folder</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Editor */}
          <div className="space-y-2">
            <Label>Content</Label>
            <TipTapEditor
              content={content}
              onChange={handleContentChange}
              onEditorReady={handleEditorReady}
              communityId={communityId}
              documentId={document?.id}
              disabled={lockedByOther}
              placeholder="Start writing your document..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
