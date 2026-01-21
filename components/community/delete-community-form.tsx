"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCommunity } from "@/lib/actions/community";

interface DeleteCommunityFormProps {
  communityId: string;
  communityName: string;
}

export function DeleteCommunityForm({
  communityId,
  communityName,
}: DeleteCommunityFormProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeleting(true);
    setError(null);

    const result = await deleteCommunity({
      communityId,
      confirmName,
    });

    if (result.success) {
      router.push("/communities");
    } else {
      setError(result.error);
      setIsDeleting(false);
    }
  };

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="px-4 py-2 border border-error-300 text-error-600 font-medium rounded-lg
                   hover:bg-error-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error-500
                   transition-colors"
      >
        Delete Community
      </button>
    );
  }

  return (
    <form onSubmit={handleDelete} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="p-4 bg-error-50 border border-error-200 rounded-lg text-error-600 text-sm"
        >
          {error}
        </div>
      )}

      <div className="p-4 bg-error-50 rounded-lg">
        <p className="text-sm text-error-700 mb-4">
          <strong>Warning:</strong> This action cannot be undone. This will
          permanently delete the <strong>{communityName}</strong> community,
          including all events and memberships.
        </p>

        <label
          htmlFor="confirm-name"
          className="block text-sm font-medium text-error-700 mb-1"
        >
          Type <strong>{communityName}</strong> to confirm
        </label>
        <input
          id="confirm-name"
          type="text"
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          disabled={isDeleting}
          placeholder="Enter community name"
          className="w-full px-4 py-2.5 border border-error-300 rounded-lg text-neutral-900 placeholder-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-error-500 focus:border-transparent
                     disabled:bg-neutral-50 disabled:text-neutral-500"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            setIsExpanded(false);
            setConfirmName("");
            setError(null);
          }}
          disabled={isDeleting}
          className="px-4 py-2 border border-neutral-300 text-neutral-700 font-medium rounded-lg
                     hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={
            isDeleting ||
            confirmName.toLowerCase() !== communityName.toLowerCase()
          }
          className="px-4 py-2 bg-error-600 text-white font-medium rounded-lg
                     hover:bg-error-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error-500
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isDeleting ? "Deleting..." : "Delete Community"}
        </button>
      </div>
    </form>
  );
}
