"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createEventSchema } from "@/lib/validations/event";
import { z } from "zod";
import { createEvent } from "@/lib/actions/event";

// Form input type (before Zod transforms)
type CreateEventFormInput = z.input<typeof createEventSchema>;

interface CreateEventFormProps {
  communityId: string;
  communityName: string;
}

export function CreateEventForm({
  communityId,
  communityName,
}: CreateEventFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>("");

  // Get user's timezone on mount
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(tz);
  }, []);

  // Get minimum date (now) for datetime-local input
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateEventFormInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      communityId,
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      location: "",
      capacity: undefined,
    },
  });

  const startTime = watch("startTime");

  const onSubmit = async (data: CreateEventFormInput) => {
    setIsSubmitting(true);
    setServerError(null);

    const result = await createEvent(data);

    if (result.success) {
      router.push(`/communities/${result.data.communitySlug}/events/${result.data.eventId}`);
    } else {
      setServerError(result.error);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div
          role="alert"
          className="p-4 bg-error-50 border border-error-200 rounded-lg text-error-600 text-sm"
        >
          {serverError}
        </div>
      )}

      {/* Hidden community ID */}
      <input type="hidden" {...register("communityId")} />

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
          {...register("title")}
          placeholder="Monthly Meetup"
          disabled={isSubmitting}
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-neutral-50 disabled:text-neutral-500"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-error-600">{errors.title.message}</p>
        )}
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
          {...register("description")}
          placeholder="Tell people what this event is about..."
          rows={4}
          disabled={isSubmitting}
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-neutral-50 disabled:text-neutral-500 resize-none"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-error-600">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Timezone notice */}
      {timezone && (
        <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg">
          <p className="text-sm text-primary-700">
            Enter times in your local timezone ({timezone})
          </p>
        </div>
      )}

      {/* Date/Time fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="startTime"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            Start Date & Time <span className="text-error-500">*</span>
          </label>
          <input
            id="startTime"
            type="datetime-local"
            {...register("startTime")}
            min={getMinDateTime()}
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       disabled:bg-neutral-50 disabled:text-neutral-500"
          />
          {errors.startTime && (
            <p className="mt-1 text-sm text-error-600">
              {errors.startTime.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="endTime"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            End Date & Time
          </label>
          <input
            id="endTime"
            type="datetime-local"
            {...register("endTime")}
            min={(startTime as string) || getMinDateTime()}
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       disabled:bg-neutral-50 disabled:text-neutral-500"
          />
          {errors.endTime && (
            <p className="mt-1 text-sm text-error-600">
              {errors.endTime.message}
            </p>
          )}
        </div>
      </div>

      {/* Location field */}
      <div>
        <label
          htmlFor="location"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Location
        </label>
        <input
          id="location"
          type="text"
          {...register("location")}
          placeholder="123 Main St, City or Online (Zoom link)"
          disabled={isSubmitting}
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-neutral-50 disabled:text-neutral-500"
        />
        {errors.location && (
          <p className="mt-1 text-sm text-error-600">
            {errors.location.message}
          </p>
        )}
      </div>

      {/* Capacity field */}
      <div>
        <label
          htmlFor="capacity"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Capacity Limit
        </label>
        <input
          id="capacity"
          type="number"
          {...register("capacity", {
            setValueAs: (v) => v === "" || v === null ? undefined : Number(v) || undefined
          })}
          placeholder="Leave empty for unlimited"
          min={1}
          max={10000}
          disabled={isSubmitting}
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-neutral-50 disabled:text-neutral-500"
        />
        {errors.capacity && (
          <p className="mt-1 text-sm text-error-600">
            {errors.capacity.message}
          </p>
        )}
        <p className="mt-1 text-xs text-neutral-500">
          Maximum number of attendees. Leave empty for no limit.
        </p>
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
          disabled={isSubmitting}
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
