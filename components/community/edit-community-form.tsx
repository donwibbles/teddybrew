"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { updateCommunity } from "@/lib/actions/community";
import { CommunityType } from "@prisma/client";
import { StateSelect } from "@/components/ui/state-select";
import { ImageUpload } from "@/components/ui/image-upload";
import { US_STATE_CODES } from "@/lib/constants/us-states";
import type { USStateCode } from "@/lib/constants/us-states";

const editCommunitySchema = z
  .object({
    name: z
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(100, "Name must be at most 100 characters"),
    description: z
      .string()
      .max(2000, "Description must be at most 2000 characters")
      .optional(),
    type: z.enum(["PUBLIC", "PRIVATE"]),
    city: z.string().max(100).optional().nullable(),
    state: z.enum(US_STATE_CODES).optional().nullable(),
    isVirtual: z.boolean().optional(),
    bannerImage: z.string().url().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // State is required for non-virtual communities
    if (data.isVirtual === false && !data.state) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "State is required for non-virtual communities",
        path: ["state"],
      });
    }
  });

type EditCommunityInput = z.infer<typeof editCommunitySchema>;

interface EditCommunityFormProps {
  community: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    type: CommunityType;
    city: string | null;
    state: string | null;
    isVirtual: boolean;
    bannerImage: string | null;
  };
}

export function EditCommunityForm({ community }: EditCommunityFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isDirty },
  } = useForm<EditCommunityInput>({
    resolver: zodResolver(editCommunitySchema),
    defaultValues: {
      name: community.name,
      description: community.description || "",
      type: community.type,
      city: community.city || "",
      state: (community.state as USStateCode) || null,
      isVirtual: community.isVirtual,
      bannerImage: community.bannerImage || null,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- Known RHF limitation with watch
  const isVirtual = watch("isVirtual");

  const onSubmit = async (data: EditCommunityInput) => {
    setIsSubmitting(true);
    setServerError(null);
    setSuccessMessage(null);

    const result = await updateCommunity({
      communityId: community.id,
      name: data.name,
      description: data.description || undefined,
      type: data.type,
      city: data.isVirtual ? null : (data.city || null),
      state: data.isVirtual ? null : data.state,
      isVirtual: data.isVirtual,
      bannerImage: data.bannerImage,
    });

    if (result.success) {
      setSuccessMessage("Settings saved successfully");
      toast.success("Settings updated!");
      router.refresh();
    } else {
      setServerError(result.error);
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

      {successMessage && (
        <div
          role="status"
          className="p-4 bg-success-100 border border-success-500 rounded-lg text-success-700 text-sm"
        >
          {successMessage}
        </div>
      )}

      {/* Banner Image */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Banner Image
        </label>
        <p className="text-sm text-foreground-muted mb-3">
          This image will be displayed at the top of your community page. Recommended ratio is 4:1.
        </p>
        <Controller
          name="bannerImage"
          control={control}
          render={({ field }) => (
            <ImageUpload
              type="community-banner"
              entityId={community.id}
              currentImage={field.value}
              onUploadComplete={(url) => field.onChange(url)}
              onRemove={() => field.onChange(null)}
              aspectRatio={4}
              disabled={isSubmitting}
              previewClassName="max-h-48"
            />
          )}
        />
      </div>

      {/* Slug (read-only) */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          URL Slug
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground-muted">/communities/</span>
          <input
            type="text"
            value={community.slug}
            disabled
            className="flex-1 px-4 py-2.5 border border-border rounded-lg text-foreground-muted bg-background-muted"
          />
        </div>
        <p className="mt-1 text-xs text-foreground-muted">
          The URL slug cannot be changed after creation
        </p>
      </div>

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
          disabled={isSubmitting}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-foreground placeholder-foreground-muted
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-background-muted disabled:text-foreground-muted"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-error-600">{errors.name.message}</p>
        )}
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
          Community Type
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
                Only invited members can join
              </span>
            </div>
          </label>
        </div>
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
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="px-6 py-2.5 bg-primary-subtle0 text-white font-medium rounded-lg
                     hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
