import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getEventWithDetails } from "@/lib/db/events";
import { ExploreCommunityTabs } from "@/components/community/explore-community-tabs";

interface PublicEventPageProps {
  params: Promise<{ slug: string; eventId: string }>;
}

export async function generateMetadata({ params }: PublicEventPageProps) {
  const { eventId } = await params;
  const event = await getEventWithDetails(eventId);

  if (!event) {
    return { title: "Event Not Found" };
  }

  return {
    title: `${event.title} - ${event.community.name} - Hive Community`,
    description: event.description || `Event in ${event.community.name}`,
  };
}

export default async function PublicEventPage({ params }: PublicEventPageProps) {
  const { slug, eventId } = await params;
  const session = await auth();

  // Redirect authenticated users to the full experience
  if (session?.user) {
    redirect(`/communities/${slug}/events/${eventId}`);
  }

  const event = await getEventWithDetails(eventId);

  if (!event || event.community.slug !== slug) {
    notFound();
  }

  // Private community - show restricted message
  if (event.community.type === "PRIVATE") {
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
            This event is in a private community. Sign in to request access or view if you&apos;re already a member.
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

  // Import SessionList dynamically since it's a client component
  const { SessionList } = await import("@/components/event/session-list");

  // Check if all sessions are in the past
  const isPast =
    event.sessions.length > 0 &&
    event.sessions.every((s) => new Date(s.startTime) < new Date());

  // Collect unique attendees across all sessions
  const attendeeMap = new Map<
    string,
    { user: { id: string; name: string | null; image: string | null }; sessionCount: number }
  >();
  event.sessions.forEach((session) => {
    session.rsvps.forEach((rsvp) => {
      const existing = attendeeMap.get(rsvp.user.id);
      if (existing) {
        existing.sessionCount++;
      } else {
        attendeeMap.set(rsvp.user.id, {
          user: rsvp.user,
          sessionCount: 1,
        });
      }
    });
  });
  const attendees = Array.from(attendeeMap.values());
  const totalSessions = event.sessions.length;

  // Calculate total unique attendees
  const totalAttendees = attendeeMap.size;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Sign in banner */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-medium text-primary-900">
              Want to attend this event?
            </p>
            <p className="text-sm text-primary-700 mt-1">
              Sign in to RSVP and join {event.community.name}.
            </p>
          </div>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg
                       hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                       transition-colors whitespace-nowrap"
          >
            Sign in to RSVP
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ExploreCommunityTabs communitySlug={slug} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link
          href={`/explore/${event.community.slug}`}
          className="hover:text-primary-600"
        >
          {event.community.name}
        </Link>
        <span>/</span>
        <span>Events</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Header */}
          <div>
            {isPast && (
              <span className="inline-block px-2 py-1 bg-neutral-100 text-neutral-600 text-xs font-medium rounded mb-3">
                Past Event
              </span>
            )}
            <h1 className="text-2xl font-semibold text-neutral-900">
              {event.title}
            </h1>
          </div>

          {/* Sessions */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h2 className="font-medium text-neutral-900 mb-4">
              {event.sessions.length > 1
                ? `Sessions (${event.sessions.length})`
                : "When"}
            </h2>
            <SessionList
              sessions={event.sessions}
              eventCapacity={event.capacity}
              eventLocation={event.location}
              currentUserId={null}
              isMember={false}
              isPublicCommunity={event.community.type === "PUBLIC"}
            />
          </div>

          {/* Location */}
          {event.location && (
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary-50 rounded-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-primary-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-neutral-900">Location</p>
                  <p className="text-sm text-neutral-600">{event.location}</p>
                </div>
              </div>
            </div>
          )}

          {/* Virtual Event Info - hide meeting URL for security */}
          {event.isVirtual && (
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium text-neutral-900">Virtual Event</span>
              </div>
              <p className="text-sm text-neutral-500 mt-2">
                Sign in and RSVP to access the meeting link.
              </p>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <h2 className="font-medium text-neutral-900 mb-3">About</h2>
              <div className="prose prose-sm max-w-none text-neutral-700 whitespace-pre-wrap">
                {event.description}
              </div>
            </div>
          )}

          {/* Organizers */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h2 className="font-medium text-neutral-900 mb-4">Organizers</h2>
            <div className="space-y-3">
              {/* Main organizer */}
              <div className="flex items-center gap-3">
                {event.organizer.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.organizer.image}
                    alt={event.organizer.name || "Organizer"}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-700 font-medium">
                      {(event.organizer.name || "Event Organizer")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-neutral-900">
                    {event.organizer.name || "Event Organizer"}
                  </p>
                  <p className="text-xs text-neutral-500">Organizer</p>
                </div>
              </div>

              {/* Co-organizers */}
              {event.coOrganizers.map((co) => (
                <div key={co.id} className="flex items-center gap-3">
                  {co.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={co.image}
                      alt={co.name || "Co-organizer"}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-700 font-medium">
                        {(co.name || "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-neutral-900">
                      {co.name || "Anonymous"}
                    </p>
                    <p className="text-xs text-neutral-500">Co-organizer</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attendees */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h2 className="font-medium text-neutral-900 mb-4">Attendees</h2>
            {attendees.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No attendees yet. Be the first to RSVP!
              </p>
            ) : (
              <div className="space-y-3">
                {attendees.slice(0, 10).map(({ user, sessionCount }) => (
                  <div key={user.id} className="flex items-center gap-3">
                    {user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.image}
                        alt={user.name || "Attendee"}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-700 text-sm font-medium">
                          {(user.name || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {user.name || "Anonymous"}
                      </p>
                      {totalSessions > 1 && (
                        <p className="text-xs text-neutral-500">
                          {sessionCount} of {totalSessions} sessions
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {attendees.length > 10 && (
                  <p className="text-sm text-neutral-500">
                    +{attendees.length - 10} more attendees
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Attendance Summary Card */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6 sticky top-24">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-primary-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                <span className="text-2xl font-semibold text-neutral-900">
                  {totalAttendees}
                </span>
              </div>
              <p className="text-sm text-neutral-600">
                {totalAttendees === 1 ? "person attending" : "people attending"}
              </p>
              {isPast && (
                <p className="mt-2 text-xs text-neutral-500">
                  This event has ended
                </p>
              )}
            </div>
          </div>

          {/* Community Card */}
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <p className="text-xs text-neutral-500 mb-2">Hosted by</p>
            <Link
              href={`/explore/${event.community.slug}`}
              className="font-medium text-neutral-900 hover:text-primary-600"
            >
              {event.community.name}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
