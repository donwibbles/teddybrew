"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createComment } from "@/lib/actions/comment";
import { toast } from "sonner";

const commentFormSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(10000, "Comment must be at most 10,000 characters"),
});

type FormData = z.infer<typeof commentFormSchema>;

interface CommentFormProps {
  postId: string;
  parentId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CommentForm({
  postId,
  parentId,
  onSuccess,
  onCancel,
  placeholder = "Write a comment...",
  autoFocus = false,
}: CommentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { content: "" },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    const result = await createComment({
      postId,
      content: data.content,
      parentId,
    });

    if (result.success) {
      toast.success("Comment posted");
      reset();
      onSuccess?.();
    } else {
      toast.error(result.error);
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="relative">
        <textarea
          {...register("content")}
          placeholder={placeholder}
          disabled={isSubmitting}
          autoFocus={autoFocus}
          rows={3}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm
                     placeholder:text-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed
                     resize-y min-h-[80px]"
        />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-2 right-2 p-1 text-neutral-400 hover:text-neutral-600 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {errors.content && (
        <p className="text-sm text-error-500">{errors.content.message}</p>
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500">Markdown supported</p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {parentId ? "Reply" : "Comment"}
          </Button>
        </div>
      </div>
    </form>
  );
}
