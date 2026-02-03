import Link from "next/link";
import { Star, MapPin, Video, Calendar } from "lucide-react";

interface FeaturedEvent {
  id: string;
  title: string;
  location: string | null;
  isVirtual: boolean;
  timezone: string;
  coverImage: string | null;
  sessions: {
    id: string;
    startTime: Date;
    endTime: Date | null;
  }[];
}

interface FeaturedEventsSectionProps {
  events: FeaturedEvent[];
  communitySlug: string;
  canManage: boolean;
}

export function FeaturedEventsSection({
  events,
  communitySlug,
  canManage,
}: FeaturedEventsSectionProps) {
  // Don't render if no spotlighted events
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          Featured Events
        </h2>
        {canManage && (
          <Link
            href={`/communities/${communitySlug}/settings#spotlight`}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Manage
          </Link>
        )}
      </div>

      {/* Events Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <FeaturedEventCard
            key={event.id}
            event={event}
            communitySlug={communitySlug}
          />
        ))}
      </div>
    </div>
  );
}

function FeaturedEventCard({
  event,
  communitySlug,
}: {
  event: FeaturedEvent;
  communitySlug: string;
}) {
  const firstSession = event.sessions[0];

  return (
    <Link
      href={`/communities/${communitySlug}/events/${event.id}`}
      className="block bg-neutral-50 rounded-lg border border-neutral-200 p-4 hover:border-primary-300 hover:bg-neutral-100 transition-colors"
    >
      {/* Event Title */}
      <h3 className="font-medium text-neutral-900 mb-2 line-clamp-2">
        {event.title}
      </h3>

      {/* Date/Time */}
      {firstSession && (
        <div className="flex items-center gap-1.5 text-sm text-neutral-600 mb-1.5">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span>
            {new Date(firstSession.startTime).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZone: event.timezone,
            })}
          </span>
        </div>
      )}

      {/* Location */}
      <div className="flex items-center gap-1.5 text-sm text-neutral-500">
        {event.isVirtual ? (
          <>
            <Video className="w-4 h-4 flex-shrink-0" />
            <span>Virtual</span>
          </>
        ) : event.location ? (
          <>
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </>
        ) : null}
      </div>
    </Link>
  );
}
