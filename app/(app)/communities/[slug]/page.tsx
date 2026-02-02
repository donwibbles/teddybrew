import { notFound } from "next/navigation";
import Link from "next/link";
import { getCommunityWithDetails } from "@/lib/db/communities";
import { getCommunityMembers } from "@/lib/db/members";
import { getMembershipStatus } from "@/lib/actions/membership";
import { MemberList } from "@/components/community/member-list";
import { PrivateCommunityLock } from "@/components/community/private-community-lock";

interface CommunityPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CommunityPageProps) {
  const { slug } = await params;
  const community = await getCommunityWithDetails(slug);

  if (!community) {
    return { title: "Community Not Found" };
  }

  return {
    title: `${community.name} - Hive Community`,
    description: community.description || `Join ${community.name} on Hive Community`,
  };
}

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { slug } = await params;
  const community = await getCommunityWithDetails(slug);

  if (!community) {
    notFound();
  }

  const membership = await getMembershipStatus(community.id);
  const members = await getCommunityMembers(community.id, 10);

  return (
    <div>
      {/* Content Grid - only show for public communities or members */}
      {community.type === "PRIVATE" && !membership.isMember ? (
        <PrivateCommunityLock
          communityId={community.id}
          communityName={community.name}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Events Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">
                Upcoming Events
              </h2>
              {membership.isMember && (
                <Link
                  href={`/communities/${community.slug}/events/new`}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  + Create Event
                </Link>
              )}
            </div>

            {community.events.length === 0 ? (
              <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center">
                <svg
                  className="w-12 h-12 mx-auto text-neutral-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="text-neutral-900 font-medium mb-1">
                  No upcoming events
                </h3>
                <p className="text-neutral-500 text-sm">
                  {membership.isMember
                    ? "Be the first to create an event!"
                    : "Join the community to create events."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {community.events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/communities/${community.slug}/events/${event.id}`}
                    className="block bg-white rounded-lg border border-neutral-200 p-4 hover:border-primary-300 transition-colors"
                  >
                    <h3 className="font-medium text-neutral-900">{event.title}</h3>
                    <p className="text-sm text-neutral-500 mt-1">
                      {event.sessions[0]?.startTime
                        ? new Date(event.sessions[0].startTime).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            ...(event.timezone ? { timeZone: event.timezone } : {}),
                          })
                        : "No sessions"}
                      {event.location && ` • ${event.location}`}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Members Sidebar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">Members</h2>
              {membership.isOwner && (
                <Link
                  href={`/communities/${community.slug}/members`}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Manage
                </Link>
              )}
            </div>

            <MemberList
              members={members}
              totalCount={community._count.members}
              communitySlug={community.slug}
              showManageLink={membership.isOwner}
            />
          </div>
        </div>
      )}
    </div>
  );
}
