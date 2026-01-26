"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, Clock, RotateCcw, X, Loader2 } from "lucide-react";
import { cancelInvite, resendInvite } from "@/lib/actions/invite";

interface Invite {
  id: string;
  email: string;
  expiresAt: Date;
  createdAt: Date;
  createdBy: { name: string | null };
}

interface PendingInvitesProps {
  invites: Invite[];
  onUpdate?: () => void;
}

export function PendingInvites({ invites, onUpdate }: PendingInvitesProps) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const handleResend = async (inviteId: string) => {
    setLoadingIds((prev) => new Set(prev).add(`resend-${inviteId}`));

    const result = await resendInvite({ inviteId });

    if (result.success) {
      toast.success("Invitation resent successfully!");
      onUpdate?.();
    } else {
      toast.error(result.error);
    }

    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(`resend-${inviteId}`);
      return next;
    });
  };

  const handleCancel = async (inviteId: string) => {
    setLoadingIds((prev) => new Set(prev).add(`cancel-${inviteId}`));

    const result = await cancelInvite({ inviteId });

    if (result.success) {
      toast.success("Invitation cancelled");
      onUpdate?.();
    } else {
      toast.error(result.error);
    }

    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(`cancel-${inviteId}`);
      return next;
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isExpired = (expiresAt: Date) => {
    return new Date(expiresAt) < new Date();
  };

  if (invites.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-500">
        <Mail className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
        <p className="text-sm">No pending invitations</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-neutral-200">
      {invites.map((invite) => {
        const expired = isExpired(invite.expiresAt);
        const isResending = loadingIds.has(`resend-${invite.id}`);
        const isCancelling = loadingIds.has(`cancel-${invite.id}`);

        return (
          <div
            key={invite.id}
            className={`py-4 flex items-center justify-between gap-4 ${
              expired ? "opacity-60" : ""
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-neutral-400 shrink-0" />
                <p className="font-medium text-neutral-900 truncate">
                  {invite.email}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                <span>Sent {formatDate(invite.createdAt)}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {expired ? (
                    <span className="text-error-600">Expired</span>
                  ) : (
                    <>Expires {formatDate(invite.expiresAt)}</>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleResend(invite.id)}
                disabled={isResending || isCancelling}
                className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Resend invitation"
              >
                {isResending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => handleCancel(invite.id)}
                disabled={isResending || isCancelling}
                className="p-2 text-neutral-600 hover:text-error-600 hover:bg-error-50 rounded-lg
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Cancel invitation"
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
