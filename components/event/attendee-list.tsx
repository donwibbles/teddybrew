"use client";

import { RSVPStatus } from "@prisma/client";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface Attendee {
  id: string;
  status: RSVPStatus;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface AttendeeListProps {
  attendees: Attendee[];
  maxDisplay?: number;
}

export function AttendeeList({ attendees, maxDisplay = 20 }: AttendeeListProps) {
  const goingAttendees = attendees.filter((a) => a.status === RSVPStatus.GOING);
  const displayedAttendees = goingAttendees.slice(0, maxDisplay);
  const remainingCount = goingAttendees.length - maxDisplay;

  if (goingAttendees.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No attendees yet"
        description="Be the first to RSVP!"
        className="py-8"
      />
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-neutral-900">
        Attending ({goingAttendees.length})
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {displayedAttendees.map((attendee) => (
          <div
            key={attendee.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-neutral-50"
          >
            {attendee.user.image ? (
              <img
                src={attendee.user.image}
                alt={attendee.user.name || "Attendee"}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 font-medium text-xs">
                  {(attendee.user.name || "?").charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-sm text-neutral-700 truncate">
              {attendee.user.name || "Anonymous"}
            </span>
          </div>
        ))}
      </div>

      {remainingCount > 0 && (
        <p className="text-sm text-neutral-500 text-center">
          +{remainingCount} more attending
        </p>
      )}
    </div>
  );
}
