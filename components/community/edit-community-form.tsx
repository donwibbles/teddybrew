"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { updateCommunity } from "@/lib/actions/community";
import { CommunityType } from "@prisma/client";

const editCommunitySchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be at most 100 characters"),
  description: z
    .string()
    .max(2000, "Description must be at most 2000 characters")
    .optional(),
  type: z.enum(["PUBLIC", "PRIVATE"]),
});

type EditCommunityInput = z.infer<typeof editCommunitySchema>;

interface EditCommunityFormProps {
  community: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    type: CommunityType;
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
    formState: { errors, isDirty },
  } = useForm<EditCommunityInput>({
    resolver: zodResolver(editCommunitySchema),
    defaultValues: {
      name: community.name,
      description: community.description || "",
      type: community.type,
    },
  });

  const onSubmit = async (data: EditCommunityInput) => {
    setIsSubmitting(true);
    setServerError(null);
    setSuccessMessage(null);

    const result = await updateCommunity({
      communityId: community.id,
      name: data.name,
      description: data.description || undefined,
      type: data.type,
    });

    if (result.success) {
      setSuccessMessage("Settings saved successfully");
      toast.success("Settings updated!");
      router.refresh();
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

      {successMessage && (
        <div
          role="status"
          className="p-4 bg-success-100 border border-success-500 rounded-lg text-success-700 text-sm"
        >
          {successMessage}
        </div>
      )}

      {/* Slug (read-only) */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          URL Slug
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">/communities/</span>
          <input
            type="text"
            value={community.slug}
            disabled
            className="flex-1 px-4 py-2.5 border border-neutral-200 rounded-lg text-neutral-500 bg-neutral-50"
          />
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          The URL slug cannot be changed after creation
        </p>
      </div>

      {/* Name field */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Community Name <span className="text-error-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          {...register("name")}
          disabled={isSubmitting}
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-neutral-50 disabled:text-neutral-500"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-error-600">{errors.name.message}</p>
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

      {/* Type field */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-3">
          Community Type
        </label>
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
            <input
              type="radio"
              {...register("type")}
              value="PUBLIC"
              disabled={isSubmitting}
              className="mt-0.5 h-4 w-4 text-primary-500 focus:ring-primary-500"
            />
            <div>
              <span className="block font-medium text-neutral-900">Public</span>
              <span className="block text-sm text-neutral-500">
                Anyone can discover and join this community
              </span>
            </div>
          </label>
          <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
            <input
              type="radio"
              {...register("type")}
              value="PRIVATE"
              disabled={isSubmitting}
              className="mt-0.5 h-4 w-4 text-primary-500 focus:ring-primary-500"
            />
            <div>
              <span className="block font-medium text-neutral-900">
                Private
              </span>
              <span className="block text-sm text-neutral-500">
                Only invited members can join
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Submit button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="px-6 py-2.5 bg-primary-500 text-white font-medium rounded-lg
                     hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
