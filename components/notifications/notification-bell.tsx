"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "@/lib/actions/notification";
import { useAblyChannel, type AblyMessage } from "@/hooks/use-ably";
import { getUserNotificationChannel } from "@/lib/ably-client";
import { toast } from "sonner";
import type { NotificationType } from "@prisma/client";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: Date | string;
}

interface NotificationBellProps {
  userId: string;
  initialUnreadCount: number;
}

export function NotificationBell({ userId, initialUnreadCount }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const notificationRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Subscribe to real-time notifications
  useAblyChannel(
    getUserNotificationChannel(userId),
    "new-notification",
    useCallback((message: AblyMessage) => {
      const newNotification = message.data as Notification;
      setNotifications((prev) => [newNotification, ...prev.slice(0, 19)]);
      setUnreadCount((prev) => prev + 1);
      toast.info(newNotification.title, {
        description: newNotification.message || undefined,
      });
    }, [])
  );

  // Load notifications when dropdown opens
  const loadNotifications = async () => {
    if (notifications.length > 0) return; // Already loaded
    setIsLoading(true);
    const notifs = await getNotifications(20, true);
    setNotifications(notifs);
    setIsLoading(false);
  };

  const handleToggle = () => {
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // Navigate if there's a link
    if (notification.link) {
      setIsOpen(false);
      router.push(notification.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await markAllAsRead();
    if (result.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  };

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-notification-dropdown]")) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "Escape":
          setIsOpen(false);
          setFocusedIndex(-1);
          buttonRef.current?.focus();
          break;
        case "ArrowDown":
          event.preventDefault();
          setFocusedIndex((prev) =>
            prev < notifications.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Tab":
          // Allow tab to cycle within dropdown
          if (event.shiftKey && focusedIndex === 0) {
            event.preventDefault();
            buttonRef.current?.focus();
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, notifications.length, focusedIndex]);

  // Focus notification when focusedIndex changes
  useEffect(() => {
    if (focusedIndex >= 0 && notificationRefs.current[focusedIndex]) {
      notificationRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  return (
    <div className="relative" data-notification-dropdown>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="relative p-2 text-foreground-muted hover:text-foreground hover:bg-background-hover rounded-lg transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls="notification-dropdown"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-subtle0 text-[10px] font-medium text-white"
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id="notification-dropdown"
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-80 max-h-96 overflow-hidden bg-card rounded-lg border border-border shadow-lg z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 id="notification-dropdown-title" className="font-semibold text-foreground">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                aria-label="Mark all notifications as read"
              >
                <Check className="h-3 w-3" aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-foreground-muted">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-foreground-muted mx-auto mb-2" />
                <p className="text-sm text-foreground-muted">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification, index) => (
                <button
                  key={notification.id}
                  ref={(el) => {
                    notificationRefs.current[index] = el;
                  }}
                  onClick={() => handleNotificationClick(notification)}
                  role="menuitem"
                  tabIndex={focusedIndex === index ? 0 : -1}
                  className={`w-full text-left px-4 py-3 hover:bg-background-hover focus:bg-background-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors border-b border-border last:border-0 ${
                    !notification.isRead ? "bg-primary-subtle/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        notification.isRead ? "bg-transparent" : "bg-primary-subtle0"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-xs text-foreground-muted mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-foreground-muted mt-1">
                        {formatDistanceToNow(
                          typeof notification.createdAt === "string"
                            ? new Date(notification.createdAt)
                            : notification.createdAt,
                          { addSuffix: true }
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
