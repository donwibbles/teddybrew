import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventWithDetails } from "@/lib/db/events";
import { getMembershipStatus } from "@/lib/actions/membership";
import { RSVPButton } from "@/components/event/rsvp-button";
import { AttendeeList } from "@/components/event/attendee-list";
import { RSVPStatus } from "@prisma/client";

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

  // Check if current user is going
  const userRsvp = event.rsvps.find(
    (rsvp) => rsvp.user.id === membership.userId && rsvp.status === RSVPStatus.GOING
  );
  const isGoing = !!userRsvp;

  // Calculate capacity status
  const goingCount = event.rsvps.filter((r) => r.status === RSVPStatus.GOING).length;
  const isPast = event.startTime < new Date();

  // Check if user can edit (organizer or co-organizer)
  const canEdit =
    membership.userId === event.organizerId ||
    event.coOrganizers.some((co) => co.id === membership.userId);

  // Format dates
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  };

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

          {/* Date & Time */}
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
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-neutral-900">
                  {formatDate(event.startTime)}
                </p>
                <p className="text-sm text-neutral-600">
                  {formatTime(event.startTime)}
                  {event.endTime && ` - ${formatTime(event.endTime)}`}
                </p>
              </div>
            </div>
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
                  <img
                    src={event.organizer.image}
                    alt={event.organizer.name || "Organizer"}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-700 font-medium">
                      {(event.organizer.name || event.organizer.email)
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-neutral-900">
                    {event.organizer.name || event.organizer.email}
                  </p>
                  <p className="text-xs text-neutral-500">Organizer</p>
                </div>
              </div>

              {/* Co-organizers */}
              {event.coOrganizers.map((co) => (
                <div key={co.id} className="flex items-center gap-3">
                  {co.image ? (
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
            <AttendeeList attendees={event.rsvps} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* RSVP Card */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6 sticky top-6">
            <RSVPButton
              eventId={event.id}
              isGoing={isGoing}
              isPast={isPast}
              isMember={membership.isMember}
              currentCount={goingCount}
              capacity={event.capacity}
            />

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
