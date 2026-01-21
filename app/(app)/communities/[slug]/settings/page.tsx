import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCommunityWithDetails } from "@/lib/db/communities";
import { getMembershipStatus } from "@/lib/actions/membership";
import { EditCommunityForm } from "@/components/community/edit-community-form";
import { DeleteCommunityForm } from "@/components/community/delete-community-form";

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SettingsPageProps) {
  const { slug } = await params;
  const community = await getCommunityWithDetails(slug);

  if (!community) {
    return { title: "Community Not Found" };
  }

  return {
    title: `Settings - ${community.name} - Hive Community`,
    description: `Manage settings for ${community.name}`,
  };
}

export default async function CommunitySettingsPage({
  params,
}: SettingsPageProps) {
  const { slug } = await params;
  const community = await getCommunityWithDetails(slug);

  if (!community) {
    notFound();
  }

  // Check if user is owner
  const membership = await getMembershipStatus(community.id);

  if (!membership.isOwner) {
    // Redirect non-owners back to community page
    redirect(`/communities/${slug}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
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
          <span>Settings</span>
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Community Settings
        </h1>
        <p className="text-neutral-600 mt-1">
          Manage your community settings and preferences
        </p>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-6">
          General Settings
        </h2>
        <EditCommunityForm
          community={{
            id: community.id,
            slug: community.slug,
            name: community.name,
            description: community.description,
            type: community.type,
          }}
        />
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg border border-error-200 p-6">
        <h2 className="text-lg font-semibold text-error-600 mb-2">
          Danger Zone
        </h2>
        <p className="text-neutral-600 text-sm mb-6">
          Deleting your community is permanent and cannot be undone. All events
          and memberships will be deleted.
        </p>
        <DeleteCommunityForm
          communityId={community.id}
          communityName={community.name}
        />
      </div>
    </div>
  );
}
