"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Megaphone, ChevronDown, ChevronUp, X, Settings } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface AnnouncementBannerProps {
  announcements: Announcement[];
  communitySlug: string;
  canManage: boolean;
}

const STORAGE_KEY_PREFIX = "announcement_banner_";
const LAST_VIEWED_KEY_PREFIX = "announcement_last_viewed_";

export function AnnouncementBanner({
  announcements,
  communitySlug,
  canManage,
}: AnnouncementBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  const storageKey = `${STORAGE_KEY_PREFIX}${communitySlug}`;
  const lastViewedKey = `${LAST_VIEWED_KEY_PREFIX}${communitySlug}`;

  // Initialize state from localStorage - runs only once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(storageKey);
    const lastViewed = localStorage.getItem(lastViewedKey);

    let initialExpanded = false;

    // Check if we should auto-expand due to new announcements
    if (announcements.length > 0) {
      const newestTimestamp = Math.max(
        ...announcements.map((a) => new Date(a.createdAt).getTime())
      );
      const lastViewedTimestamp = lastViewed ? parseInt(lastViewed, 10) : 0;

      if (newestTimestamp > lastViewedTimestamp) {
        // New announcement detected - expand
        initialExpanded = true;
        localStorage.setItem(lastViewedKey, newestTimestamp.toString());
      } else if (stored !== null) {
        // Use stored preference
        initialExpanded = stored === "expanded";
      } else {
        // Default: collapsed on mobile, expanded on desktop
        initialExpanded = window.innerWidth >= 768;
      }
    }

    // Batch state updates
    setIsExpanded(initialExpanded);
    setIsInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - announcements are server-rendered props

  // Persist expand/collapse state
  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => {
      const newValue = !prev;
      localStorage.setItem(storageKey, newValue ? "expanded" : "collapsed");
      return newValue;
    });
  }, [storageKey]);

  // Dismiss an individual announcement (per session only)
  const dismissAnnouncement = useCallback((id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  }, []);

  // Don't render until initialized to prevent flash
  if (!isInitialized) {
    return null;
  }

  // Filter out dismissed announcements
  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedIds.has(a.id)
  );

  // Don't render if no announcements
  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden">
      {isExpanded ? (
        <ExpandedBanner
          announcements={visibleAnnouncements}
          communitySlug={communitySlug}
          canManage={canManage}
          onCollapse={toggleExpanded}
          onDismiss={dismissAnnouncement}
        />
      ) : (
        <CollapsedBanner
          count={visibleAnnouncements.length}
          onExpand={toggleExpanded}
        />
      )}
    </div>
  );
}

function ExpandedBanner({
  announcements,
  communitySlug,
  canManage,
  onCollapse,
  onDismiss,
}: {
  announcements: Announcement[];
  communitySlug: string;
  canManage: boolean;
  onCollapse: () => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200 dark:border-amber-800 bg-amber-100/50 dark:bg-amber-900/30">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-medium">
          <Megaphone className="w-5 h-5" />
          <span>
            Announcements ({announcements.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Link
              href={`/communities/${communitySlug}/settings#announcements`}
              className="text-sm text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 font-medium flex items-center gap-1"
            >
              <Settings className="w-4 h-4" />
              Manage
            </Link>
          )}
          <button
            onClick={onCollapse}
            className="p-1 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-200 dark:hover:bg-amber-800 rounded"
            aria-label="Collapse announcements"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Announcements List */}
      <div className="divide-y divide-amber-200 dark:divide-amber-800">
        {announcements.map((announcement) => (
          <AnnouncementItem
            key={announcement.id}
            announcement={announcement}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  );
}

function AnnouncementItem({
  announcement,
  onDismiss,
}: {
  announcement: Announcement;
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="px-4 py-3 relative group">
      {/* Dismiss Button */}
      <button
        onClick={() => onDismiss(announcement.id)}
        className="absolute top-3 right-3 p-1 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Dismiss announcement"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Title */}
      <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1 pr-8">
        {announcement.title}
      </h3>

      {/* Content (Markdown) */}
      <div className="prose prose-sm prose-amber max-w-none text-amber-800 dark:text-amber-200 mb-2">
        <ReactMarkdown
          components={{
            // Customize links to open in new tab
            a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline"
              >
                {children}
              </a>
            ),
            // Keep paragraphs simple
            p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
          }}
        >
          {announcement.content}
        </ReactMarkdown>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
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
          Posted by {announcement.createdBy.name || "Unknown"} on{" "}
          {new Date(announcement.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}

function CollapsedBanner({
  count,
  onExpand,
}: {
  count: number;
  onExpand: () => void;
}) {
  return (
    <button
      onClick={onExpand}
      className="w-full flex items-center justify-between px-4 py-2 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4" />
        <span className="text-sm font-medium">
          {count} announcement{count !== 1 ? "s" : ""}
        </span>
      </div>
      <ChevronDown className="w-4 h-4" />
    </button>
  );
}
