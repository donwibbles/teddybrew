import { notFound } from "next/navigation";
import { getCommunityBySlug } from "@/lib/db/communities";
import { getMembershipStatus } from "@/lib/actions/membership";
import { getSession } from "@/lib/dal";
import { CommunityPresenceWrapper } from "@/components/community/community-presence-wrapper";

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
  const community = await getCommunityBySlug(slug);

  if (!community) {
    notFound();
  }

  const session = await getSession();

  // If user is not authenticated, render without presence
  if (!session?.user) {
    return <>{children}</>;
  }

  const membership = await getMembershipStatus(community.id);

  // If user is not a member, render without presence
  if (!membership.isMember) {
    return <>{children}</>;
  }

  // Authenticated member - wrap with presence provider
  const currentUser = {
    id: session.user.id!,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  };

  return (
    <CommunityPresenceWrapper communityId={community.id} currentUser={currentUser}>
      {children}
    </CommunityPresenceWrapper>
  );
}
