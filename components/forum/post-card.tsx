"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Pin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import { VoteButton } from "./vote-button";
import { MarkdownPreview } from "./markdown-renderer";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
  role?: string | null;
}

interface PostCardProps {
  id: string;
  title: string;
  content: string;
  author: Author;
  createdAt: Date | string;
  voteScore: number;
  userVote: number;
  commentCount: number;
  isPinned: boolean;
  communitySlug: string;
}

export function PostCard({
  id,
  title,
  content,
  author,
  createdAt,
  voteScore,
  userVote,
  commentCount,
  isPinned,
  communitySlug,
}: PostCardProps) {
  const timestamp =
    createdAt instanceof Date ? createdAt : new Date(createdAt);
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });

  const initials =
    author.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4 hover:border-neutral-300 transition-colors">
      <div className="flex gap-4">
        {/* Vote Column */}
        <div className="shrink-0">
          <VoteButton
            type="post"
            id={id}
            score={voteScore}
            userVote={userVote}
          />
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-start gap-2">
            {isPinned && (
              <Pin className="h-4 w-4 text-primary-500 shrink-0 mt-1" />
            )}
            <Link
              href={`/communities/${communitySlug}/forum/${id}`}
              className="font-medium text-neutral-900 hover:text-primary-600 transition-colors line-clamp-2"
            >
              {title}
            </Link>
          </div>

          {/* Preview */}
          <div className="mt-1">
            <MarkdownPreview content={content} maxLength={150} />
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-3 text-sm text-neutral-500">
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage
                  src={author.image || undefined}
                  alt={author.name || ""}
                />
                <AvatarFallback className="text-xs bg-neutral-100">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span>{author.name || "Anonymous"}</span>
              {author.role && <RoleBadge role={author.role} size="sm" />}
            </div>
            <span>·</span>
            <span>{timeAgo}</span>
            <span>·</span>
            <Link
              href={`/communities/${communitySlug}/forum/${id}#comments`}
              className="flex items-center gap-1 hover:text-primary-600 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div className="w-6 h-6 bg-neutral-200 rounded" />
          <div className="w-6 h-4 bg-neutral-200 rounded" />
          <div className="w-6 h-6 bg-neutral-200 rounded" />
        </div>
        <div className="flex-1">
          <div className="h-5 bg-neutral-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-neutral-100 rounded w-full mb-1" />
          <div className="h-4 bg-neutral-100 rounded w-2/3 mb-3" />
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 bg-neutral-200 rounded-full" />
            <div className="h-4 w-20 bg-neutral-100 rounded" />
            <div className="h-4 w-16 bg-neutral-100 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
