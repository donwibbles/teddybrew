"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TipTapEditor } from "@/components/documents/tiptap/editor";
import { updatePost } from "@/lib/actions/post";
import { toast } from "sonner";
import { marked } from "marked";
import type { JSONContent } from "@tiptap/react";

const editPostFormSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(300, "Title must be at most 300 characters"),
});

type FormData = z.infer<typeof editPostFormSchema>;

interface EditPostFormProps {
  postId: string;
  communitySlug: string;
  initialTitle: string;
  initialContent: string;
  initialContentJson?: JSONContent | null;
}

export function EditPostForm({
  postId,
  communitySlug,
  initialTitle,
  initialContent,
  initialContentJson,
}: EditPostFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const contentJsonRef = useRef<JSONContent | null>(null);
  const contentHtmlRef = useRef<string>(initialContent);
  const [hasContentChanged, setHasContentChanged] = useState(false);

  // Determine initial TipTap content:
  // If we have contentJson (new-format post), use it directly.
  // If not (old markdown post), convert markdown → HTML and let TipTap parse it.
  const editorContent = useMemo<JSONContent | string>(() => {
    if (initialContentJson) {
      return initialContentJson;
    }
    // Old markdown post: convert to HTML for TipTap to parse
    return marked.parse(initialContent, { async: false }) as string;
  }, [initialContentJson, initialContent]);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(editPostFormSchema),
    defaultValues: {
      title: initialTitle,
    },
  });

  const handleContentChange = (json: JSONContent, html: string) => {
    contentJsonRef.current = json;
    contentHtmlRef.current = html;
    setHasContentChanged(true);
    if (contentError) setContentError(null);
  };

  const getTextLength = (html: string): number => {
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

    const result = await updatePost({
      postId,
      title: data.title,
      content: html,
      contentJson: contentJsonRef.current,
    });

    if (result.success) {
      toast.success("Post updated");
      router.push(`/communities/${communitySlug}/forum/${postId}`);
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
          content={editorContent as JSONContent}
          onChange={handleContentChange}
          placeholder="Write your post content here..."
          communityId=""
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
        <Button type="submit" disabled={isSubmitting || (!isDirty && !hasContentChanged)}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
