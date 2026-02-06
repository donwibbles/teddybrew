"use client";

import { useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { createAnnouncement, updateAnnouncement } from "@/lib/actions/announcement";

interface AnnouncementFormProps {
  communityId: string;
  announcement?: {
    id: string;
    title: string;
    content: string;
    isActive: boolean;
  } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AnnouncementForm({
  communityId,
  announcement,
  onClose,
  onSuccess,
}: AnnouncementFormProps) {
  const isEditing = !!announcement;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(announcement?.title ?? "");
  const [content, setContent] = useState(announcement?.content ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      setError(null);

      let result;
      if (isEditing) {
        result = await updateAnnouncement({
          announcementId: announcement.id,
          title,
          content,
        });
      } else {
        result = await createAnnouncement({
          communityId,
          title,
          content,
        });
      }

      if (result.success) {
        onSuccess?.();
        onClose();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            {isEditing ? "Edit Announcement" : "Create Announcement"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-foreground-muted hover:text-foreground hover:bg-background-hover rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
              maxLength={200}
              required
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-foreground-muted">
              {title.length}/200 characters
            </p>
          </div>

          {/* Content */}
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your announcement here... Markdown is supported."
              maxLength={5000}
              required
              rows={6}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
            />
            <p className="mt-1 text-xs text-foreground-muted">
              {content.length}/5000 characters. Supports **bold**, *italic*, and [links](url).
            </p>
          </div>

          {/* Info for new announcements */}
          {!isEditing && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
              All community members will be notified when this announcement is posted.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-error-50 border border-error-200 rounded-lg text-sm text-error-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-foreground hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim() || !content.trim()}
              className="px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Post Announcement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
