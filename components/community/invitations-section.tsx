"use client";

import { useState, useEffect, useCallback } from "react";
import { getCommunityInvites } from "@/lib/actions/invite";
import { InviteForm } from "./invite-form";
import { PendingInvites } from "./pending-invites";

interface InvitationsSectionProps {
  communityId: string;
}

interface Invite {
  id: string;
  email: string;
  expiresAt: Date;
  createdAt: Date;
  createdBy: { name: string | null };
}

export function InvitationsSection({ communityId }: InvitationsSectionProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadInvites = useCallback(async () => {
    setIsLoading(true);
    const data = await getCommunityInvites(communityId);
    setInvites(data);
    setIsLoading(false);
  }, [communityId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- On-mount data fetch
    loadInvites();
  }, [loadInvites]);

  return (
    <div className="space-y-6">
      {/* Send Invite */}
      <div>
        <h3 className="text-sm font-medium text-neutral-900 mb-3">
          Invite New Member
        </h3>
        <InviteForm communityId={communityId} onInviteSent={loadInvites} />
      </div>

      {/* Pending Invites */}
      <div>
        <h3 className="text-sm font-medium text-neutral-900 mb-3">
          Pending Invitations
        </h3>
        {isLoading ? (
          <div className="py-6 text-center text-neutral-500">
            <div className="animate-spin h-6 w-6 border-2 border-neutral-300 border-t-primary-500 rounded-full mx-auto mb-2" />
            <p className="text-sm">Loading invitations...</p>
          </div>
        ) : (
          <PendingInvites invites={invites} onUpdate={loadInvites} />
        )}
      </div>
    </div>
  );
}
