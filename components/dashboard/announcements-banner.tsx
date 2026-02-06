"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Megaphone, ChevronDown, ChevronUp, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface DashboardAnnouncement {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
  community: {
    id: string;
    slug: string;
    name: string;
  };
}

interface DashboardAnnouncementBannerProps {
  announcements: DashboardAnnouncement[];
}

const STORAGE_KEY = "dashboard_announcements";

export function DashboardAnnouncementBanner({
  announcements,
}: DashboardAnnouncementBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setDismissedIds(new Set(JSON.parse(stored)));
      } catch {
        // ignore parse errors
      }
    }

    setIsExpanded(true);
    setIsInitialized(true);
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const dismissAnnouncement = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set([...prev, id]);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  if (!isInitialized) return null;

  const visible = announcements.filter((a) => !dismissedIds.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden">
      {isExpanded ? (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200 dark:border-amber-800 bg-amber-100/50 dark:bg-amber-900/30">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-medium">
              <Megaphone className="w-5 h-5" />
              <span>Announcements ({visible.length})</span>
            </div>
            <button
              onClick={toggleExpanded}
              className="p-1 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-200 dark:hover:bg-amber-800 rounded"
              aria-label="Collapse announcements"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>

          {/* Announcements List */}
          <div className="divide-y divide-amber-200 dark:divide-amber-800">
            {visible.map((announcement) => (
              <div key={announcement.id} className="px-4 py-3 relative group">
                <button
                  onClick={() => dismissAnnouncement(announcement.id)}
                  className="absolute top-3 right-3 p-1 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Dismiss announcement"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/communities/${announcement.community.slug}`}
                    className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-200/50 dark:bg-amber-800/50 px-2 py-0.5 rounded-full hover:bg-amber-200 dark:hover:bg-amber-700 transition-colors"
                  >
                    {announcement.community.name}
                  </Link>
                </div>

                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1 pr-8">
                  {announcement.title}
                </h3>

                <div className="prose prose-sm prose-amber max-w-none text-amber-800 dark:text-amber-200 mb-2">
                  <ReactMarkdown
                    components={{
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
                      p: ({ children }: { children?: React.ReactNode }) => (
                        <p className="mb-2 last:mb-0">{children}</p>
                      ),
                    }}
                  >
                    {announcement.content}
                  </ReactMarkdown>
                </div>

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
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={toggleExpanded}
          className="w-full flex items-center justify-between px-4 py-2 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            <span className="text-sm font-medium">
              {visible.length} announcement{visible.length !== 1 ? "s" : ""}
            </span>
          </div>
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
