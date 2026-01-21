"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MemberRole } from "@prisma/client";
import { removeMember } from "@/lib/actions/membership";

interface Member {
  id: string;
  role: MemberRole;
  joinedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface MemberManagementListProps {
  members: Member[];
  communityId: string;
}

export function MemberManagementList({
  members,
  communityId,
}: MemberManagementListProps) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async (memberId: string, memberName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${memberName} from the community? Their events will be transferred to you.`
      )
    ) {
      return;
    }

    setRemovingId(memberId);
    setError(null);

    const result = await removeMember({ communityId, memberId });

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error);
    }

    setRemovingId(null);
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
                    alt={member.user.name || member.user.email}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-700 font-medium text-sm">
                      {(member.user.name || member.user.email)
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
                    {member.user.name || member.user.email}
                  </p>
                  {member.role === MemberRole.OWNER && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700">
                      Owner
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500">
                  {member.user.email}
                  {" • "}
                  Joined{" "}
                  {new Date(member.joinedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Actions */}
            {member.role !== MemberRole.OWNER && (
              <button
                type="button"
                onClick={() =>
                  handleRemove(member.id, member.user.name || member.user.email)
                }
                disabled={removingId === member.id}
                className="flex-shrink-0 px-3 py-1.5 text-sm text-error-600 hover:text-error-700 hover:bg-error-50
                           rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {removingId === member.id ? "Removing..." : "Remove"}
              </button>
            )}
          </li>
        ))}
      </ul>

      {members.length === 0 && (
        <div className="p-8 text-center text-neutral-500">
          No members in this community yet.
        </div>
      )}
    </div>
  );
}
