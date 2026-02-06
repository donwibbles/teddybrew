"use client";

import { Plus, Trash2 } from "lucide-react";

interface Session {
  id?: string;
  title?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  capacity?: number;
}

interface AddSessionFormProps {
  sessions: Session[];
  onChange: (sessions: Session[]) => void;
  minDateTime: string;
  disabled?: boolean;
}

export function AddSessionForm({
  sessions,
  onChange,
  minDateTime,
  disabled,
}: AddSessionFormProps) {
  const addSession = () => {
    onChange([
      ...sessions,
      {
        startTime: "",
        endTime: "",
        title: "",
        location: "",
      },
    ]);
  };

  const removeSession = (index: number) => {
    if (sessions.length <= 1) return;
    onChange(sessions.filter((_, i) => i !== index));
  };

  const updateSession = (index: number, updates: Partial<Session>) => {
    onChange(
      sessions.map((session, i) =>
        i === index ? { ...session, ...updates } : session
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground">
          Sessions <span className="text-error-500">*</span>
        </label>
        {sessions.length > 1 && (
          <span className="text-xs text-foreground-muted">
            {sessions.length} sessions
          </span>
        )}
      </div>

      <div className="space-y-4">
        {sessions.map((session, index) => (
          <div
            key={index}
            className="p-4 border border-border rounded-lg bg-background-muted space-y-4 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {sessions.length > 1 ? `Session ${index + 1}` : "Session Details"}
              </span>
              {sessions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSession(index)}
                  disabled={disabled}
                  className="p-1 text-foreground-muted hover:text-error-500 disabled:opacity-50"
                  title="Remove session"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Session Title (optional) */}
            {sessions.length > 1 && (
              <div>
                <label className="block text-xs text-foreground-muted mb-1">
                  Session Title (optional)
                </label>
                <input
                  type="text"
                  value={session.title || ""}
                  onChange={(e) =>
                    updateSession(index, { title: e.target.value })
                  }
                  placeholder="e.g., Day 1, Morning Session"
                  disabled={disabled}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-primary-500
                           disabled:bg-background-muted disabled:text-foreground-muted"
                />
              </div>
            )}

            {/* Date/Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label className="block text-xs text-foreground-muted mb-1">
                  Start <span className="text-error-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={session.startTime}
                  onChange={(e) =>
                    updateSession(index, { startTime: e.target.value })
                  }
                  min={minDateTime}
                  disabled={disabled}
                  required
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-primary-500
                           disabled:bg-background-muted disabled:text-foreground-muted"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-xs text-foreground-muted mb-1">
                  End (optional)
                </label>
                <input
                  type="datetime-local"
                  value={session.endTime || ""}
                  onChange={(e) =>
                    updateSession(index, { endTime: e.target.value })
                  }
                  min={session.startTime || minDateTime}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-primary-500
                           disabled:bg-background-muted disabled:text-foreground-muted"
                />
              </div>
            </div>

            {/* Session-specific location (optional override) */}
            {sessions.length > 1 && (
              <div>
                <label className="block text-xs text-foreground-muted mb-1">
                  Location Override (optional)
                </label>
                <input
                  type="text"
                  value={session.location || ""}
                  onChange={(e) =>
                    updateSession(index, { location: e.target.value })
                  }
                  placeholder="Leave empty to use event location"
                  disabled={disabled}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-primary-500
                           disabled:bg-background-muted disabled:text-foreground-muted"
                />
              </div>
            )}

            {/* Session-specific capacity (optional override) */}
            {sessions.length > 1 && (
              <div>
                <label className="block text-xs text-foreground-muted mb-1">
                  Capacity Override (optional)
                </label>
                <input
                  type="number"
                  value={session.capacity || ""}
                  onChange={(e) =>
                    updateSession(index, {
                      capacity: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Leave empty to use event capacity"
                  min={1}
                  max={10000}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-primary-500
                           disabled:bg-background-muted disabled:text-foreground-muted"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add session button */}
      <button
        type="button"
        onClick={addSession}
        disabled={disabled || sessions.length >= 50}
        className="w-full py-2 border border-dashed border-border rounded-lg
                   text-sm text-foreground-muted hover:bg-background-hover hover:border-border
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                   flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Another Session
      </button>

      <p className="text-xs text-foreground-muted">
        Add multiple sessions for multi-day events or events with different time
        slots. Attendees can RSVP to individual sessions.
      </p>
    </div>
  );
}
