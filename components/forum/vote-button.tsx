"use client";

import { useState, useTransition } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { votePost } from "@/lib/actions/post";
import { voteComment } from "@/lib/actions/comment";
import { toast } from "sonner";

interface VoteButtonProps {
  type: "post" | "comment";
  id: string;
  score: number;
  userVote: number;
  vertical?: boolean;
  size?: "sm" | "md";
  disabled?: boolean;
}

export function VoteButton({
  type,
  id,
  score,
  userVote,
  vertical = true,
  size = "md",
  disabled = false,
}: VoteButtonProps) {
  const [optimisticScore, setOptimisticScore] = useState(score);
  const [optimisticVote, setOptimisticVote] = useState(userVote);
  const [isPending, startTransition] = useTransition();

  const handleVote = (value: 1 | -1) => {
    if (disabled) {
      toast.info("Sign in to vote");
      return;
    }

    // Calculate new vote value (toggle if same, otherwise set)
    const newValue = optimisticVote === value ? 0 : value;
    const scoreDelta = newValue - optimisticVote;

    // Optimistic update
    setOptimisticScore((prev) => prev + scoreDelta);
    setOptimisticVote(newValue);

    startTransition(async () => {
      const action = type === "post" ? votePost : voteComment;
      const idKey = type === "post" ? "postId" : "commentId";

      const result = await action({ [idKey]: id, value: newValue });

      if (!result.success) {
        // Revert on error
        setOptimisticScore((prev) => prev - scoreDelta);
        setOptimisticVote((prev) => prev - newValue + optimisticVote);
        toast.error(result.error);
      }
    });
  };

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const buttonPadding = size === "sm" ? "p-0.5" : "p-1";

  return (
    <div
      className={cn(
        "flex items-center gap-1",
        vertical && "flex-col"
      )}
    >
      <button
        onClick={() => handleVote(1)}
        disabled={isPending}
        className={cn(
          buttonPadding,
          "rounded transition-colors",
          disabled
            ? "text-foreground-muted cursor-default"
            : optimisticVote === 1
              ? "text-primary-600 bg-primary-subtle"
              : "text-foreground-muted hover:text-primary-600 hover:bg-primary-subtle",
          isPending && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Upvote"
      >
        <ChevronUp className={iconSize} />
      </button>

      <span
        className={cn(
          "font-medium tabular-nums text-center min-w-[2ch]",
          size === "sm" ? "text-sm" : "text-base",
          optimisticScore > 0 && "text-primary-600",
          optimisticScore < 0 && "text-error-500",
          optimisticScore === 0 && "text-foreground-muted"
        )}
      >
        {optimisticScore}
      </span>

      <button
        onClick={() => handleVote(-1)}
        disabled={isPending}
        className={cn(
          buttonPadding,
          "rounded transition-colors",
          disabled
            ? "text-foreground-muted cursor-default"
            : optimisticVote === -1
              ? "text-error-500 bg-error-50"
              : "text-foreground-muted hover:text-error-500 hover:bg-error-50",
          isPending && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Downvote"
      >
        <ChevronDown className={iconSize} />
      </button>
    </div>
  );
}
