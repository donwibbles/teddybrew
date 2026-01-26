"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Trash2, Users, FileText, Calendar, Lock, Globe } from "lucide-react";
import {
  adminDeleteCommunity,
} from "@/lib/actions/admin";
import { toast } from "sonner";
import type { CommunityType } from "@prisma/client";

interface Owner {
  id: string;
  name: string | null;
  email: string;
}

interface Community {
  id: string;
  name: string;
  slug: string;
  type: CommunityType;
  createdAt: Date | string;
  owner: Owner;
  _count: {
    members: number;
    events: number;
    posts: number;
  };
}

interface AdminCommunityListProps {
  communities: Community[];
}

export function AdminCommunityList({ communities }: AdminCommunityListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (community: Community) => {
    const reason = prompt(
      `Enter reason for deleting "${community.name}":`
    );

    if (!reason) return;

    if (
      !confirm(
        `Are you sure you want to delete "${community.name}"? This action cannot be undone. All members, posts, events, and other data will be permanently deleted.`
      )
    ) {
      return;
    }

    setDeletingId(community.id);

    const result = await adminDeleteCommunity({
      communityId: community.id,
      reason,
    });

    if (result.success) {
      toast.success("Community deleted");
      router.refresh();
    } else {
      toast.error(result.error);
    }

    setDeletingId(null);
  };

  if (communities.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center">
        <p className="text-neutral-500">No communities found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
              Community
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
              Owner
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase">
              Stats
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
              Created
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {communities.map((community) => {
            const timestamp =
              community.createdAt instanceof Date
                ? community.createdAt
                : new Date(community.createdAt);
            const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });

            return (
              <tr
                key={community.id}
                className={deletingId === community.id ? "opacity-50" : ""}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {community.type === "PRIVATE" ? (
                      <Lock className="h-4 w-4 text-neutral-400" />
                    ) : (
                      <Globe className="h-4 w-4 text-neutral-400" />
                    )}
                    <div>
                      <p className="font-medium text-neutral-900">
                        {community.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        /{community.slug}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm text-neutral-900">
                      {community.owner.name || "No name"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {community.owner.email}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-4 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {community._count.members}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {community._count.posts}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {community._count.events}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-neutral-500">{timeAgo}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(community)}
                    disabled={deletingId === community.id}
                    className="p-1.5 text-neutral-400 hover:text-error-500 hover:bg-error-50 rounded transition-colors disabled:opacity-50"
                    title="Delete community"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
