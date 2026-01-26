import { getAdminUsers } from "@/lib/actions/admin";
import { formatDistanceToNow } from "date-fns";
import { Shield, Users, FileText, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Manage Users - Admin - Hive Community",
};

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Users</h1>
        <p className="text-neutral-600 mt-1">
          View all users ({users.length} total)
        </p>
      </div>

      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                User
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase">
                Activity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {users.map((user) => {
              const timestamp =
                user.createdAt instanceof Date
                  ? user.createdAt
                  : new Date(user.createdAt);
              const timeAgo = formatDistanceToNow(timestamp, {
                addSuffix: true,
              });

              const initials =
                user.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "?";

              return (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user.image || undefined}
                          alt={user.name || ""}
                        />
                        <AvatarFallback className="text-xs bg-neutral-100">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-neutral-900">
                            {user.name || "No name"}
                          </p>
                          {user.isAdmin && (
                            <Badge
                              variant="warning"
                              className="flex items-center gap-1"
                            >
                              <Shield className="h-3 w-3" />
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-4 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {user._count.memberships}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {user._count.posts}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {user._count.comments}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500">
                    {timeAgo}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="p-8 text-center text-neutral-500">No users found</div>
        )}
      </div>
    </div>
  );
}
