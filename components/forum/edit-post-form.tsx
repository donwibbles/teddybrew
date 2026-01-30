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
import { IssueTagSelect } from "@/components/tags/issue-tag-select";
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

interface IssueTag {
  id: string;
  slug: string;
  name: string;
}

interface EditPostFormProps {
  postId: string;
  postSlug: string;
  communitySlug: string;
  initialTitle: string;
  initialContent: string;
  initialContentJson?: JSONContent | null;
  initialTagIds: string[];
  availableTags: IssueTag[];
}

export function EditPostForm({
  postId,
  postSlug,
  communitySlug,
  initialTitle,
  initialContent,
  initialContentJson,
  initialTagIds,
  availableTags,
}: EditPostFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const contentJsonRef = useRef<JSONContent | null>(null);
  const contentHtmlRef = useRef<string>(initialContent);
  const [hasContentChanged, setHasContentChanged] = useState(false);
  const [issueTagIds, setIssueTagIds] = useState<string[]>(initialTagIds);
  const [hasTagsChanged, setHasTagsChanged] = useState(false);

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

    // Validate at least one tag is selected
    if (issueTagIds.length === 0) {
      setTagsError("Please select at least one tag");
      return;
    }
    setTagsError(null);

    setIsSubmitting(true);

    const result = await updatePost({
      postId,
      title: data.title,
      content: html,
      contentJson: contentJsonRef.current,
      issueTagIds,
    });

    if (result.success) {
      toast.success("Post updated");
      const newSlug = result.data?.postSlug ?? postSlug;
      router.push(`/communities/${communitySlug}/forum/${newSlug}`);
    } else {
      toast.error(result.error);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title <span className="text-error-500">*</span></Label>
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

      {/* Tags (required) */}
      <div className="space-y-2">
        <Label>Tags <span className="text-error-500">*</span></Label>
        <p className="text-sm text-neutral-500">
          Select at least one tag for your post
        </p>
        <IssueTagSelect
          availableTags={availableTags}
          selectedTagIds={issueTagIds}
          onChange={(ids) => {
            setIssueTagIds(ids);
            setHasTagsChanged(true);
            if (ids.length > 0) setTagsError(null);
          }}
          disabled={isSubmitting}
          placeholder="Select tags..."
        />
        {tagsError && (
          <p className="text-sm text-error-500">{tagsError}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Content <span className="text-error-500">*</span></Label>
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
        <Button type="submit" disabled={isSubmitting || (!isDirty && !hasContentChanged && !hasTagsChanged)}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
