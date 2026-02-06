"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addCoOrganizer, removeCoOrganizer } from "@/lib/actions/event";

interface CoOrganizer {
  id: string;
  name: string | null;
  image: string | null;
}

interface Member {
  id: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface CoOrganizerManagerProps {
  eventId: string;
  coOrganizers: CoOrganizer[];
  members: Member[];
  organizerId: string;
}

export function CoOrganizerManager({
  eventId,
  coOrganizers,
  members,
  organizerId,
}: CoOrganizerManagerProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");

  // Filter out existing co-organizers and the organizer from the member list
  const coOrganizerIds = new Set(coOrganizers.map((co) => co.id));
  const availableMembers = members.filter(
    (m) => m.user.id !== organizerId && !coOrganizerIds.has(m.user.id)
  );

  const handleAdd = async () => {
    if (!selectedUserId) return;

    setIsAdding(true);
    setError(null);

    const result = await addCoOrganizer({ eventId, userId: selectedUserId });

    if (result.success) {
      setSelectedUserId("");
      router.refresh();
    } else {
      setError(result.error);
    }

    setIsAdding(false);
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} as co-organizer?`)) return;

    setRemovingId(userId);
    setError(null);

    const result = await removeCoOrganizer({ eventId, userId });

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error);
    }

    setRemovingId(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-foreground">Co-Organizers</h3>

      {error && (
        <div className="p-3 bg-error-50 border border-error-200 rounded-lg text-error-600 text-sm">
          {error}
        </div>
      )}

      {/* Current co-organizers list */}
      {coOrganizers.length > 0 ? (
        <ul className="divide-y divide-border border border-border rounded-lg">
          {coOrganizers.map((co) => (
            <li
              key={co.id}
              className="flex items-center justify-between gap-4 p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                {co.image ? (
                  <img
                    src={co.image}
                    alt={co.name || "Unknown"}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-subtle-hover flex items-center justify-center">
                    <span className="text-primary-700 font-medium text-xs">
                      {(co.name || "Unknown").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {co.name || "Unknown"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(co.id, co.name || "Unknown")}
                disabled={removingId === co.id}
                className="text-sm text-error-600 hover:text-error-700 disabled:opacity-50"
              >
                {removingId === co.id ? "Removing..." : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-foreground-muted py-4 text-center border border-border rounded-lg">
          No co-organizers yet
        </p>
      )}

      {/* Add co-organizer */}
      {availableMembers.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            disabled={isAdding}
            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm text-foreground bg-card
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       disabled:bg-background-muted disabled:text-foreground-muted"
          >
            <option value="">Select a member...</option>
            {availableMembers.map((member) => (
              <option key={member.user.id} value={member.user.id}>
                {member.user.name || "Unknown"}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedUserId || isAdding}
            className="px-4 py-2 bg-primary-subtle0 text-white text-sm font-medium rounded-lg
                       hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAdding ? "Adding..." : "Add"}
          </button>
        </div>
      )}

      {availableMembers.length === 0 && coOrganizers.length > 0 && (
        <p className="text-sm text-foreground-muted">
          All community members are already organizers
        </p>
      )}
    </div>
  );
}
