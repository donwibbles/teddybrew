"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Pin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import { ProfileLink } from "@/components/ui/profile-link";
import { TagBadgeList } from "@/components/tags/tag-badge";
import { VoteButton } from "./vote-button";
import { MarkdownPreview } from "./markdown-renderer";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
  role?: string | null;
  username?: string | null;
  isPublic?: boolean | null;
}

interface Community {
  slug: string;
  name: string;
}

interface PostCardProps {
  id: string;
  slug: string;
  title: string;
  content: string;
  author: Author;
  createdAt: Date | string;
  voteScore: number;
  userVote: number;
  commentCount: number;
  isPinned: boolean;
  communitySlug: string;
  /** Issue tags (optional) */
  issueTags?: Array<{ slug: string; name: string }>;
  /** Show community badge (for global forum view) */
  showCommunity?: boolean;
  /** Community info (required when showCommunity is true) */
  community?: Community;
  /** Base path for links (default: "/communities") */
  basePath?: string;
  /** Disable interactive elements (for public view) */
  disabled?: boolean;
}

export function PostCard({
  id,
  slug,
  title,
  content,
  author,
  createdAt,
  voteScore,
  userVote,
  commentCount,
  isPinned,
  communitySlug,
  issueTags,
  showCommunity,
  community,
  basePath = "/communities",
  disabled = false,
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
    <div className="bg-card rounded-lg border border-border p-4 hover:border-border transition-colors">
      <div className="flex gap-4">
        {/* Vote Column */}
        <div className="shrink-0">
          <VoteButton
            type="post"
            id={id}
            score={voteScore}
            userVote={userVote}
            disabled={disabled}
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
              href={`${basePath}/${communitySlug}/forum/${slug}`}
              className="font-medium text-foreground hover:text-primary-600 transition-colors line-clamp-2"
            >
              {title}
            </Link>
          </div>

          {/* Preview */}
          <div className="mt-1">
            <MarkdownPreview content={content} maxLength={150} />
          </div>

          {/* Tags row */}
          {issueTags && issueTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <TagBadgeList
                tags={issueTags}
                maxVisible={3}
                size="sm"
                variant="default"
              />
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-3 text-sm text-foreground-muted">
            {showCommunity && community && (
              <>
                <Link
                  href={`${basePath}/${community.slug}`}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-subtle text-primary-700 hover:bg-primary-subtle-hover transition-colors"
                >
                  {community.name}
                </Link>
                <span>·</span>
              </>
            )}
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage
                  src={author.image || undefined}
                  alt={author.name || ""}
                />
                <AvatarFallback className="text-xs bg-background-muted">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <ProfileLink user={author} className="hover:text-primary-600" />
              {author.role && <RoleBadge role={author.role} size="sm" />}
            </div>
            <span>·</span>
            <span>{timeAgo}</span>
            <span>·</span>
            <Link
              href={`${basePath}/${communitySlug}/forum/${slug}#comments`}
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
    <div className="bg-card rounded-lg border border-border p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div className="w-6 h-6 bg-background-muted rounded" />
          <div className="w-6 h-4 bg-background-muted rounded" />
          <div className="w-6 h-6 bg-background-muted rounded" />
        </div>
        <div className="flex-1">
          <div className="h-5 bg-background-muted rounded w-3/4 mb-2" />
          <div className="h-4 bg-background-muted rounded w-full mb-1" />
          <div className="h-4 bg-background-muted rounded w-2/3 mb-3" />
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 bg-background-muted rounded-full" />
            <div className="h-4 w-20 bg-background-muted rounded" />
            <div className="h-4 w-16 bg-background-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
