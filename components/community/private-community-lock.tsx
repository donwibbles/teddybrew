import { JoinLeaveButton } from "./join-leave-button";
import { CommunityType } from "@prisma/client";

interface PrivateCommunityLockProps {
  communityId: string;
  communityName: string;
}

export function PrivateCommunityLock({
  communityId,
  communityName,
}: PrivateCommunityLockProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-background-muted rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-foreground-muted"
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
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">
        This is a private community
      </h2>
      <p className="text-foreground-muted mb-6">
        Only members can view events and content in {communityName}.
      </p>
      <div className="max-w-xs mx-auto">
        <JoinLeaveButton
          communityId={communityId}
          communityType={CommunityType.PRIVATE}
          isMember={false}
        />
      </div>
    </div>
  );
}
