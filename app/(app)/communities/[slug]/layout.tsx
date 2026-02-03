import { notFound } from "next/navigation";
import { getCommunityWithDetails } from "@/lib/db/communities";
import { getActiveAnnouncements } from "@/lib/db/announcements";
import { getMembershipStatus } from "@/lib/actions/membership";
import { getSession } from "@/lib/dal";
import { CommunityPresenceWrapper } from "@/components/community/community-presence-wrapper";
import { CommunityHeader } from "@/components/community/community-header";
import { AnnouncementBanner } from "@/components/community/announcement-banner";

interface CommunityLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

/**
 * Community layout that provides presence context for authenticated members.
 * This ensures presence is entered once when visiting any community page
 * and persists across navigation within the community.
 */
export default async function CommunityLayout({
  children,
  params,
}: CommunityLayoutProps) {
  const { slug } = await params;
  const community = await getCommunityWithDetails(slug);

  if (!community) {
    notFound();
  }

  const session = await getSession();
  const membership = await getMembershipStatus(community.id);

  // Fetch active announcements for members
  const announcements = membership.isMember
    ? await getActiveAnnouncements(community.id)
    : [];

  // Build header data
  const headerCommunity = {
    id: community.id,
    slug: community.slug,
    name: community.name,
    description: community.description,
    type: community.type,
    bannerImage: community.bannerImage,
    city: community.city,
    state: community.state,
    isVirtual: community.isVirtual,
    _count: community._count,
  };

  const headerMembership = {
    isMember: membership.isMember,
    isOwner: membership.isOwner,
    canModerate: membership.canModerate,
  };

  // Shared content with header and announcements
  const content = (
    <div className="space-y-6">
      <CommunityHeader community={headerCommunity} membership={headerMembership} />
      {membership.isMember && announcements.length > 0 && (
        <AnnouncementBanner
          announcements={announcements}
          communitySlug={community.slug}
          canManage={membership.canModerate}
        />
      )}
      {children}
    </div>
  );

  // If user is not authenticated or not a member, render without presence
  if (!session?.user || !membership.isMember) {
    return content;
  }

  // Authenticated member - wrap with presence provider
  const currentUser = {
    id: session.user.id!,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  };

  return (
    <CommunityPresenceWrapper communityId={community.id} currentUser={currentUser}>
      {content}
    </CommunityPresenceWrapper>
  );
}
