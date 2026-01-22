"use client";

import { usePresenceContext } from "@/contexts/presence-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";

interface MemberData {
  id: string;
  name: string | null;
  image: string | null;
}

interface OnlineMembersProps {
  currentUserId: string;
}

export function OnlineMembers({ currentUserId }: OnlineMembersProps) {
  const { members, isConnected, memberCount } = usePresenceContext();

  // Get unique members (by clientId) with their data
  const uniqueMembers = members.reduce<MemberData[]>((acc, member) => {
    const data = member.data as MemberData | undefined;
    if (data && !acc.some((m) => m.id === data.id)) {
      acc.push(data);
    }
    return acc;
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-neutral-400" />
          <h3 className="text-sm font-semibold text-neutral-900">
            Online
          </h3>
          <span className="text-xs text-neutral-500">
            {isConnected ? memberCount : "..."}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {!isConnected ? (
          <div className="px-3 py-2 text-sm text-neutral-400">
            Connecting...
          </div>
        ) : uniqueMembers.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-neutral-400">
            No one else online
          </div>
        ) : (
          uniqueMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-50"
            >
              <div className="relative">
                <Avatar className="h-7 w-7">
                  <AvatarImage
                    src={member.image || undefined}
                    alt={member.name || ""}
                  />
                  <AvatarFallback className="text-xs bg-primary-100 text-primary-700">
                    {member.name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success-500 border-2 border-white rounded-full" />
              </div>
              <span className="text-sm text-neutral-700 truncate">
                {member.name || "Anonymous"}
                {member.id === currentUserId && (
                  <span className="text-neutral-400 ml-1">(you)</span>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
