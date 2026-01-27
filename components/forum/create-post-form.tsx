"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TipTapEditor } from "@/components/documents/tiptap/editor";
import { createPost } from "@/lib/actions/post";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";

const createPostFormSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(300, "Title must be at most 300 characters"),
});

type FormData = z.infer<typeof createPostFormSchema>;

interface CreatePostFormProps {
  communityId: string;
  communitySlug: string;
}

const emptyContent: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export function CreatePostForm({
  communityId,
  communitySlug,
}: CreatePostFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const contentJsonRef = useRef<JSONContent>(emptyContent);
  const contentHtmlRef = useRef<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(createPostFormSchema),
    defaultValues: {
      title: "",
    },
  });

  const handleContentChange = (json: JSONContent, html: string) => {
    contentJsonRef.current = json;
    contentHtmlRef.current = html;
    if (contentError) setContentError(null);
  };

  const getTextLength = (html: string): number => {
    // Strip HTML tags to get plain text length
    return html.replace(/<[^>]*>/g, "").trim().length;
  };

  const onSubmit = async (data: FormData) => {
    const html = contentHtmlRef.current;
    const textLength = getTextLength(html);

    if (textLength < 10) {
      setContentError("Content must be at least 10 characters");
      return;
    }

    setIsSubmitting(true);

    const result = await createPost({
      communityId,
      title: data.title,
      content: html,
      contentJson: contentJsonRef.current,
    });

    if (result.success) {
      toast.success("Post created");
      router.push(`/communities/${communitySlug}/forum/${result.data.postSlug}`);
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
        <Label>Content</Label>
        <TipTapEditor
          content={emptyContent}
          onChange={handleContentChange}
          placeholder="Write your post content here..."
          communityId={communityId}
          disabled={isSubmitting}
        />
        {contentError && (
          <p className="text-sm text-error-500">{contentError}</p>
        )}
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
