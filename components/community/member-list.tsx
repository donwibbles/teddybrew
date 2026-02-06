import Link from "next/link";
import Image from "next/image";
import { MemberRole } from "@prisma/client";
import { ProfileLink } from "@/components/ui/profile-link";

interface Member {
  id: string;
  role: MemberRole;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    username?: string | null;
    isPublic?: boolean | null;
  };
}

interface MemberListProps {
  members: Member[];
  totalCount: number;
  communitySlug: string;
  showManageLink?: boolean;
}

export function MemberList({
  members,
  totalCount,
  communitySlug,
  showManageLink,
}: MemberListProps) {
  return (
    <div className="bg-card rounded-lg border border-border">
      <ul className="divide-y divide-border">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex items-center gap-3 p-4"
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              {member.user.image ? (
                <Image
                  src={member.user.image}
                  alt={member.user.name || "Anonymous"}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-subtle-hover flex items-center justify-center">
                  <span className="text-primary-700 font-medium text-sm">
                    {(member.user.name || "Anonymous").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Name and role */}
            <div className="flex-1 min-w-0">
              <ProfileLink
                user={member.user}
                className="text-sm font-medium text-foreground truncate block hover:text-primary-600"
              />
              {member.role === MemberRole.OWNER && (
                <span className="text-xs text-primary-600">Owner</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* See all link */}
      {totalCount > members.length && (
        <div className="border-t border-border p-3">
          <Link
            href={`/communities/${communitySlug}/members`}
            className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            See all {totalCount} members
          </Link>
        </div>
      )}

      {/* Manage link for owners */}
      {showManageLink && totalCount <= members.length && (
        <div className="border-t border-border p-3">
          <Link
            href={`/communities/${communitySlug}/members`}
            className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Manage members
          </Link>
        </div>
      )}
    </div>
  );
}
