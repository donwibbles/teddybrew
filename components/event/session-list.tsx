"use client";

import { SessionCard } from "./session-card";

interface Session {
  id: string;
  title: string | null;
  startTime: Date;
  endTime: Date | null;
  location: string | null;
  capacity: number | null;
  _count: { rsvps: number };
  rsvps: Array<{ user: { id: string } }>;
}

interface SessionListProps {
  sessions: Session[];
  eventCapacity: number | null;
  eventLocation: string | null;
  currentUserId: string | null;
  isMember: boolean;
  /** Whether the community is public (allows auto-join on RSVP) */
  isPublicCommunity?: boolean;
  /** IANA timezone for display */
  timezone?: string;
}

export function SessionList({
  sessions,
  eventCapacity,
  eventLocation,
  currentUserId,
  isMember,
  isPublicCommunity = false,
  timezone,
}: SessionListProps) {
  const now = new Date();

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-foreground-muted">
        No sessions scheduled
      </div>
    );
  }

  // Calculate user's attendance
  const attendingCount = currentUserId
    ? sessions.filter((s) =>
        s.rsvps.some((r) => r.user.id === currentUserId)
      ).length
    : 0;

  return (
    <div className="space-y-4">
      {/* Attendance summary for multi-session events */}
      {sessions.length > 1 && currentUserId && attendingCount > 0 && (
        <div className="p-3 bg-success-50 border border-success-200 rounded-lg text-sm text-success-700">
          You&apos;re attending {attendingCount} of {sessions.length} sessions
        </div>
      )}

      {/* Session cards */}
      <div className="space-y-3">
        {sessions.map((session, index) => {
          const isPast = new Date(session.startTime) < now;
          const isGoing = currentUserId
            ? session.rsvps.some((r) => r.user.id === currentUserId)
            : false;

          return (
            <SessionCard
              key={session.id}
              session={{
                id: session.id,
                title: session.title,
                startTime: session.startTime,
                endTime: session.endTime,
                location: session.location,
                capacity: session.capacity,
                rsvpCount: session._count.rsvps,
              }}
              eventCapacity={eventCapacity}
              eventLocation={eventLocation}
              isGoing={isGoing}
              isPast={isPast}
              isMember={isMember}
              isPublicCommunity={isPublicCommunity}
              isLoggedIn={!!currentUserId}
              sessionIndex={index}
              totalSessions={sessions.length}
              timezone={timezone}
            />
          );
        })}
      </div>
    </div>
  );
}
