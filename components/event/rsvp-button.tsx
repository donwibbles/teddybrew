"use client";

import { useState, useOptimistic, useTransition } from "react";
import { rsvpToEvent, cancelRsvp } from "@/lib/actions/rsvp";

interface RSVPButtonProps {
  eventId: string;
  isGoing: boolean;
  isPast: boolean;
  isMember: boolean;
  currentCount: number;
  capacity: number | null;
}

export function RSVPButton({
  eventId,
  isGoing,
  isPast,
  isMember,
  currentCount,
  capacity,
}: RSVPButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Optimistic state for RSVP status
  const [optimisticIsGoing, setOptimisticIsGoing] = useOptimistic(
    isGoing,
    (_current, newValue: boolean) => newValue
  );

  // Optimistic state for count
  const [optimisticCount, setOptimisticCount] = useOptimistic(
    currentCount,
    (_current, newValue: number) => newValue
  );

  const handleRSVP = () => {
    setError(null);
    startTransition(async () => {
      // Optimistic update
      setOptimisticIsGoing(true);
      setOptimisticCount(currentCount + 1);

      const result = await rsvpToEvent({ eventId });
      if (!result.success) {
        setError(result.error);
        // Revert optimistic update on error
        setOptimisticIsGoing(false);
        setOptimisticCount(currentCount);
      }
    });
  };

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      // Optimistic update
      setOptimisticIsGoing(false);
      setOptimisticCount(currentCount - 1);

      const result = await cancelRsvp({ eventId });
      if (!result.success) {
        setError(result.error);
        // Revert optimistic update on error
        setOptimisticIsGoing(true);
        setOptimisticCount(currentCount);
      }
    });
  };

  // Event is in the past
  if (isPast) {
    return (
      <div className="text-neutral-500 text-sm">
        This event has ended
      </div>
    );
  }

  // User is not a member
  if (!isMember) {
    return (
      <div className="text-neutral-500 text-sm">
        Join the community to RSVP
      </div>
    );
  }

  // Calculate remaining spots
  const remainingSpots = capacity ? capacity - optimisticCount : null;
  const displayFull = capacity && optimisticCount >= capacity && !optimisticIsGoing;

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-error-50 border border-error-200 rounded-lg text-error-600 text-sm">
          {error}
        </div>
      )}

      {optimisticIsGoing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-success-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">You&apos;re going!</span>
          </div>
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="w-full px-4 py-2.5 border border-neutral-300 text-neutral-700 font-medium rounded-lg
                       hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Updating..." : "Cancel RSVP"}
          </button>
        </div>
      ) : displayFull ? (
        <div className="p-4 bg-neutral-100 rounded-lg text-center">
          <p className="font-medium text-neutral-700">Event Full</p>
          <p className="text-sm text-neutral-500 mt-1">
            All {capacity} spots have been taken
          </p>
        </div>
      ) : (
        <button
          onClick={handleRSVP}
          disabled={isPending}
          className="w-full px-4 py-2.5 bg-primary-500 text-white font-medium rounded-lg
                     hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Updating..." : "RSVP - I'm Going"}
        </button>
      )}

      {/* Capacity indicator */}
      {capacity && (
        <div className="text-sm text-neutral-500 text-center">
          {optimisticCount} / {capacity} spots taken
          {remainingSpots !== null && remainingSpots > 0 && remainingSpots <= 5 && (
            <span className="text-warning-600 ml-1">
              ({remainingSpots} left!)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
