"use client";

import { formatDistanceToNow, format } from "date-fns";
import { Pin, Clock, FolderOpen, History, Edit, Lock } from "lucide-react";
import type { JSONContent } from "@tiptap/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DocumentStatusBadge } from "./document-status-badge";
import { TipTapViewer } from "./tiptap";
import { DocumentStatus } from "@prisma/client";
import Link from "next/link";

interface DocumentViewerProps {
  document: {
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
  };
  canEdit: boolean;
  onVersionHistory?: () => void;
}

export function DocumentViewer({
  document,
  canEdit,
  onVersionHistory,
}: DocumentViewerProps) {
  const editHref = `/communities/${document.community.slug}/docs/${document.slug}/edit`;

  return (
    <article className="mx-auto max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
        <Link
          href={`/communities/${document.community.slug}`}
          className="hover:text-primary-600"
        >
          {document.community.name}
        </Link>
        <span>/</span>
        <Link
          href={`/communities/${document.community.slug}/docs`}
          className="hover:text-primary-600"
        >
          Docs
        </Link>
      </div>

      {/* Header */}
      <header className="mb-8">
        {/* Status and Actions Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <DocumentStatusBadge status={document.status} />
            {document.isPinned && (
              <span className="flex items-center gap-1 text-sm text-primary-600">
                <Pin className="h-4 w-4 fill-primary-500" />
                Pinned
              </span>
            )}
            {document.isLocked && document.lockedBy && (
              <span className="flex items-center gap-1 text-sm text-amber-600">
                <Lock className="h-4 w-4" />
                Being edited by {document.lockedBy.name}
              </span>
            )}
          </div>

          {canEdit && (
            <div className="flex items-center gap-2">
              {onVersionHistory && (
                <Button variant="outline" size="sm" onClick={onVersionHistory}>
                  <History className="mr-2 h-4 w-4" />
                  Version History
                </Button>
              )}
              <Button asChild size="sm">
                <Link href={editHref}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-neutral-900 md:text-4xl">
          {document.title}
        </h1>

        {/* Meta Info */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-neutral-600">
          {/* Author */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={document.author.image || undefined} />
              <AvatarFallback className="text-xs">
                {document.author.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <span>
              Created by <strong>{document.author.name || "Unknown"}</strong>
            </span>
          </div>

          {/* Published By (if different from author) */}
          {document.publishedBy &&
            document.publishedBy.id !== document.author.id && (
              <div className="flex items-center gap-2">
                <span className="text-neutral-300">|</span>
                <span>
                  Published by{" "}
                  <strong>{document.publishedBy.name || "Unknown"}</strong>
                </span>
              </div>
            )}

          {/* Folder */}
          {document.folder && (
            <>
              <span className="text-neutral-300">|</span>
              <Link
                href={`/communities/${document.community.slug}/docs?folder=${document.folder.slug}`}
                className="flex items-center gap-1 hover:text-primary-600"
              >
                <FolderOpen className="h-4 w-4" />
                {document.folder.name}
              </Link>
            </>
          )}
        </div>

        {/* Dates */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Created {format(new Date(document.createdAt), "MMM d, yyyy")}
          </span>

          {document.publishedAt && (
            <span>
              Published{" "}
              {formatDistanceToNow(new Date(document.publishedAt), {
                addSuffix: true,
              })}
            </span>
          )}

          <span>
            Last updated{" "}
            {formatDistanceToNow(new Date(document.updatedAt), {
              addSuffix: true,
            })}
          </span>

          <span>Version {document.version}</span>
        </div>
      </header>

      {/* Content */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 md:p-8">
        <TipTapViewer content={document.content as JSONContent} />
      </div>
    </article>
  );
}

/**
 * Skeleton loader for document viewer
 */
export function DocumentViewerSkeleton() {
  return (
    <article className="mx-auto max-w-4xl animate-pulse">
      <header className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-6 w-20 rounded-full bg-neutral-200" />
        </div>
        <div className="h-10 w-3/4 rounded bg-neutral-200" />
        <div className="mt-4 flex items-center gap-4">
          <div className="h-6 w-6 rounded-full bg-neutral-200" />
          <div className="h-4 w-32 rounded bg-neutral-200" />
        </div>
      </header>
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="space-y-4">
          <div className="h-4 w-full rounded bg-neutral-200" />
          <div className="h-4 w-5/6 rounded bg-neutral-200" />
          <div className="h-4 w-4/6 rounded bg-neutral-200" />
          <div className="h-4 w-full rounded bg-neutral-200" />
          <div className="h-4 w-3/4 rounded bg-neutral-200" />
        </div>
      </div>
    </article>
  );
}
