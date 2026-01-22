"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validations/profile";
import { updateProfile, checkUsernameAvailability } from "@/lib/actions/profile";

interface ProfileEditFormProps {
  initialName?: string | null;
  initialUsername?: string | null;
  onCancel?: () => void;
  isOnboarding?: boolean;
}

export function ProfileEditForm({
  initialName,
  initialUsername,
  onCancel,
  isOnboarding = false,
}: ProfileEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: initialName || "",
      username: initialUsername || "",
    },
  });

  const username = watch("username");

  // Debounced username availability check
  const checkUsername = useCallback(async (value: string) => {
    if (!value || value.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    // Don't check if it's the same as initial
    if (value.toLowerCase() === initialUsername?.toLowerCase()) {
      setUsernameStatus("available");
      return;
    }

    setUsernameStatus("checking");

    const result = await checkUsernameAvailability(value);

    if (result.success) {
      setUsernameStatus(result.data.available ? "available" : "taken");
    } else {
      setUsernameStatus("idle");
    }
  }, [initialUsername]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username && username.length >= 3) {
        checkUsername(username);
      } else {
        setUsernameStatus("idle");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, checkUsername]);

  const onSubmit = async (data: UpdateProfileInput) => {
    if (usernameStatus === "taken") {
      setServerError("This username is already taken");
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    const result = await updateProfile(data);

    if (result.success) {
      toast.success("Profile updated successfully!");
      router.refresh();
      if (onCancel) {
        onCancel();
      }
    } else {
      setServerError(result.error);
      toast.error(result.error);
    }

    setIsSubmitting(false);
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

      {/* Name field */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Display Name <span className="text-error-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          {...register("name")}
          placeholder="Your display name"
          disabled={isSubmitting}
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-neutral-50 disabled:text-neutral-500"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-error-600">{errors.name.message}</p>
        )}
      </div>

      {/* Username field */}
      <div>
        <label
          htmlFor="username"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Username <span className="text-error-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">@</span>
          <input
            id="username"
            type="text"
            {...register("username")}
            placeholder="username"
            disabled={isSubmitting}
            className="w-full pl-8 pr-10 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       disabled:bg-neutral-50 disabled:text-neutral-500"
          />
          {usernameStatus !== "idle" && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2">
              {usernameStatus === "checking" && (
                <LoadingSpinner className="h-4 w-4 text-neutral-400" />
              )}
              {usernameStatus === "available" && (
                <svg className="h-4 w-4 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {usernameStatus === "taken" && (
                <svg className="h-4 w-4 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </span>
          )}
        </div>
        {errors.username && (
          <p className="mt-1 text-sm text-error-600">{errors.username.message}</p>
        )}
        {usernameStatus === "taken" && !errors.username && (
          <p className="mt-1 text-sm text-error-600">This username is already taken</p>
        )}
        {usernameStatus === "available" && !errors.username && (
          <p className="mt-1 text-sm text-success-600">Username is available</p>
        )}
        <p className="mt-1 text-xs text-neutral-500">
          3-20 characters. Letters, numbers, and underscores only.
        </p>
      </div>

      {/* Submit buttons */}
      <div className="flex gap-3 pt-2">
        {!isOnboarding && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-2.5 border border-neutral-300 text-neutral-700 font-medium rounded-lg
                       hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || usernameStatus === "taken" || usernameStatus === "checking" || (!isDirty && !isOnboarding)}
          className="flex-1 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-lg
                     hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner />
              Saving...
            </span>
          ) : isOnboarding ? (
            "Complete Setup"
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </form>
  );
}

function LoadingSpinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
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
