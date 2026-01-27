import { notFound } from "next/navigation";
import Link from "next/link";
import { getCommunityWithDetails } from "@/lib/db/communities";
import { getMembershipStatus } from "@/lib/actions/membership";
import { JoinLeaveButton } from "@/components/community/join-leave-button";
import { MemberList } from "@/components/community/member-list";
import { PrivateCommunityLock } from "@/components/community/private-community-lock";
import { CommunityTabs } from "@/components/community/community-tabs";

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-neutral-900">
                {community.name}
              </h1>
              {community.type === "PRIVATE" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600">
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Private
                </span>
              )}
            </div>

            {community.description && (
              <p className="text-neutral-600 mb-4">{community.description}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-neutral-500">
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {community._count.members}{" "}
                {community._count.members === 1 ? "member" : "members"}
              </span>
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {community._count.events}{" "}
                {community._count.events === 1 ? "event" : "events"}
              </span>
              <span>
                Created by {community.owner.name || "Community Creator"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {membership.isOwner ? (
              <Link
                href={`/communities/${community.slug}/settings`}
                className="inline-flex items-center justify-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg
                           hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                           transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Settings
              </Link>
            ) : (
              <JoinLeaveButton
                communityId={community.id}
                communityType={community.type}
                isMember={membership.isMember}
              />
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      {(community.type === "PUBLIC" || membership.isMember) && (
        <CommunityTabs
          communitySlug={community.slug}
          isMember={membership.isMember}
        />
      )}

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
              members={community.members.slice(0, 10)}
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
