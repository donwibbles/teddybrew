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
import { IssueTagSelect } from "@/components/tags/issue-tag-select";
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

interface IssueTag {
  id: string;
  slug: string;
  name: string;
}

interface CreatePostFormProps {
  communityId: string;
  communitySlug: string;
  availableTags: IssueTag[];
}

const emptyContent: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export function CreatePostForm({
  communityId,
  communitySlug,
  availableTags,
}: CreatePostFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const contentJsonRef = useRef<JSONContent>(emptyContent);
  const contentHtmlRef = useRef<string>("");

  // Tags state (required)
  const [issueTagIds, setIssueTagIds] = useState<string[]>([]);

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

    // Validate at least one tag is selected
    if (issueTagIds.length === 0) {
      setTagsError("Please select at least one tag");
      return;
    }
    setTagsError(null);

    setIsSubmitting(true);

    const result = await createPost({
      communityId,
      title: data.title,
      content: html,
      contentJson: contentJsonRef.current ? JSON.parse(JSON.stringify(contentJsonRef.current)) : undefined,
      issueTagIds,
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
    // eslint-disable-next-line react-hooks/refs -- refs accessed in onSubmit callback, not during render
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

      {/* Tags (required) - moved above content */}
      <div className="space-y-2">
        <Label>Tags <span className="text-error-500">*</span></Label>
        <p className="text-sm text-foreground-muted">
          Select at least one tag for your post
        </p>
        <IssueTagSelect
          availableTags={availableTags}
          selectedTagIds={issueTagIds}
          onChange={(ids) => {
            setIssueTagIds(ids);
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
