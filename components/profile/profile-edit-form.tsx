"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validations/profile";
import { updateProfile, checkUsernameAvailability } from "@/lib/actions/profile";
import { Lock } from "lucide-react";

interface ProfileEditFormProps {
  initialFirstName?: string | null;
  initialLastName?: string | null;
  initialName?: string | null;
  initialUsername?: string | null;
  initialBio?: string | null;
  initialInterests?: string | null;
  initialCommunityHope?: string | null;
  initialIsPublic?: boolean;
  initialShowUpcomingEvents?: boolean;
  initialShowPastEvents?: boolean;
  initialShowCommunities?: boolean;
  initialEmailEventReminders?: boolean;
  onCancel?: () => void;
  isOnboarding?: boolean;
}

/**
 * Generate default display name from first and last name
 * Format: "FirstName L." (first name + first letter of last name)
 */
function generateDisplayName(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const lastInitial = lastName.trim().charAt(0).toUpperCase();
  if (first && lastInitial) {
    return `${first} ${lastInitial}.`;
  }
  return first || "";
}

export function ProfileEditForm({
  initialFirstName,
  initialLastName,
  initialName,
  initialUsername,
  initialBio,
  initialInterests,
  initialCommunityHope,
  initialIsPublic = true,
  initialShowUpcomingEvents = true,
  initialShowPastEvents = false,
  initialShowCommunities = true,
  initialEmailEventReminders = true,
  onCancel,
  isOnboarding = false,
}: ProfileEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [hasManuallyEditedDisplayName, setHasManuallyEditedDisplayName] = useState(!isOnboarding);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: initialFirstName || "",
      lastName: initialLastName || "",
      name: initialName || "",
      username: initialUsername || "",
      bio: initialBio || "",
      interests: initialInterests || "",
      communityHope: initialCommunityHope || "",
      isPublic: initialIsPublic,
      showUpcomingEvents: initialShowUpcomingEvents,
      showPastEvents: initialShowPastEvents,
      showCommunities: initialShowCommunities,
      emailEventReminders: initialEmailEventReminders,
    },
  });

  const username = watch("username");
  const firstName = watch("firstName");
  const lastName = watch("lastName");

  // Auto-populate display name during onboarding when first/last name changes
  useEffect(() => {
    if (isOnboarding && !hasManuallyEditedDisplayName && firstName) {
      const displayName = generateDisplayName(firstName, lastName || "");
      setValue("name", displayName, { shouldDirty: true });
    }
  }, [firstName, lastName, isOnboarding, hasManuallyEditedDisplayName, setValue]);

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {serverError && (
        <div
          role="alert"
          className="p-4 bg-error-50 border border-error-200 rounded-lg text-error-600 text-sm"
        >
          {serverError}
        </div>
      )}

      {/* Private Information Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
          <Lock className="h-4 w-4 text-neutral-400" />
          <h3 className="text-sm font-medium text-neutral-600 uppercase tracking-wide">
            Private Information
          </h3>
        </div>
        <p className="text-sm text-neutral-500">
          Your name is only visible to you and community administrators. It won&apos;t be shown publicly.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* First Name */}
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              First Name <span className="text-error-500">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              {...register("firstName")}
              placeholder="Your first name"
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                         disabled:bg-neutral-50 disabled:text-neutral-500"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-error-600">{errors.firstName.message}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Last Name <span className="text-error-500">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              {...register("lastName")}
              placeholder="Your last name"
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                         disabled:bg-neutral-50 disabled:text-neutral-500"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-error-600">{errors.lastName.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Public Profile Section */}
      <div className="space-y-4">
        <div className="pb-2 border-b border-neutral-200">
          <h3 className="text-sm font-medium text-neutral-600 uppercase tracking-wide">
            Public Profile
          </h3>
        </div>
        <p className="text-sm text-neutral-500">
          This information is visible to other users on your public profile and in communities.
        </p>

        {/* Display Name field */}
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
            {...register("name", {
              onChange: () => setHasManuallyEditedDisplayName(true),
            })}
            placeholder="How others will see you"
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       disabled:bg-neutral-50 disabled:text-neutral-500"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-error-600">{errors.name.message}</p>
          )}
          <p className="mt-1 text-xs text-neutral-500">
            This is how other users will see you in chat and communities
          </p>
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
            Used for @mentions and your profile URL. 3-20 characters, letters, numbers, and underscores only.
          </p>
        </div>

        {/* Bio field */}
        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            About You
          </label>
          <textarea
            id="bio"
            {...register("bio")}
            rows={3}
            placeholder="Tell others a bit about yourself..."
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       disabled:bg-neutral-50 disabled:text-neutral-500 resize-none"
          />
          {errors.bio && (
            <p className="mt-1 text-sm text-error-600">{errors.bio.message}</p>
          )}
          <p className="mt-1 text-xs text-neutral-500">Max 500 characters</p>
        </div>

        {/* Interests field */}
        <div>
          <label
            htmlFor="interests"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            What issues matter most to you?
          </label>
          <textarea
            id="interests"
            {...register("interests")}
            rows={3}
            placeholder="Share what causes or topics you care about..."
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       disabled:bg-neutral-50 disabled:text-neutral-500 resize-none"
          />
          {errors.interests && (
            <p className="mt-1 text-sm text-error-600">{errors.interests.message}</p>
          )}
          <p className="mt-1 text-xs text-neutral-500">Max 500 characters</p>
        </div>

        {/* Community Hope field */}
        <div>
          <label
            htmlFor="communityHope"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            What gives you hope about building community?
          </label>
          <textarea
            id="communityHope"
            {...register("communityHope")}
            rows={3}
            placeholder="Share what inspires you about connecting with others..."
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       disabled:bg-neutral-50 disabled:text-neutral-500 resize-none"
          />
          {errors.communityHope && (
            <p className="mt-1 text-sm text-error-600">{errors.communityHope.message}</p>
          )}
          <p className="mt-1 text-xs text-neutral-500">Max 500 characters</p>
        </div>

        {/* Privacy Settings */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-neutral-700">Privacy Settings</h4>

          {/* Public profile toggle */}
          <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg">
            <input
              type="checkbox"
              id="isPublic"
              {...register("isPublic")}
              disabled={isSubmitting}
              className="mt-1 h-4 w-4 text-primary-600 border-neutral-300 rounded
                         focus:ring-primary-500 disabled:opacity-50"
            />
            <div>
              <label
                htmlFor="isPublic"
                className="block text-sm font-medium text-neutral-900 cursor-pointer"
              >
                Allow others to view your profile
              </label>
              <p className="text-xs text-neutral-500 mt-0.5">
                When enabled, other users can view your profile at /u/{watch("username") || "username"}
              </p>
            </div>
          </div>

          {/* Show communities toggle */}
          <div className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg">
            <input
              type="checkbox"
              id="showCommunities"
              {...register("showCommunities")}
              disabled={isSubmitting}
              className="mt-1 h-4 w-4 text-primary-600 border-neutral-300 rounded
                         focus:ring-primary-500 disabled:opacity-50"
            />
            <div>
              <label
                htmlFor="showCommunities"
                className="block text-sm font-medium text-neutral-900 cursor-pointer"
              >
                Show my communities on profile
              </label>
              <p className="text-xs text-neutral-500 mt-0.5">
                Display the public communities you&apos;ve joined
              </p>
            </div>
          </div>

          {/* Show upcoming events toggle */}
          <div className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg">
            <input
              type="checkbox"
              id="showUpcomingEvents"
              {...register("showUpcomingEvents")}
              disabled={isSubmitting}
              className="mt-1 h-4 w-4 text-primary-600 border-neutral-300 rounded
                         focus:ring-primary-500 disabled:opacity-50"
            />
            <div>
              <label
                htmlFor="showUpcomingEvents"
                className="block text-sm font-medium text-neutral-900 cursor-pointer"
              >
                Show my upcoming events
              </label>
              <p className="text-xs text-neutral-500 mt-0.5">
                Display events you&apos;re organizing or attending
              </p>
            </div>
          </div>

          {/* Show past events toggle */}
          <div className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg">
            <input
              type="checkbox"
              id="showPastEvents"
              {...register("showPastEvents")}
              disabled={isSubmitting}
              className="mt-1 h-4 w-4 text-primary-600 border-neutral-300 rounded
                         focus:ring-primary-500 disabled:opacity-50"
            />
            <div>
              <label
                htmlFor="showPastEvents"
                className="block text-sm font-medium text-neutral-900 cursor-pointer"
              >
                Show my past events
              </label>
              <p className="text-xs text-neutral-500 mt-0.5">
                Display your event history on your profile
              </p>
            </div>
          </div>
        </div>

        {/* Email Preferences */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-neutral-700">Email Preferences</h4>

          <div className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg">
            <input
              type="checkbox"
              id="emailEventReminders"
              {...register("emailEventReminders")}
              disabled={isSubmitting}
              className="mt-1 h-4 w-4 text-primary-600 border-neutral-300 rounded
                         focus:ring-primary-500 disabled:opacity-50"
            />
            <div>
              <label
                htmlFor="emailEventReminders"
                className="block text-sm font-medium text-neutral-900 cursor-pointer"
              >
                Event reminder emails
              </label>
              <p className="text-xs text-neutral-500 mt-0.5">
                Receive email reminders about upcoming events you&apos;re attending
              </p>
            </div>
          </div>
        </div>
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
