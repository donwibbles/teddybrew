"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "@/lib/actions/event";
import { AddSessionForm } from "./add-session-form";
import { ImageUpload } from "@/components/ui/image-upload";
import { StateSelect } from "@/components/ui/state-select";
import { EventTypeSelect } from "@/components/tags/event-type-select";
import { IssueTagSelect } from "@/components/tags/issue-tag-select";
import {
  localDateTimeToUTC,
  getMinDateTimeForTimezone,
  COMMON_TIMEZONES,
} from "@/lib/utils/timezone";
import type { USStateCode } from "@/lib/constants/us-states";
import type { EventTypeValue } from "@/lib/validations/event";

interface Session {
  title?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  capacity?: number;
}

interface IssueTag {
  id: string;
  slug: string;
  name: string;
}

interface CreateEventFormProps {
  communityId: string;
  communityName: string;
  availableTags: IssueTag[];
}

export function CreateEventForm({
  communityId,
  communityName,
  availableTags,
}: CreateEventFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState<number | undefined>(undefined);
  const [coverImage, setCoverImage] = useState("");
  const [isVirtual, setIsVirtual] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [sessions, setSessions] = useState<Session[]>([
    { startTime: "", endTime: "" },
  ]);

  // New fields: location (city/state), event type, and issue tags
  const [city, setCity] = useState("");
  const [state, setState] = useState<USStateCode | null>(null);
  const [eventType, setEventType] = useState<EventTypeValue | null>(null);
  const [issueTagIds, setIssueTagIds] = useState<string[]>([]);

  // Get user's timezone on mount
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(tz);
  }, []);

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
      communityId,
      title,
      description: description || undefined,
      location: location || undefined,
      capacity: capacity || undefined,
      coverImage: coverImage || undefined,
      isVirtual,
      meetingUrl: meetingUrl || undefined,
      // Location fields (city/state)
      city: isVirtual ? null : (city || null),
      state: isVirtual ? null : state,
      // Event categorization
      eventType: eventType || null,
      issueTagIds,
      timezone: timezone || "America/New_York",
      sessions: sessions.map((s) => ({
        title: s.title || undefined,
        startTime: localDateTimeToUTC(s.startTime, timezone || "America/New_York"),
        endTime: s.endTime
          ? localDateTimeToUTC(s.endTime, timezone || "America/New_York")
          : undefined,
        location: s.location || undefined,
        capacity: s.capacity || undefined,
      })),
    };

    const result = await createEvent(data);

    if (result.success) {
      router.push(
        `/communities/${result.data.communitySlug}/events/${result.data.eventId}`
      );
    } else {
      setServerError(result.error);
      setIsSubmitting(false);
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

      {/* Community display (read-only) */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Community
        </label>
        <p className="text-neutral-900">{communityName}</p>
      </div>

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
          placeholder="Monthly Meetup"
          disabled={isSubmitting}
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
          placeholder="Tell people what this event is about..."
          rows={4}
          disabled={isSubmitting}
          maxLength={5000}
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-neutral-50 disabled:text-neutral-500 resize-none"
        />
      </div>

      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Cover Image
        </label>
        <ImageUpload
          type="event-cover"
          entityId={communityId}
          aspectRatio={3}
          onUploadComplete={(url) => setCoverImage(url)}
          onRemove={() => setCoverImage("")}
          disabled={isSubmitting}
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
            disabled={isSubmitting}
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
        disabled={isSubmitting}
      />

      {/* Location field (default for all sessions) */}
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
          placeholder="123 Main St, City or Online (Zoom link)"
          disabled={isSubmitting}
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

      {/* Capacity field (default for all sessions) */}
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
          disabled={isSubmitting}
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-neutral-50 disabled:text-neutral-500"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Maximum attendees per session. Leave empty for no limit.
        </p>
      </div>

      {/* Event Type */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Event Type
        </label>
        <EventTypeSelect
          value={eventType}
          onChange={setEventType}
          disabled={isSubmitting}
          placeholder="Select event type (optional)"
        />
      </div>

      {/* Issue Tags */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Issue Tags
        </label>
        <p className="text-sm text-neutral-500 mb-2">
          Select the issues this event relates to (optional)
        </p>
        <IssueTagSelect
          availableTags={availableTags}
          selectedTagIds={issueTagIds}
          onChange={setIssueTagIds}
          disabled={isSubmitting}
          placeholder="Select issue tags..."
        />
      </div>

      {/* City/State Location (not virtual) */}
      {!isVirtual && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Event Location (City/State)
          </label>
          <p className="text-sm text-neutral-500 mb-2">
            Where is this event taking place? (for search/filtering)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., San Francisco"
                disabled={isSubmitting}
                maxLength={100}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                           disabled:bg-neutral-50 disabled:text-neutral-500"
              />
            </div>
            <div>
              <StateSelect
                value={state}
                onChange={setState}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Virtual Event Toggle */}
      <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isVirtual}
            onChange={(e) => setIsVirtual(e.target.checked)}
            disabled={isSubmitting}
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
              disabled={isSubmitting}
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
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="px-6 py-2.5 border border-neutral-300 text-neutral-700 font-medium rounded-lg
                     hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || sessions.some((s) => !s.startTime)}
          className="flex-1 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-lg
                     hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner />
              Creating...
            </span>
          ) : (
            "Create Event"
          )}
        </button>
      </div>
    </form>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
