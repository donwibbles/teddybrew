"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare, TrendingUp, Clock } from "lucide-react";
import { CommentForm } from "./comment-form";
import { CommentThread } from "./comment-thread";
import { cn } from "@/lib/utils";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
  role?: string | null;
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

interface CommentsSectionProps {
  postId: string;
  comments: Comment[];
  commentCount: number;
  currentUserId?: string;
  canModerate: boolean;
  isMember: boolean;
  currentSort: "best" | "new";
  basePath: string;
  isPublicView?: boolean;
}

const sortOptions = [
  { value: "best", label: "Best", icon: TrendingUp },
  { value: "new", label: "New", icon: Clock },
] as const;

export function CommentsSection({
  postId,
  comments,
  commentCount,
  currentUserId,
  canModerate,
  isMember,
  currentSort,
  basePath,
  isPublicView = false,
}: CommentsSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortChange = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === "best") {
      params.delete("commentSort");
    } else {
      params.set("commentSort", sort);
    }
    const queryString = params.toString();
    router.push(`${basePath}${queryString ? `?${queryString}` : ""}#comments`, {
      scroll: false,
    });
  };

  const handleCommentSuccess = () => {
    router.refresh();
  };

  return (
    <div
      id="comments"
      className="bg-white rounded-lg border border-neutral-200 mt-4"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-neutral-400" />
            <h2 className="font-semibold text-neutral-900">
              {commentCount} {commentCount === 1 ? "Comment" : "Comments"}
            </h2>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-0.5">
            {sortOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleSortChange(value)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors",
                  currentSort === value
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comment Form */}
      {isMember ? (
        <div className="px-6 py-4 border-b border-neutral-200">
          <CommentForm postId={postId} onSuccess={handleCommentSuccess} />
        </div>
      ) : currentUserId ? (
        <div className="px-6 py-4 border-b border-neutral-200 text-center text-sm text-neutral-500">
          Join this community to comment on posts
        </div>
      ) : (
        <div className="px-6 py-4 border-b border-neutral-200 text-center text-sm text-neutral-500">
          Sign in to comment on posts
        </div>
      )}

      {/* Comments */}
      <div className="px-6 py-2">
        <CommentThread
          postId={postId}
          comments={comments}
          currentUserId={currentUserId}
          canModerate={canModerate}
          disableVoting={isPublicView}
        />
      </div>
    </div>
  );
}
