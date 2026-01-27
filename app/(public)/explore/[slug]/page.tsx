import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCommunityWithDetails } from "@/lib/db/communities";
import { getCommunityMembers } from "@/lib/db/members";
import { ExploreCommunityTabs } from "@/components/community/explore-community-tabs";

interface PublicCommunityPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PublicCommunityPageProps) {
  const { slug } = await params;
  const community = await getCommunityWithDetails(slug);

  if (!community) {
    return { title: "Community Not Found" };
  }

  return {
    title: `${community.name} - Hive Community`,
    description: community.description || `Discover ${community.name} on Hive Community`,
  };
}

export default async function PublicCommunityPage({ params }: PublicCommunityPageProps) {
  const { slug } = await params;
  const session = await auth();

  // Redirect authenticated users to the full community experience
  if (session?.user) {
    redirect(`/communities/${slug}`);
  }

  const community = await getCommunityWithDetails(slug);

  if (!community) {
    notFound();
  }

  // If private community, show limited view with sign-in CTA
  if (community.type === "PRIVATE") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 text-neutral-500 mb-4">
            <svg
              className="w-8 h-8"
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
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            Private Community
          </h1>
          <p className="text-neutral-600 mb-6">
            This community is private. Sign in to request access or view if you&apos;re already a member.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary-500 text-white font-medium rounded-lg
                       hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                       transition-colors"
          >
            Sign In to View
          </Link>
        </div>
      </div>
    );
  }

  const members = await getCommunityMembers(community.id, 5);

  // Public community preview
  return (
    <div className="space-y-6">
      {/* Sign in to join banner */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-medium text-primary-900">
              Want to join {community.name}?
            </p>
            <p className="text-sm text-primary-700 mt-1">
              Sign in to join this community, RSVP to events, and connect with members.
            </p>
          </div>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg
                       hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                       transition-colors whitespace-nowrap"
          >
            Sign in to Join
          </Link>
        </div>
      </div>

      {/* Community Header */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
              {community.name}
            </h1>

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

        </div>
      </div>

      {/* Navigation Tabs */}
      <ExploreCommunityTabs communitySlug={slug} />

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Events Section */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            Upcoming Events
          </h2>

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
                Sign in and join this community to see and create events.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {community.events.map((event) => (
                <Link
                  key={event.id}
                  href={`/explore/${slug}/events/${event.id}`}
                  className="block bg-white rounded-lg border border-neutral-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all"
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
                  <p className="text-xs text-primary-600 mt-2">
                    Sign in to RSVP
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Members Sidebar */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900">Members</h2>
          <div className="bg-white rounded-lg border border-neutral-200 p-6 text-center">
            <div className="flex justify-center -space-x-2 mb-4">
              {members.map((member, index) => (
                <div
                  key={member.user.id}
                  className="w-10 h-10 rounded-full bg-neutral-200 border-2 border-white flex items-center justify-center text-neutral-500 text-sm font-medium"
                  style={{ zIndex: 5 - index }}
                >
                  {member.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.user.image}
                      alt={member.user.name || "Member"}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    member.user.name?.charAt(0).toUpperCase() || "?"
                  )}
                </div>
              ))}
              {community._count.members > 5 && (
                <div
                  className="w-10 h-10 rounded-full bg-neutral-100 border-2 border-white flex items-center justify-center text-neutral-500 text-xs font-medium"
                >
                  +{community._count.members - 5}
                </div>
              )}
            </div>
            <p className="text-sm text-neutral-600 mb-4">
              {community._count.members} {community._count.members === 1 ? "member" : "members"} in this community
            </p>
            <Link
              href="/sign-in"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Sign in to see all members
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
