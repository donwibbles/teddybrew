import { getAdminCommunities } from "@/lib/actions/admin";
import { AdminCommunityList } from "./community-list";

export const metadata = {
  title: "Manage Communities - Admin - Hive Community",
};

export default async function AdminCommunitiesPage() {
  const communities = await getAdminCommunities();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Communities</h1>
        <p className="text-foreground-muted mt-1">
          Manage all communities ({communities.length} total)
        </p>
      </div>

      <AdminCommunityList communities={communities} />
    </div>
  );
}
