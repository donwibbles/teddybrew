"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Pin, MoreVertical, Pencil, Trash2, Archive, RotateCcw, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DocumentStatusBadge } from "./document-status-badge";
import { DocumentStatus } from "@prisma/client";

interface DocumentCardProps {
  document: {
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
  };
  communitySlug: string;
  canEdit: boolean;
  onPin?: (documentId: string, isPinned: boolean) => void;
  onArchive?: (documentId: string) => void;
  onRestore?: (documentId: string) => void;
  onDelete?: (documentId: string) => void;
}

export function DocumentCard({
  document,
  communitySlug,
  canEdit,
  onPin,
  onArchive,
  onRestore,
  onDelete,
}: DocumentCardProps) {
  const href = `/communities/${communitySlug}/docs/${document.slug}`;
  const editHref = `${href}/edit`;

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-neutral-200 bg-white p-4 transition-shadow hover:shadow-md",
        document.isPinned && "border-primary-200 bg-primary-50/30"
      )}
    >
      {/* Pinned indicator */}
      {document.isPinned && (
        <div className="absolute -left-1 top-4">
          <Pin className="h-4 w-4 fill-primary-500 text-primary-500" />
        </div>
      )}

      {/* Header with title and actions */}
      <div className="flex items-start justify-between gap-2">
        <Link href={href} className="flex-1">
          <h3 className="font-semibold text-neutral-900 hover:text-primary-600">
            {document.title}
          </h3>
        </Link>

        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={editHref}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              {onPin && (
                <DropdownMenuItem
                  onClick={() => onPin(document.id, !document.isPinned)}
                >
                  <Pin className="mr-2 h-4 w-4" />
                  {document.isPinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {document.status !== DocumentStatus.ARCHIVED ? (
                onArchive && (
                  <DropdownMenuItem
                    onClick={() => onArchive(document.id)}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                )
              ) : (
                onRestore && (
                  <DropdownMenuItem
                    onClick={() => onRestore(document.id)}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                )
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(document.id)}
                  className="text-error-600 focus:text-error-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
        <DocumentStatusBadge status={document.status} />

        {document.folder && (
          <span className="flex items-center gap-1">
            <FolderOpen className="h-3 w-3" />
            {document.folder.name}
          </span>
        )}

        <span className="text-neutral-300">|</span>

        <span>
          Updated {formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true })}
        </span>
      </div>

      {/* Author and lock status */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={document.author.image || undefined} />
            <AvatarFallback className="text-xs">
              {document.author.name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-neutral-600">
            {document.author.name || "Unknown"}
          </span>
        </div>

        {document.isLocked && document.lockedBy && (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            Being edited by {document.lockedBy.name}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Compact card variant for sidebar lists
 */
interface CompactDocumentCardProps {
  document: {
    id: string;
    title: string;
    slug: string;
    status: DocumentStatus;
    isPinned: boolean;
  };
  communitySlug: string;
  isActive?: boolean;
}

export function CompactDocumentCard({
  document,
  communitySlug,
  isActive,
}: CompactDocumentCardProps) {
  return (
    <Link
      href={`/communities/${communitySlug}/docs/${document.slug}`}
      className={cn(
        "block rounded-md px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-primary-50 text-primary-700"
          : "text-neutral-700 hover:bg-neutral-100"
      )}
    >
      <div className="flex items-center gap-2">
        {document.isPinned && (
          <Pin className="h-3 w-3 flex-shrink-0 fill-primary-500 text-primary-500" />
        )}
        <span className="truncate">{document.title}</span>
      </div>
    </Link>
  );
}
