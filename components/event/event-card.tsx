import Link from "next/link";
import { EventTypeBadge } from "@/components/tags/event-type-select";
import type { EventTypeValue } from "@/lib/validations/event";

interface Session {
  id: string;
  startTime: Date;
  endTime: Date | null;
  _count: { rsvps: number };
  rsvps?: Array<{ userId: string }>;
}

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    capacity: number | null;
    timezone?: string | null;
    isVirtual?: boolean;
    eventType?: string | null;
    state?: string | null;
    showAttendeeCount?: boolean;
    community: {
      slug: string;
      name: string;
    };
    organizer: {
      name: string | null;
      image: string | null;
    };
    sessions: Session[];
  };
  currentUserId?: string;
  showCommunity?: boolean;
  basePath?: string;
}

export function EventCard({
  event,
  currentUserId,
  showCommunity = true,
  basePath = "/communities",
}: EventCardProps) {
  const now = new Date();
  const sessions = event.sessions || [];
  const firstSession = sessions[0];
  const lastSession = sessions[sessions.length - 1];

  // Check if all sessions are in the past
  const isPast = sessions.length > 0 && sessions.every((s) => new Date(s.startTime) < now);

  // Check if user is attending any session
  const isGoing =
    currentUserId &&
    sessions.some((s) =>
      s.rsvps?.some((r) => r.userId === currentUserId)
    );

  // Total RSVP count (unique users across sessions would need deduplication, using sum for simplicity)
  const totalRsvps = sessions.reduce((sum, s) => sum + s._count.rsvps, 0);

  // Check if event is full (simplified: if first session is full)
  const isFull = event.capacity && firstSession && firstSession._count.rsvps >= event.capacity;

  const tzOption = event.timezone ? { timeZone: event.timezone } : {};

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      ...tzOption,
    }).format(new Date(date));
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      ...tzOption,
    }).format(new Date(date));
  };

  const getTimezoneAbbr = () => {
    if (!event.timezone || !firstSession) return "";
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: event.timezone,
        timeZoneName: "short",
      }).formatToParts(new Date(firstSession.startTime));
      const tzPart = parts.find((p) => p.type === "timeZoneName");
      return tzPart ? ` ${tzPart.value}` : "";
    } catch {
      return "";
    }
  };

  // Format date range for multi-session events
  const getDateDisplay = () => {
    if (!firstSession) return "No sessions";

    if (sessions.length === 1) {
      return `${formatDate(firstSession.startTime)} at ${formatTime(firstSession.startTime)}${getTimezoneAbbr()}`;
    }

    // Multi-session: show date range
    const startDate = formatDate(firstSession.startTime);
    const endDate = lastSession ? formatDate(lastSession.startTime) : startDate;

    if (startDate === endDate) {
      return `${startDate} - ${sessions.length} sessions`;
    }

    return `${startDate} - ${endDate} - ${sessions.length} sessions`;
  };

  return (
    <Link
      href={`${basePath}/${event.community.slug}/events/${event.id}`}
      className="block bg-white rounded-lg border border-neutral-200 hover:border-primary-300 hover:shadow-sm transition-all"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0 flex-1">
            {showCommunity && (
              <p className="text-xs text-neutral-500 mb-1">
                {event.community.name}
              </p>
            )}
            <h3 className="font-medium text-neutral-900 truncate">
              {event.title}
            </h3>
          </div>

          {/* Status badges */}
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            {isPast && (
              <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded">
                Past
              </span>
            )}
            {isGoing && !isPast && (
              <span className="px-2 py-0.5 bg-success-100 text-success-700 text-xs rounded">
                Going
              </span>
            )}
            {isFull && !isPast && !isGoing && (
              <span className="px-2 py-0.5 bg-warning-100 text-warning-700 text-xs rounded">
                Full
              </span>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-neutral-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
              clipRule="evenodd"
            />
          </svg>
          <span>{getDateDisplay()}</span>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-neutral-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {/* Tags row */}
        {(event.eventType || event.isVirtual || event.state) && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {event.eventType && (
              <EventTypeBadge type={event.eventType as EventTypeValue} size="sm" />
            )}
            {event.isVirtual && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                Virtual
              </span>
            )}
            {event.state && !event.isVirtual && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600">
                {event.state}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
          {/* Organizer */}
          <div className="flex items-center gap-2">
            {event.organizer.image ? (
              <img
                src={event.organizer.image}
                alt={event.organizer.name || "Organizer"}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 text-xs font-medium">
                  {(event.organizer.name || "?").charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-xs text-neutral-500">
              by {event.organizer.name || "Anonymous"}
            </span>
          </div>

          {/* Attendees count - only show if showAttendeeCount is true (default) */}
          {(event.showAttendeeCount !== false) && (
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              <span>
                {totalRsvps} attending
                {event.capacity && ` (${event.capacity} max/session)`}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
