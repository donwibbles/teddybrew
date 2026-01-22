"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownRenderer } from "./markdown-renderer";
import { createPost } from "@/lib/actions/post";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const createPostFormSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(300, "Title must be at most 300 characters"),
  content: z
    .string()
    .min(10, "Content must be at least 10 characters")
    .max(40000, "Content must be at most 40,000 characters"),
});

type FormData = z.infer<typeof createPostFormSchema>;

interface CreatePostFormProps {
  communityId: string;
  communitySlug: string;
}

export function CreatePostForm({
  communityId,
  communitySlug,
}: CreatePostFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(createPostFormSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const content = watch("content");

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    const result = await createPost({
      communityId,
      title: data.title,
      content: data.content,
    });

    if (result.success) {
      toast.success("Post created");
      router.push(`/communities/${communitySlug}/forum/${result.data.postId}`);
    } else {
      toast.error(result.error);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          {...register("title")}
          placeholder="An interesting title for your post"
          disabled={isSubmitting}
          maxLength={300}
        />
        {errors.title && (
          <p className="text-sm text-error-500">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="content">Content</Label>
          <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors",
                !showPreview
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Write
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors",
                showPreview
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
          </div>
        </div>

        {showPreview ? (
          <div className="min-h-[200px] p-4 border border-neutral-300 rounded-lg bg-white">
            {content ? (
              <MarkdownRenderer content={content} />
            ) : (
              <p className="text-neutral-400 italic">Nothing to preview</p>
            )}
          </div>
        ) : (
          <textarea
            id="content"
            {...register("content")}
            placeholder="Write your post content here. Markdown is supported!"
            disabled={isSubmitting}
            rows={12}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm
                       placeholder:text-neutral-400
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed
                       resize-y min-h-[200px]"
          />
        )}
        {errors.content && (
          <p className="text-sm text-error-500">{errors.content.message}</p>
        )}
        <p className="text-xs text-neutral-500">
          Supports Markdown: **bold**, *italic*, `code`, [links](url), etc.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Create Post
        </Button>
      </div>
    </form>
  );
}
