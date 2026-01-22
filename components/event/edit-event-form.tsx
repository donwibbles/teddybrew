"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateEventSchema } from "@/lib/validations/event";
import { z } from "zod";
import { updateEvent, deleteEvent } from "@/lib/actions/event";

// Form input type (before Zod transforms)
type UpdateEventFormInput = z.input<typeof updateEventSchema>;

interface EditEventFormProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    startTime: Date;
    endTime: Date | null;
    location: string | null;
    capacity: number | null;
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

  // Get user's timezone on mount
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(tz);
  }, []);

  // Format date for datetime-local input
  const formatDateForInput = (date: Date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UpdateEventFormInput>({
    resolver: zodResolver(updateEventSchema),
    defaultValues: {
      eventId: event.id,
      title: event.title,
      description: event.description || "",
      startTime: formatDateForInput(event.startTime),
      endTime: event.endTime ? formatDateForInput(event.endTime) : "",
      location: event.location || "",
      capacity: event.capacity || undefined,
    },
  });

  const startTime = watch("startTime");

  const onSubmit = async (data: UpdateEventFormInput) => {
    setIsSubmitting(true);
    setServerError(null);

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
    if (!confirm("Are you sure you want to delete this event? This cannot be undone.")) {
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div
          role="alert"
          className="p-4 bg-error-50 border border-error-200 rounded-lg text-error-600 text-sm"
        >
          {serverError}
        </div>
      )}

      {/* Hidden event ID */}
      <input type="hidden" {...register("eventId")} />

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
          disabled={isSubmitting || isDeleting}
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
          rows={4}
          disabled={isSubmitting || isDeleting}
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
            disabled={isSubmitting || isDeleting}
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
            min={(startTime as string) || undefined}
            disabled={isSubmitting || isDeleting}
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
          disabled={isSubmitting || isDeleting}
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
          {...register("capacity", { valueAsNumber: true })}
          placeholder="Leave empty for unlimited"
          min={1}
          max={10000}
          disabled={isSubmitting || isDeleting}
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-neutral-50 disabled:text-neutral-500"
        />
        {errors.capacity && (
          <p className="mt-1 text-sm text-error-600">
            {errors.capacity.message}
          </p>
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
          disabled={isSubmitting || isDeleting}
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
            Deleting this event will remove all RSVPs. This action cannot be undone.
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
