"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Plus, Edit2, Trash2, Megaphone, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { updateAnnouncement, deleteAnnouncement } from "@/lib/actions/announcement";
import { AnnouncementForm } from "./announcement-form";

interface Announcement {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface AnnouncementManagerProps {
  announcements: Announcement[];
  communityId: string;
}

const MAX_ACTIVE = 2;

export function AnnouncementManager({
  announcements,
  communityId,
}: AnnouncementManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const activeCount = announcements.filter((a) => a.isActive).length;

  return (
    <div className="space-y-4">
      {/* Header with count and create button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600">
          Create announcements that appear as banners for all community members.
        </p>
        <span className="text-sm font-medium text-neutral-700">
          {activeCount}/{MAX_ACTIVE} active
        </span>
      </div>

      {/* Create Button */}
      <button
        onClick={() => setShowForm(true)}
        disabled={activeCount >= MAX_ACTIVE}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-neutral-300 rounded-lg text-neutral-600 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-neutral-300 disabled:hover:text-neutral-600 disabled:hover:bg-transparent"
      >
        <Plus className="w-5 h-5" />
        <span className="font-medium">Create Announcement</span>
      </button>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="text-center py-8 text-neutral-500">
          <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {announcements.map((announcement) => (
            <AnnouncementItem
              key={announcement.id}
              announcement={announcement}
              onEdit={() => setEditingAnnouncement(announcement)}
              canActivate={activeCount < MAX_ACTIVE || announcement.isActive}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {(showForm || editingAnnouncement) && (
        <AnnouncementForm
          communityId={communityId}
          announcement={editingAnnouncement}
          onClose={() => {
            setShowForm(false);
            setEditingAnnouncement(null);
          }}
        />
      )}
    </div>
  );
}

function AnnouncementItem({
  announcement,
  onEdit,
  canActivate,
}: {
  announcement: Announcement;
  onEdit: () => void;
  canActivate: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleToggleActive = () => {
    startTransition(async () => {
      setError(null);
      const result = await updateAnnouncement({
        announcementId: announcement.id,
        isActive: !announcement.isActive,
      });
      if (!result.success) {
        setError(result.error);
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      setError(null);
      const result = await deleteAnnouncement({
        announcementId: announcement.id,
      });
      if (!result.success) {
        setError(result.error);
        setShowDeleteConfirm(false);
      }
    });
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        announcement.isActive
          ? "border-amber-300 bg-amber-50"
          : "border-neutral-200 bg-neutral-50"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Announcement Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-neutral-900 truncate">
              {announcement.title}
            </h4>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                announcement.isActive
                  ? "bg-amber-200 text-amber-800"
                  : "bg-neutral-200 text-neutral-600"
              }`}
            >
              {announcement.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <p className="text-sm text-neutral-600 line-clamp-2 mb-2">
            {announcement.content}
          </p>

          {/* Footer */}
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {announcement.createdBy.image && (
              <Image
                src={announcement.createdBy.image}
                alt=""
                width={16}
                height={16}
                className="rounded-full"
              />
            )}
            <span>
              Created by {announcement.createdBy.name || "Unknown"} on{" "}
              {new Date(announcement.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Toggle Active */}
          <button
            onClick={handleToggleActive}
            disabled={isPending || (!canActivate && !announcement.isActive)}
            title={announcement.isActive ? "Deactivate" : "Activate"}
            className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : announcement.isActive ? (
              <ToggleRight className="w-5 h-5 text-amber-600" />
            ) : (
              <ToggleLeft className="w-5 h-5" />
            )}
          </button>

          {/* Edit */}
          <button
            onClick={onEdit}
            disabled={isPending}
            title="Edit"
            className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg disabled:opacity-50"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isPending}
            title="Delete"
            className="p-2 text-neutral-500 hover:text-error-600 hover:bg-error-50 rounded-lg disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-2 text-sm text-error-600">{error}</p>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="mt-3 pt-3 border-t border-neutral-200">
          <p className="text-sm text-neutral-700 mb-2">
            Are you sure you want to delete this announcement?
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="px-3 py-1.5 text-sm font-medium bg-error-500 text-white rounded-lg hover:bg-error-600 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isPending}
              className="px-3 py-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
