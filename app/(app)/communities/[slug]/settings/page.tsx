import { notFound, redirect } from "next/navigation";
import { getCommunityWithDetails, getMembershipStatus } from "@/lib/db/queries";
import { getEventsForSpotlightManagement } from "@/lib/db/communities";
import { getAllAnnouncements } from "@/lib/db/announcements";
import { EditCommunityForm } from "@/components/community/edit-community-form";
import { DeleteCommunityForm } from "@/components/community/delete-community-form";
import { InvitationsSection } from "@/components/community/invitations-section";
import { SpotlightManager } from "@/components/community/spotlight-manager";
import { AnnouncementManager } from "@/components/community/announcement-manager";
import { Mail, Star, Megaphone } from "lucide-react";

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

  // Check if user can moderate (owner or moderator)
  const membership = await getMembershipStatus(community.id);

  if (!membership.canModerate) {
    // Redirect non-moderators back to community page
    redirect(`/communities/${slug}`);
  }

  // Fetch data for spotlight and announcement management
  const [events, announcements] = await Promise.all([
    getEventsForSpotlightManagement(community.id),
    getAllAnnouncements(community.id),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Community Settings
        </h1>
        <p className="text-foreground-muted mt-1">
          Manage your community settings and preferences
        </p>
      </div>

      {/* Edit Form - Owner only */}
      {membership.isOwner && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">
            General Settings
          </h2>
          <EditCommunityForm
            community={{
              id: community.id,
              slug: community.slug,
              name: community.name,
              description: community.description,
              type: community.type,
              city: community.city,
              state: community.state,
              isVirtual: community.isVirtual,
              bannerImage: community.bannerImage,
              cardImage: community.cardImage,
            }}
          />
        </div>
      )}

      {/* Invitations Section - Only for private communities and owners */}
      {community.type === "PRIVATE" && membership.isOwner && (
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <Mail className="h-5 w-5 text-foreground-muted" />
            <h2 className="text-lg font-semibold text-foreground">
              Invitations
            </h2>
          </div>
          <p className="text-foreground-muted text-sm mb-6">
            Invite people to join your private community. They&apos;ll receive an email
            with a link to accept the invitation.
          </p>
          <InvitationsSection communityId={community.id} />
        </div>
      )}

      {/* Spotlight Events Section */}
      <div id="spotlight" className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Star className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-foreground">
            Spotlight Events
          </h2>
        </div>
        <SpotlightManager events={events} />
      </div>

      {/* Announcements Section */}
      <div id="announcements" className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Megaphone className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-foreground">
            Announcements
          </h2>
        </div>
        <AnnouncementManager announcements={announcements} communityId={community.id} />
      </div>

      {/* Danger Zone - Owner only */}
      {membership.isOwner && (
        <div className="bg-card rounded-lg border border-error-200 p-6">
          <h2 className="text-lg font-semibold text-error-600 mb-2">
            Danger Zone
          </h2>
          <p className="text-foreground-muted text-sm mb-6">
            Deleting your community is permanent and cannot be undone. All events
            and memberships will be deleted.
          </p>
          <DeleteCommunityForm
            communityId={community.id}
            communityName={community.name}
          />
        </div>
      )}
    </div>
  );
}
