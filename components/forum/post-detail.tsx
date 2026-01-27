"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Pin, Trash2, Edit, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { VoteButton } from "./vote-button";
import { MarkdownRenderer } from "./markdown-renderer";
import { TipTapViewer } from "@/components/documents/tiptap/editor";
import { deletePost, pinPost } from "@/lib/actions/post";
import type { JSONContent } from "@tiptap/react";
import { toast } from "sonner";
import { RoleBadge } from "@/components/ui/role-badge";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
  role?: string | null;
}

interface PostDetailProps {
  id: string;
  slug: string;
  title: string;
  content: string;
  contentJson?: JSONContent | null;
  author: Author;
  createdAt: Date | string;
  updatedAt: Date | string;
  voteScore: number;
  userVote: number;
  isPinned: boolean;
  communitySlug: string;
  isAuthor: boolean;
  canModerate: boolean;
  isPublicView?: boolean;
  basePath?: string;
}

export function PostDetail({
  id,
  slug,
  title,
  content,
  contentJson,
  author,
  createdAt,
  updatedAt,
  voteScore,
  userVote,
  isPinned,
  communitySlug,
  isAuthor,
  canModerate,
  isPublicView = false,
  basePath = "/communities",
}: PostDetailProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const timestamp =
    createdAt instanceof Date ? createdAt : new Date(createdAt);
  const updateTimestamp =
    updatedAt instanceof Date ? updatedAt : new Date(updatedAt);

  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });
  const wasEdited = updateTimestamp > timestamp;

  const initials =
    author.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    setIsDeleting(true);
    const result = await deletePost({ postId: id });

    if (result.success) {
      toast.success("Post deleted");
      router.push(`/communities/${communitySlug}/forum`);
    } else {
      toast.error(result.error);
      setIsDeleting(false);
    }
  };

  const handlePin = async () => {
    const result = await pinPost({ postId: id, isPinned: !isPinned });

    if (result.success) {
      toast.success(isPinned ? "Post unpinned" : "Post pinned");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200">
      {/* Back link */}
      <div className="px-4 py-3 border-b border-neutral-200">
        <Link
          href={`${basePath}/${communitySlug}/forum`}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Forum
        </Link>
      </div>

      <div className="p-6">
        <div className="flex gap-4">
          {/* Vote Column */}
          <div className="shrink-0">
            <VoteButton
              type="post"
              id={id}
              score={voteScore}
              userVote={userVote}
              disabled={isPublicView}
            />
          </div>

          {/* Content Column */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="flex items-start gap-2 mb-2">
              {isPinned && (
                <Pin className="h-5 w-5 text-primary-500 shrink-0 mt-0.5" />
              )}
              <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mb-4 text-sm text-neutral-500">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage
                    src={author.image || undefined}
                    alt={author.name || ""}
                  />
                  <AvatarFallback className="text-xs bg-neutral-100">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-neutral-700">
                  {author.name || "Anonymous"}
                </span>
                {author.role && <RoleBadge role={author.role} size="sm" />}
              </div>
              <span>·</span>
              <span>{timeAgo}</span>
              {wasEdited && (
                <>
                  <span>·</span>
                  <span className="italic">edited</span>
                </>
              )}
            </div>

            {/* Content */}
            <div className="mb-6">
              {contentJson ? (
                <TipTapViewer content={contentJson} />
              ) : (
                <MarkdownRenderer content={content} />
              )}
            </div>

            {/* Actions */}
            {!isPublicView && (isAuthor || canModerate) && (
              <div className="flex items-center gap-2 pt-4 border-t border-neutral-100">
                {isAuthor && (
                  <Link href={`/communities/${communitySlug}/forum/${slug}/edit`}>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4 mr-1.5" />
                      Edit
                    </Button>
                  </Link>
                )}

                {canModerate && (
                  <Button variant="ghost" size="sm" onClick={handlePin}>
                    <Pin className="h-4 w-4 mr-1.5" />
                    {isPinned ? "Unpin" : "Pin"}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-error-600 hover:text-error-700 hover:bg-error-50"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
