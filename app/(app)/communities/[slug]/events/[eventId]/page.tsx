import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Video, ExternalLink } from "lucide-react";
import { ProfileLink } from "@/components/ui/profile-link";
import { getEventWithDetails } from "@/lib/db/events";
import { getMembershipStatus } from "@/lib/db/queries";
import { SessionList } from "@/components/event/session-list";
import { PrivateCommunityLock } from "@/components/community/private-community-lock";

interface EventPageProps {
  params: Promise<{ slug: string; eventId: string }>;
}

export async function generateMetadata({ params }: EventPageProps) {
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

export default async function EventPage({ params }: EventPageProps) {
  const { slug, eventId } = await params;
  const event = await getEventWithDetails(eventId);

  if (!event || event.community.slug !== slug) {
    notFound();
  }

  // Get membership status
  const membership = await getMembershipStatus(event.communityId);

  // Check if community is private and user is not a member
  if (event.community.type === "PRIVATE" && !membership.isMember) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
          <Link
            href={`/communities/${event.community.slug}`}
            className="hover:text-primary-600"
          >
            {event.community.name}
          </Link>
          <span>/</span>
          <span>Events</span>
        </div>

        <PrivateCommunityLock
          communityId={event.communityId}
          communityName={event.community.name}
        />
      </div>
    );
  }

  // Check if user is attending any session
  const isGoing = event.sessions.some((session) =>
    session.rsvps.some((rsvp) => rsvp.user.id === membership.userId)
  );

  // Check if all sessions are in the past
  const isPast =
    event.sessions.length > 0 &&
    event.sessions.every((s) => new Date(s.startTime) < new Date());

  // Check if user can edit (organizer or co-organizer)
  const canEdit =
    membership.userId === event.organizerId ||
    event.coOrganizers.some((co) => co.id === membership.userId);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
        <Link
          href={`/communities/${event.community.slug}`}
          className="hover:text-primary-600"
        >
          {event.community.name}
        </Link>
        <span>/</span>
        <span>Events</span>
      </div>

      {/* Cover Image Banner */}
      {event.coverImage && (
        <div className="relative w-full rounded-lg overflow-hidden mb-6" style={{ aspectRatio: '3 / 1' }}>
          <Image
            src={event.coverImage}
            alt={`Cover image for ${event.title}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
            className="object-cover"
            priority
          />
        </div>
      )}

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
              currentUserId={membership.userId}
              isMember={membership.isMember}
              isPublicCommunity={event.community.type === "PUBLIC"}
              timezone={event.timezone || undefined}
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

          {/* Virtual Event Info */}
          {event.isVirtual && (
            <div className="bg-white rounded-lg border border-neutral-200 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary-600" />
                <span className="font-medium text-neutral-900">Virtual Event</span>
              </div>

              {/* Meeting URL */}
              {event.meetingUrl && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <ExternalLink className="h-4 w-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900">Meeting Link</p>
                    <a
                      href={event.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700 truncate block"
                    >
                      {event.meetingUrl}
                    </a>
                  </div>
                </div>
              )}

              {/* Event Chat Link - Only show to attendees */}
              {event.chatChannelId && isGoing && (
                <Link
                  href={`/communities/${slug}/chat?channel=${event.chatChannelId}`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  Join Event Chat
                </Link>
              )}

              {/* Message for non-attendees */}
              {event.chatChannelId && !isGoing && membership.isMember && (
                <p className="text-sm text-neutral-500 text-center">
                  RSVP to access the event chat
                </p>
              )}
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
                  <Image
                    src={event.organizer.image}
                    alt={event.organizer.name || "Organizer"}
                    width={40}
                    height={40}
                    className="rounded-full"
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
                  <ProfileLink
                    user={event.organizer}
                    className="font-medium text-neutral-900 hover:text-primary-600"
                  >
                    {event.organizer.name || "Event Organizer"}
                  </ProfileLink>
                  <p className="text-xs text-neutral-500">Organizer</p>
                </div>
              </div>

              {/* Co-organizers */}
              {event.coOrganizers.map((co) => (
                <div key={co.id} className="flex items-center gap-3">
                  {co.image ? (
                    <Image
                      src={co.image}
                      alt={co.name || "Co-organizer"}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-700 font-medium">
                        {(co.name || "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <ProfileLink
                      user={co}
                      className="font-medium text-neutral-900 hover:text-primary-600"
                    />
                    <p className="text-xs text-neutral-500">Co-organizer</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attendees */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h2 className="font-medium text-neutral-900 mb-4">Attendees</h2>
            {(() => {
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

              if (attendees.length === 0) {
                return (
                  <p className="text-sm text-neutral-500">
                    No attendees yet. Be the first to RSVP!
                  </p>
                );
              }

              return (
                <div className="space-y-3">
                  {attendees.slice(0, 10).map(({ user, sessionCount }) => (
                    <div key={user.id} className="flex items-center gap-3">
                      {user.image ? (
                        <Image
                          src={user.image}
                          alt={user.name || "Attendee"}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-700 text-sm font-medium">
                            {(user.name || "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <ProfileLink
                          user={user}
                          className="text-sm font-medium text-neutral-900 truncate block hover:text-primary-600"
                        />
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
              );
            })()}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Attendance Summary Card */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6 sticky top-24">
            {(() => {
              // Calculate total unique attendees
              const uniqueAttendees = new Set<string>();
              event.sessions.forEach((session) => {
                session.rsvps.forEach((rsvp) => {
                  uniqueAttendees.add(rsvp.user.id);
                });
              });
              const totalAttendees = uniqueAttendees.size;

              return (
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
                  {isGoing && (
                    <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-success-100 text-success-700 text-sm rounded-full">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      You&apos;re going
                    </div>
                  )}
                  {isPast && (
                    <p className="mt-2 text-xs text-neutral-500">
                      This event has ended
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Edit button for organizers */}
            {canEdit && (
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <Link
                  href={`/communities/${slug}/events/${eventId}/edit`}
                  className="block w-full text-center px-4 py-2 text-sm text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Edit Event
                </Link>
              </div>
            )}
          </div>

          {/* Community Card */}
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <p className="text-xs text-neutral-500 mb-2">Hosted by</p>
            <Link
              href={`/communities/${event.community.slug}`}
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
