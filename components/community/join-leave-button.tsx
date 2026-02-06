"use client";

import { useState, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { joinCommunity, leaveCommunity } from "@/lib/actions/membership";
import { CommunityType } from "@prisma/client";

interface JoinLeaveButtonProps {
  communityId: string;
  communityType: CommunityType;
  isMember: boolean;
}

export function JoinLeaveButton({
  communityId,
  communityType,
  isMember,
}: JoinLeaveButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Optimistic state for immediate UI feedback
  const [optimisticMember, setOptimisticMember] = useOptimistic(
    isMember,
    (_, newValue: boolean) => newValue
  );

  const handleJoin = async () => {
    setError(null);

    startTransition(async () => {
      // Optimistically update to "member" state
      setOptimisticMember(true);

      const result = await joinCommunity({ communityId });

      if (result.success) {
        toast.success("Joined community!");
        router.refresh();
      } else {
        // Revert optimistic update on error
        setError(result.error);
        toast.error(result.error);
      }
    });
  };

  const handleLeave = async () => {
    setError(null);

    startTransition(async () => {
      // Optimistically update to "not member" state
      setOptimisticMember(false);

      const result = await leaveCommunity({ communityId });

      if (result.success) {
        toast.success("Left community");
        router.refresh();
      } else {
        // Revert optimistic update on error
        setError(result.error);
        toast.error(result.error);
      }
    });
  };

  if (optimisticMember) {
    return (
      <div className="space-y-2">
        <button
          onClick={handleLeave}
          disabled={isPending}
          className="w-full px-4 py-2 border border-border text-foreground font-medium rounded-lg
                     hover:bg-background-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Leaving..." : "Leave Community"}
        </button>
        {error && <p className="text-sm text-error-600">{error}</p>}
      </div>
    );
  }

  // Private communities require invite
  if (communityType === "PRIVATE") {
    return (
      <div className="text-center">
        <button
          disabled
          className="w-full px-4 py-2 bg-background-muted text-foreground-muted font-medium rounded-lg cursor-not-allowed"
        >
          <svg
            className="w-4 h-4 inline mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Invite Only
        </button>
        <p className="text-xs text-foreground-muted mt-2">
          This is a private community
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleJoin}
        disabled={isPending}
        className="w-full px-4 py-2 bg-primary-500 text-white font-medium rounded-lg
                   hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? "Joining..." : "Join Community"}
      </button>
      {error && <p className="text-sm text-error-600">{error}</p>}
    </div>
  );
}
