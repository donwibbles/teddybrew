"use client";

import { useState, useTransition } from "react";
import { Calendar, MapPin, Users } from "lucide-react";
import { rsvpToSession, cancelRsvp } from "@/lib/actions/rsvp";
import { toast } from "sonner";

interface SessionCardProps {
  session: {
    id: string;
    title: string | null;
    startTime: Date;
    endTime: Date | null;
    location: string | null;
    capacity: number | null;
    rsvpCount: number;
  };
  eventCapacity: number | null;
  eventLocation: string | null;
  isGoing: boolean;
  isPast: boolean;
  isMember: boolean;
  /** Whether the community is public (allows auto-join on RSVP) */
  isPublicCommunity?: boolean;
  /** Whether the user is logged in */
  isLoggedIn?: boolean;
  sessionIndex: number;
  totalSessions: number;
  timezone?: string;
}

export function SessionCard({
  session,
  eventCapacity,
  eventLocation,
  isGoing,
  isPast,
  isMember,
  isPublicCommunity = false,
  isLoggedIn = false,
  sessionIndex,
  totalSessions,
  timezone,
}: SessionCardProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticIsGoing, setOptimisticIsGoing] = useState(isGoing);
  const [optimisticCount, setOptimisticCount] = useState(session.rsvpCount);

  const effectiveCapacity = session.capacity ?? eventCapacity;
  const effectiveLocation = session.location ?? eventLocation;
  const isFull = effectiveCapacity
    ? optimisticCount >= effectiveCapacity
    : false;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      ...(timezone ? { timeZone: timezone } : {}),
    }).format(new Date(date));
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      ...(timezone ? { timeZone: timezone } : {}),
    }).format(new Date(date));
  };

  const handleRSVP = () => {
    startTransition(async () => {
      setOptimisticIsGoing(true);
      setOptimisticCount((c) => c + 1);

      const result = await rsvpToSession({ sessionId: session.id });
      if (!result.success) {
        toast.error(result.error);
        setOptimisticIsGoing(false);
        setOptimisticCount((c) => c - 1);
      }
    });
  };

  const handleCancel = () => {
    startTransition(async () => {
      setOptimisticIsGoing(false);
      setOptimisticCount((c) => c - 1);

      const result = await cancelRsvp({ sessionId: session.id });
      if (!result.success) {
        toast.error(result.error);
        setOptimisticIsGoing(true);
        setOptimisticCount((c) => c + 1);
      }
    });
  };

  // Default session title
  const displayTitle =
    session.title ||
    (totalSessions > 1 ? `Session ${sessionIndex + 1}` : "Event Session");

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-neutral-900">{displayTitle}</h3>

          <div className="mt-2 space-y-1.5 text-sm text-neutral-600">
            {/* Date & Time */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-neutral-400" />
              <span>
                {formatDate(session.startTime)} at {formatTime(session.startTime)}
                {session.endTime && ` - ${formatTime(session.endTime)}`}
              </span>
            </div>

            {/* Location */}
            {effectiveLocation && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-neutral-400" />
                <span className="truncate">{effectiveLocation}</span>
              </div>
            )}

            {/* Attendees */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-400" />
              <span>
                {optimisticCount} attending
                {effectiveCapacity && ` / ${effectiveCapacity} spots`}
              </span>
            </div>
          </div>
        </div>

        {/* RSVP Button */}
        <div className="shrink-0">
          {isPast ? (
            <span className="text-sm text-neutral-500">Past session</span>
          ) : !isLoggedIn ? (
            <span className="text-sm text-neutral-500">Sign in to RSVP</span>
          ) : !isMember && !isPublicCommunity ? (
            <span className="text-sm text-neutral-500">Join to RSVP</span>
          ) : optimisticIsGoing ? (
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 text-sm text-success-600">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Going
              </span>
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="block text-xs text-neutral-500 hover:text-neutral-700 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : isFull ? (
            <span className="text-sm text-warning-600">Full</span>
          ) : (
            <div className="text-center">
              <button
                onClick={handleRSVP}
                disabled={isPending}
                className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg
                           hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                {isPending ? "..." : "RSVP"}
              </button>
              {!isMember && isPublicCommunity && (
                <p className="text-xs text-neutral-500 mt-1">Joins community</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
