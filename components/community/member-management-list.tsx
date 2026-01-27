"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MemberRole } from "@prisma/client";
import { Users, ShieldCheck, ShieldOff } from "lucide-react";
import { removeMember, promoteMember, demoteMember } from "@/lib/actions/membership";
import { EmptyState } from "@/components/ui/empty-state";
import { RoleBadge } from "@/components/ui/role-badge";

interface Member {
  id: string;
  role: MemberRole;
  joinedAt: Date;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface MemberManagementListProps {
  members: Member[];
  communityId: string;
  isOwner: boolean;
}

export function MemberManagementList({
  members,
  communityId,
  isOwner,
}: MemberManagementListProps) {
  const router = useRouter();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async (memberId: string, memberName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${memberName} from the community? Their events will be transferred to you.`
      )
    ) {
      return;
    }

    setActionInProgress(memberId);
    setError(null);

    const result = await removeMember({ communityId, memberId });

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error);
    }

    setActionInProgress(null);
  };

  const handlePromote = async (memberId: string, memberName: string) => {
    if (
      !confirm(
        `Promote ${memberName} to moderator? They will be able to delete posts, comments, and messages.`
      )
    ) {
      return;
    }

    setActionInProgress(memberId);
    setError(null);

    const result = await promoteMember({ communityId, memberId });

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error);
    }

    setActionInProgress(null);
  };

  const handleDemote = async (memberId: string, memberName: string) => {
    if (
      !confirm(
        `Demote ${memberName} from moderator? They will no longer be able to moderate content.`
      )
    ) {
      return;
    }

    setActionInProgress(memberId);
    setError(null);

    const result = await demoteMember({ communityId, memberId });

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error);
    }

    setActionInProgress(null);
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200">
      {error && (
        <div className="p-4 bg-error-50 border-b border-error-200 text-error-600 text-sm">
          {error}
        </div>
      )}

      <ul className="divide-y divide-neutral-100">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex items-center justify-between gap-4 p-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {member.user.image ? (
                  <img
                    src={member.user.image}
                    alt={member.user.name || "Anonymous"}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-700 font-medium text-sm">
                      {(member.user.name || "Anonymous")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {member.user.name || "Anonymous"}
                  </p>
                  <RoleBadge role={member.role} />
                </div>
                <p className="text-xs text-neutral-500">
                  Joined{" "}
                  {new Date(member.joinedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Actions - Only show to owner */}
            {isOwner && member.role !== MemberRole.OWNER && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Promote/Demote button */}
                {member.role === MemberRole.MEMBER ? (
                  <button
                    type="button"
                    onClick={() =>
                      handlePromote(member.id, member.user.name || "Anonymous")
                    }
                    disabled={actionInProgress === member.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50
                               rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Promote to Moderator"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Promote</span>
                  </button>
                ) : member.role === MemberRole.MODERATOR ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleDemote(member.id, member.user.name || "Anonymous")
                    }
                    disabled={actionInProgress === member.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-700 hover:bg-neutral-50
                               rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Demote to Member"
                  >
                    <ShieldOff className="w-4 h-4" />
                    <span className="hidden sm:inline">Demote</span>
                  </button>
                ) : null}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() =>
                    handleRemove(member.id, member.user.name || "Anonymous")
                  }
                  disabled={actionInProgress === member.id}
                  className="px-3 py-1.5 text-sm text-error-600 hover:text-error-700 hover:bg-error-50
                             rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionInProgress === member.id ? "..." : "Remove"}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {members.length === 0 && (
        <EmptyState
          icon={Users}
          title="No members yet"
          description="No members in this community yet."
        />
      )}
    </div>
  );
}
