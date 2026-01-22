"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VoteButton } from "./vote-button";
import { CommentForm } from "./comment-form";
import { MarkdownRenderer } from "./markdown-renderer";
import { deleteComment } from "@/lib/actions/comment";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MAX_COMMENT_DEPTH } from "@/lib/validations/comment";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface Comment {
  id: string;
  content: string;
  author: Author;
  createdAt: Date | string;
  updatedAt: Date | string;
  voteScore: number;
  userVote: number;
  depth: number;
  replies: Comment[];
}

interface CommentItemProps {
  comment: Comment;
  postId: string;
  currentUserId?: string;
  isOwner: boolean;
}

function CommentItem({
  comment,
  postId,
  currentUserId,
  isOwner,
}: CommentItemProps) {
  const router = useRouter();
  const [isReplying, setIsReplying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const timestamp =
    comment.createdAt instanceof Date
      ? comment.createdAt
      : new Date(comment.createdAt);
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });

  const initials =
    comment.author.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const isAuthor = currentUserId === comment.author.id;
  const canDelete = isAuthor || isOwner;
  const canReply = currentUserId && comment.depth < MAX_COMMENT_DEPTH;

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    setIsDeleting(true);
    const result = await deleteComment({ commentId: comment.id });

    if (result.success) {
      toast.success("Comment deleted");
      router.refresh();
    } else {
      toast.error(result.error);
      setIsDeleting(false);
    }
  };

  const handleReplySuccess = () => {
    setIsReplying(false);
    router.refresh();
  };

  return (
    <div className={cn("group", comment.depth > 0 && "pl-4 border-l-2 border-neutral-100")}>
      <div className="flex gap-3 py-3">
        {/* Vote */}
        <div className="shrink-0">
          <VoteButton
            type="comment"
            id={comment.id}
            score={comment.voteScore}
            userVote={comment.userVote}
            size="sm"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <Avatar className="h-5 w-5">
              <AvatarImage
                src={comment.author.image || undefined}
                alt={comment.author.name || ""}
              />
              <AvatarFallback className="text-xs bg-neutral-100">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-neutral-700">
              {comment.author.name || "Anonymous"}
            </span>
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-xs text-neutral-400">{timeAgo}</span>
            {comment.replies.length > 0 && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="ml-auto text-xs text-neutral-400 hover:text-neutral-600 flex items-center gap-0.5"
              >
                {isCollapsed ? (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Show {comment.replies.length} replies
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Hide replies
                  </>
                )}
              </button>
            )}
          </div>

          {/* Body */}
          <div className="text-sm">
            <MarkdownRenderer content={comment.content} className="prose-sm" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            {canReply && (
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Reply
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-xs text-neutral-500 hover:text-error-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>

          {/* Reply Form */}
          {isReplying && (
            <div className="mt-3">
              <CommentForm
                postId={postId}
                parentId={comment.id}
                onSuccess={handleReplySuccess}
                onCancel={() => setIsReplying(false)}
                placeholder={`Reply to ${comment.author.name || "Anonymous"}...`}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {!isCollapsed && comment.replies.length > 0 && (
        <div className="ml-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              currentUserId={currentUserId}
              isOwner={isOwner}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentThreadProps {
  postId: string;
  comments: Comment[];
  currentUserId?: string;
  isOwner: boolean;
}

export function CommentThread({
  postId,
  comments,
  currentUserId,
  isOwner,
}: CommentThreadProps) {
  if (comments.length === 0) {
    return (
      <div className="py-8 text-center text-neutral-500">
        No comments yet. Be the first to comment!
      </div>
    );
  }

  return (
    <div className="divide-y divide-neutral-100">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          postId={postId}
          currentUserId={currentUserId}
          isOwner={isOwner}
        />
      ))}
    </div>
  );
}
