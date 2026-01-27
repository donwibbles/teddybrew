"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateEvent, deleteEvent } from "@/lib/actions/event";
import { AddSessionForm } from "./add-session-form";
import {
  localDateTimeToUTC,
  getMinDateTimeForTimezone,
  COMMON_TIMEZONES,
} from "@/lib/utils/timezone";

interface Session {
  id?: string;
  title?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  capacity?: number;
}

interface EditEventFormProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    capacity: number | null;
    isVirtual?: boolean;
    meetingUrl?: string | null;
    timezone?: string;
    sessions: Array<{
      id: string;
      title: string | null;
      startTime: Date;
      endTime: Date | null;
      location: string | null;
      capacity: number | null;
    }>;
  };
  communitySlug: string;
  isCreator: boolean;
}

export function EditEventForm({
  event,
  communitySlug,
  isCreator,
}: EditEventFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>("");

  // Form state
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || "");
  const [location, setLocation] = useState(event.location || "");
  const [capacity, setCapacity] = useState<number | undefined>(
    event.capacity ?? undefined
  );
  const [isVirtual, setIsVirtual] = useState(event.isVirtual || false);
  const [meetingUrl, setMeetingUrl] = useState(event.meetingUrl || "");

  // Format UTC date to local datetime-local value in the event's timezone
  const formatDateForInput = (date: Date, tz: string) => {
    const d = new Date(date);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value || "00";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  };

  const eventTz = event.timezone || "America/New_York";

  const [sessions, setSessions] = useState<Session[]>(
    event.sessions.map((s) => ({
      id: s.id,
      title: s.title || "",
      startTime: formatDateForInput(s.startTime, eventTz),
      endTime: s.endTime ? formatDateForInput(s.endTime, eventTz) : "",
      location: s.location || "",
      capacity: s.capacity ?? undefined,
    }))
  );

  // Use event's stored timezone, or fallback to user's timezone
  useEffect(() => {
    if (event.timezone) {
      setTimezone(event.timezone);
    } else {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(tz);
    }
  }, [event.timezone]);

  // Get minimum date (now) for datetime-local input in the selected timezone
  const getMinDateTime = () => {
    if (!timezone) return "";
    return getMinDateTimeForTimezone(timezone);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setServerError(null);

    // Validate sessions have start times
    if (sessions.some((s) => !s.startTime)) {
      setServerError("All sessions must have a start time");
      setIsSubmitting(false);
      return;
    }

    const data = {
      eventId: event.id,
      title,
      description: description || undefined,
      location: location || undefined,
      capacity: capacity || undefined,
      isVirtual,
      meetingUrl: meetingUrl || undefined,
      timezone: timezone || "America/New_York",
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title || undefined,
        startTime: localDateTimeToUTC(s.startTime, timezone || "America/New_York"),
        endTime: s.endTime
          ? localDateTimeToUTC(s.endTime, timezone || "America/New_York")
          : undefined,
        location: s.location || undefined,
        capacity: s.capacity || undefined,
      })),
    };

    const result = await updateEvent(data);

    if (result.success) {
      router.push(`/communities/${communitySlug}/events/${event.id}`);
      router.refresh();
    } else {
      setServerError(result.error);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this event? This cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setServerError(null);

    const result = await deleteEvent({ eventId: event.id });

    if (result.success) {
      router.push(`/communities/${communitySlug}`);
    } else {
      setServerError(result.error);
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {serverError && (
        <div
          role="alert"
          className="p-4 bg-error-50 border border-error-200 rounded-lg text-error-600 text-sm"
        >
          {serverError}
        </div>
      )}

      {/* Title field */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Event Title <span className="text-error-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting || isDeleting}
          required
          minLength={3}
          maxLength={200}
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-neutral-50 disabled:text-neutral-500"
        />
      </div>

      {/* Description field */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          disabled={isSubmitting || isDeleting}
          maxLength={5000}
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-neutral-50 disabled:text-neutral-500 resize-none"
        />
      </div>

      {/* Timezone selector */}
      {timezone && (
        <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg space-y-2">
          <p className="text-sm text-primary-700">
            Enter times in the selected timezone
          </p>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={isSubmitting || isDeleting}
            className="w-full px-3 py-2 border border-primary-200 rounded-lg text-sm text-neutral-900 bg-white
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       disabled:bg-neutral-50 disabled:text-neutral-500"
          >
            {/* Show current timezone first if not in common list */}
            {!COMMON_TIMEZONES.some((tz) => tz.value === timezone) && (
              <option value={timezone}>{timezone}</option>
            )}
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sessions */}
      <AddSessionForm
        sessions={sessions}
        onChange={setSessions}
        minDateTime={getMinDateTime()}
        disabled={isSubmitting || isDeleting}
      />

      {/* Location field */}
      <div>
        <label
          htmlFor="location"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Default Location
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={isSubmitting || isDeleting}
          maxLength={500}
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-neutral-50 disabled:text-neutral-500"
        />
        {sessions.length > 1 && (
          <p className="mt-1 text-xs text-neutral-500">
            This location applies to all sessions unless overridden.
          </p>
        )}
      </div>

      {/* Capacity field */}
      <div>
        <label
          htmlFor="capacity"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Default Capacity Limit
        </label>
        <input
          id="capacity"
          type="number"
          value={capacity ?? ""}
          onChange={(e) =>
            setCapacity(e.target.value ? parseInt(e.target.value) : undefined)
          }
          placeholder="Leave empty for unlimited"
          min={1}
          max={10000}
          disabled={isSubmitting || isDeleting}
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-neutral-50 disabled:text-neutral-500"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Maximum attendees per session. Leave empty for no limit.
        </p>
      </div>

      {/* Virtual Event Toggle */}
      <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isVirtual}
            onChange={(e) => setIsVirtual(e.target.checked)}
            disabled={isSubmitting || isDeleting}
            className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500
                       disabled:opacity-50"
          />
          <div>
            <span className="font-medium text-neutral-900">Virtual Event</span>
            <p className="text-sm text-neutral-500">
              Enable a dedicated chat channel for event attendees
            </p>
          </div>
        </label>

        {/* Meeting URL (shown when virtual) */}
        {isVirtual && (
          <div className="mt-4">
            <label
              htmlFor="meetingUrl"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Meeting URL
            </label>
            <input
              id="meetingUrl"
              type="url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://zoom.us/j/... or https://meet.google.com/..."
              disabled={isSubmitting || isDeleting}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                         disabled:bg-neutral-50 disabled:text-neutral-500"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Optional: Provide a link to your video call or virtual meeting
            </p>
          </div>
        )}
      </div>

      {/* Submit buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting || isDeleting}
          className="px-6 py-2.5 border border-neutral-300 text-neutral-700 font-medium rounded-lg
                     hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={
            isSubmitting ||
            isDeleting ||
            !title.trim() ||
            sessions.some((s) => !s.startTime)
          }
          className="flex-1 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-lg
                     hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Delete Section - Only for creator */}
      {isCreator && (
        <div className="pt-6 mt-6 border-t border-neutral-200">
          <h3 className="text-sm font-medium text-error-600 mb-2">
            Danger Zone
          </h3>
          <p className="text-sm text-neutral-600 mb-4">
            Deleting this event will remove all sessions and RSVPs. This action
            cannot be undone.
          </p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting || isDeleting}
            className="px-4 py-2 border border-error-300 text-error-600 font-medium rounded-lg
                       hover:bg-error-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error-500
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDeleting ? "Deleting..." : "Delete Event"}
          </button>
        </div>
      )}
    </form>
  );
}
