"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  createCommunitySchema,
  generateSlug,
} from "@/lib/validations/community";
import { z } from "zod";
import { StateSelect } from "@/components/ui/state-select";
import type { USStateCode } from "@/lib/constants/us-states";

// Form input type (before Zod transforms)
type CreateCommunityFormInput = z.input<typeof createCommunitySchema>;
import { createCommunity } from "@/lib/actions/community";

export function CreateCommunityForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateCommunityFormInput>({
    resolver: zodResolver(createCommunitySchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      type: "PUBLIC",
      city: "",
      state: null,
      isVirtual: false,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- Known RHF limitation with watch
  const isVirtual = watch("isVirtual");

  // Auto-generate slug from name
  const name = watch("name");
  useEffect(() => {
    if (name) {
      const generatedSlug = generateSlug(name);
      setValue("slug", generatedSlug, { shouldValidate: true });
    }
  }, [name, setValue]);

  const onSubmit = async (data: CreateCommunityFormInput) => {
    setIsSubmitting(true);
    setServerError(null);

    const result = await createCommunity(data);

    if (result.success) {
      toast.success("Community created!");
      router.push(`/communities/${result.data.slug}`);
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

      {/* Name field */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Community Name <span className="text-error-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          {...register("name")}
          placeholder="My Awesome Community"
          disabled={isSubmitting}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-foreground placeholder-foreground-muted
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-background-muted disabled:text-foreground-muted"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-error-600">{errors.name.message}</p>
        )}
      </div>

      {/* Slug field */}
      <div>
        <label
          htmlFor="slug"
          className="block text-sm font-medium text-foreground mb-1"
        >
          URL Slug <span className="text-error-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground-muted">/communities/</span>
          <input
            id="slug"
            type="text"
            {...register("slug")}
            placeholder="my-awesome-community"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 border border-border rounded-lg text-foreground placeholder-foreground-muted
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       disabled:bg-background-muted disabled:text-foreground-muted"
          />
        </div>
        {errors.slug && (
          <p className="mt-1 text-sm text-error-600">{errors.slug.message}</p>
        )}
        <p className="mt-1 text-xs text-foreground-muted">
          This cannot be changed after creation. Use lowercase letters, numbers,
          and hyphens only.
        </p>
      </div>

      {/* Description field */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          {...register("description")}
          placeholder="Tell people what your community is about..."
          rows={4}
          disabled={isSubmitting}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-foreground placeholder-foreground-muted
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-background-muted disabled:text-foreground-muted resize-none"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-error-600">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Type field */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">
          Community Type <span className="text-error-500">*</span>
        </label>
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-background-hover transition-colors">
            <input
              type="radio"
              {...register("type")}
              value="PUBLIC"
              disabled={isSubmitting}
              className="mt-0.5 h-4 w-4 text-primary-500 focus:ring-primary-500"
            />
            <div>
              <span className="block font-medium text-foreground">Public</span>
              <span className="block text-sm text-foreground-muted">
                Anyone can discover and join this community
              </span>
            </div>
          </label>
          <label className="flex items-start gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-background-hover transition-colors">
            <input
              type="radio"
              {...register("type")}
              value="PRIVATE"
              disabled={isSubmitting}
              className="mt-0.5 h-4 w-4 text-primary-500 focus:ring-primary-500"
            />
            <div>
              <span className="block font-medium text-foreground">
                Private
              </span>
              <span className="block text-sm text-foreground-muted">
                Only invited members can join (invites coming soon)
              </span>
            </div>
          </label>
        </div>
        {errors.type && (
          <p className="mt-1 text-sm text-error-600">{errors.type.message}</p>
        )}
      </div>

      {/* Location Section */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Location
          </label>
          <label className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-background-hover transition-colors">
            <input
              type="checkbox"
              {...register("isVirtual")}
              disabled={isSubmitting}
              className="h-4 w-4 text-primary-500 focus:ring-primary-500 rounded"
            />
            <div>
              <span className="block font-medium text-foreground">
                Virtual Community
              </span>
              <span className="block text-sm text-foreground-muted">
                This is an online-only community with no physical location
              </span>
            </div>
          </label>
        </div>

        {!isVirtual && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-foreground mb-1"
              >
                City
              </label>
              <input
                id="city"
                type="text"
                {...register("city")}
                placeholder="e.g., San Francisco"
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-foreground placeholder-foreground-muted
                           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                           disabled:bg-background-muted disabled:text-foreground-muted"
              />
            </div>
            <div>
              <label
                htmlFor="state"
                className="block text-sm font-medium text-foreground mb-1"
              >
                State <span className="text-error-500">*</span>
              </label>
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <StateSelect
                    value={field.value as USStateCode | null}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                    error={errors.state?.message}
                  />
                )}
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit button */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="px-6 py-2.5 border border-border text-foreground font-medium rounded-lg
                     hover:bg-background-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border
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
            "Create Community"
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
