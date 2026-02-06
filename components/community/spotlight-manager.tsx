"use client";

import { useState, useTransition } from "react";
import { Star, Calendar, MapPin, Video, Loader2 } from "lucide-react";
import { spotlightEvent } from "@/lib/actions/spotlight";

interface Event {
  id: string;
  title: string;
  location: string | null;
  isVirtual: boolean;
  isSpotlighted: boolean;
  spotlightOrder: number;
  sessions: {
    id: string;
    startTime: Date;
  }[];
}

interface SpotlightManagerProps {
  events: Event[];
}

const MAX_SPOTLIGHTED = 3;

export function SpotlightManager({ events }: SpotlightManagerProps) {
  const spotlightedCount = events.filter((e) => e.isSpotlighted).length;

  return (
    <div className="space-y-4">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-muted">
          Select up to {MAX_SPOTLIGHTED} events to feature at the top of your community page.
        </p>
        <span className="text-sm font-medium text-foreground">
          {spotlightedCount}/{MAX_SPOTLIGHTED} spotlighted
        </span>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="text-center py-8 text-foreground-muted">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No upcoming events to spotlight.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <SpotlightEventItem
              key={event.id}
              event={event}
              canSpotlight={spotlightedCount < MAX_SPOTLIGHTED || event.isSpotlighted}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SpotlightEventItem({
  event,
  canSpotlight,
}: {
  event: Event;
  canSpotlight: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [notifyMembers, setNotifyMembers] = useState(false);
  const [showNotifyOption, setShowNotifyOption] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstSession = event.sessions[0];

  const handleToggleSpotlight = () => {
    if (event.isSpotlighted) {
      // Unspotlight immediately
      startTransition(async () => {
        setError(null);
        const result = await spotlightEvent({
          eventId: event.id,
          spotlight: false,
          notifyMembers: false,
        });
        if (!result.success) {
          setError(result.error);
        }
      });
    } else {
      // Show notify option for spotlighting
      setShowNotifyOption(true);
    }
  };

  const handleConfirmSpotlight = () => {
    startTransition(async () => {
      setError(null);
      const result = await spotlightEvent({
        eventId: event.id,
        spotlight: true,
        notifyMembers,
      });
      if (!result.success) {
        setError(result.error);
      } else {
        setShowNotifyOption(false);
        setNotifyMembers(false);
      }
    });
  };

  const handleCancelSpotlight = () => {
    setShowNotifyOption(false);
    setNotifyMembers(false);
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        event.isSpotlighted
          ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Event Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {event.isSpotlighted && (
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
            <h4 className="font-medium text-foreground truncate">{event.title}</h4>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground-muted">
            {firstSession && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(firstSession.startTime).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
            {event.isVirtual ? (
              <span className="flex items-center gap-1">
                <Video className="w-3.5 h-3.5" />
                Virtual
              </span>
            ) : event.location ? (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {event.location}
              </span>
            ) : null}
          </div>
        </div>

        {/* Action Button */}
        {!showNotifyOption && (
          <button
            onClick={handleToggleSpotlight}
            disabled={isPending || (!canSpotlight && !event.isSpotlighted)}
            className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              event.isSpotlighted
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800"
                : "bg-background-muted text-foreground hover:bg-background-hover"
            }`}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : event.isSpotlighted ? (
              "Unspotlight"
            ) : (
              "Spotlight"
            )}
          </button>
        )}
      </div>

      {/* Notify Option Panel */}
      {showNotifyOption && (
        <div className="mt-3 pt-3 border-t border-border">
          <label className="flex items-center gap-2 text-sm text-foreground mb-3">
            <input
              type="checkbox"
              checked={notifyMembers}
              onChange={(e) => setNotifyMembers(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
            />
            Notify members about this featured event
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={handleConfirmSpotlight}
              disabled={isPending}
              className="px-3 py-1.5 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Spotlight"
              )}
            </button>
            <button
              onClick={handleCancelSpotlight}
              disabled={isPending}
              className="px-3 py-1.5 text-sm font-medium text-foreground-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-2 text-sm text-error-600">{error}</p>
      )}
    </div>
  );
}
