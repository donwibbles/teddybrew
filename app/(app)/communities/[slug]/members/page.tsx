import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCommunityWithDetails } from "@/lib/db/communities";
import { getMembershipStatus } from "@/lib/actions/membership";
import { MemberManagementList } from "@/components/community/member-management-list";

interface MembersPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: MembersPageProps) {
  const { slug } = await params;
  const community = await getCommunityWithDetails(slug);

  if (!community) {
    return { title: "Community Not Found" };
  }

  return {
    title: `Members - ${community.name} - Hive Community`,
    description: `Members of ${community.name}`,
  };
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { slug } = await params;
  const community = await getCommunityWithDetails(slug);

  if (!community) {
    notFound();
  }

  // Check if user is owner
  const membership = await getMembershipStatus(community.id);

  if (!membership.isOwner) {
    // Non-owners can view but not manage - redirect to community page
    redirect(`/communities/${slug}`);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
          <Link
            href={`/communities/${community.slug}`}
            className="hover:text-primary-600"
          >
            {community.name}
          </Link>
          <span>/</span>
          <span>Members</span>
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Manage Members
        </h1>
        <p className="text-neutral-600 mt-1">
          {community._count.members}{" "}
          {community._count.members === 1 ? "member" : "members"} in this
          community
        </p>
      </div>

      {/* Member List */}
      <MemberManagementList
        members={community.members}
        communityId={community.id}
      />
    </div>
  );
}
