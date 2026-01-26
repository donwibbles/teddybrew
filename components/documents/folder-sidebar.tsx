"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FolderOpen,
  FolderClosed,
  FileText,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface FolderSidebarProps {
  communitySlug: string;
  folders: Folder[];
  counts: DocumentCounts;
  canEdit: boolean;
  onCreateFolder?: () => void;
  onEditFolder?: (folder: Folder) => void;
  onDeleteFolder?: (folderId: string) => void;
}

export function FolderSidebar({
  communitySlug,
  folders,
  counts,
  canEdit,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
}: FolderSidebarProps) {
  const searchParams = useSearchParams();
  const currentFolder = searchParams.get("folder");
  const currentStatus = searchParams.get("status");
  const [expandedFolders] = useState<Set<string>>(new Set());

  const baseUrl = `/communities/${communitySlug}/docs`;

  const buildUrl = (params: Record<string, string | null>) => {
    const newParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) newParams.set(key, value);
    });
    const queryString = newParams.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  };

  return (
    <div className="w-full space-y-2">
      {/* All Documents */}
      <Link
        href={baseUrl}
        className={cn(
          "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
          !currentFolder && !currentStatus
            ? "bg-primary-50 text-primary-700 font-medium"
            : "text-neutral-700 hover:bg-neutral-100"
        )}
      >
        <span className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          All Documents
        </span>
        <span className="text-xs text-neutral-500">{counts.total}</span>
      </Link>

      {/* Status Filters */}
      <div className="space-y-1 pt-2">
        <p className="px-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
          Status
        </p>

        {canEdit && (
          <Link
            href={buildUrl({ status: "DRAFT" })}
            className={cn(
              "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
              currentStatus === "DRAFT"
                ? "bg-amber-50 text-amber-700 font-medium"
                : "text-neutral-700 hover:bg-neutral-100"
            )}
          >
            <span>Drafts</span>
            <span className="text-xs text-neutral-500">{counts.drafts}</span>
          </Link>
        )}

        <Link
          href={buildUrl({ status: "PUBLISHED" })}
          className={cn(
            "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
            currentStatus === "PUBLISHED"
              ? "bg-green-50 text-green-700 font-medium"
              : "text-neutral-700 hover:bg-neutral-100"
          )}
        >
          <span>Published</span>
          <span className="text-xs text-neutral-500">{counts.published}</span>
        </Link>

        {canEdit && (
          <Link
            href={buildUrl({ status: "ARCHIVED" })}
            className={cn(
              "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
              currentStatus === "ARCHIVED"
                ? "bg-neutral-200 text-neutral-700 font-medium"
                : "text-neutral-700 hover:bg-neutral-100"
            )}
          >
            <span className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Archived
            </span>
            <span className="text-xs text-neutral-500">{counts.archived}</span>
          </Link>
        )}
      </div>

      {/* Folders */}
      <div className="space-y-1 pt-4">
        <div className="flex items-center justify-between px-3">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Folders
          </p>
          {canEdit && onCreateFolder && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onCreateFolder}
              title="Create folder"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {folders.length === 0 ? (
          <p className="px-3 py-2 text-sm text-neutral-500">
            No folders yet
          </p>
        ) : (
          <div className="space-y-1">
            {folders.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                baseUrl={baseUrl}
                isActive={currentFolder === folder.slug}
                isExpanded={expandedFolders.has(folder.id)}
                canEdit={canEdit}
                onEdit={onEditFolder ? () => onEditFolder(folder) : undefined}
                onDelete={onDeleteFolder ? () => onDeleteFolder(folder.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface FolderItemProps {
  folder: Folder;
  baseUrl: string;
  isActive: boolean;
  isExpanded: boolean;
  canEdit: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

function FolderItem({
  folder,
  baseUrl,
  isActive,
  isExpanded,
  canEdit,
  onEdit,
  onDelete,
}: FolderItemProps) {
  return (
    <div className="group">
      <div
        className={cn(
          "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-primary-50 text-primary-700 font-medium"
            : "text-neutral-700 hover:bg-neutral-100"
        )}
      >
        <Link
          href={`${baseUrl}?folder=${folder.slug}`}
          className="flex flex-1 items-center gap-2"
        >
          {isActive || isExpanded ? (
            <FolderOpen className="h-4 w-4 flex-shrink-0" />
          ) : (
            <FolderClosed className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="truncate">{folder.name}</span>
        </Link>

        <div className="flex items-center gap-1">
          <span className="text-xs text-neutral-500">{folder.documentCount}</span>

          {canEdit && (onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={onDelete}
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
      </div>
    </div>
  );
}
