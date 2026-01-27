"use server";

import { prisma } from "@/lib/prisma";
import { getEventReminderEmailHtml, getEventReminderEmailText } from "@/lib/email/templates";
import { captureServerError, captureFireAndForgetError, captureExternalServiceError } from "@/lib/sentry";

interface ScheduleReminderInput {
  userId: string;
  sessionId: string;
  scheduledFor: Date;
}

interface ScheduleReminderResult {
  success: boolean;
  error?: string;
}

/**
 * Schedule an event reminder email via Resend's scheduled_at feature.
 * - Respects user's emailEventReminders preference
 * - Idempotent: won't schedule duplicate reminders
 * - Stores resendEmailId for later cancellation
 */
export async function scheduleEventReminder(input: ScheduleReminderInput): Promise<ScheduleReminderResult> {
  const { userId, sessionId, scheduledFor } = input;

  try {
    // Get user and session details
    const [user, session] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, emailEventReminders: true },
      }),
      prisma.eventSession.findUnique({
        where: { id: sessionId },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              description: true,
              location: true,
              coverImage: true,
              meetingUrl: true,
              timezone: true,
              community: { select: { slug: true, name: true } },
            },
          },
        },
      }),
    ]);

    // Validate data
    if (!user || !session) {
      return { success: false, error: "User or session not found" };
    }

    // Respect user preference - don't schedule if opted out
    if (!user.emailEventReminders || !user.email) {
      return { success: true }; // Not an error, just skipped
    }

    // Check idempotency - don't schedule if already scheduled
    const existing = await prisma.eventReminderSent.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    if (existing) {
      return { success: true }; // Already scheduled
    }

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const eventUrl = `${baseUrl}/communities/${session.event.community.slug}/events/${session.event.id}`;
    const unsubscribeUrl = `${baseUrl}/settings`;

    // Schedule email via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: user.email,
        subject: `Reminder: ${session.event.title}`,
        html: getEventReminderEmailHtml({
          eventTitle: session.event.title,
          eventDescription: session.event.description,
          startTime: session.startTime,
          location: session.location || session.event.location,
          meetingUrl: session.event.meetingUrl,
          coverImage: session.event.coverImage,
          eventUrl,
          communityName: session.event.community.name,
          unsubscribeUrl,
          timezone: session.event.timezone,
        }),
        text: getEventReminderEmailText({
          eventTitle: session.event.title,
          eventDescription: session.event.description,
          startTime: session.startTime,
          location: session.location || session.event.location,
          meetingUrl: session.event.meetingUrl,
          eventUrl,
          communityName: session.event.community.name,
          unsubscribeUrl,
          timezone: session.event.timezone,
        }),
        scheduled_at: scheduledFor.toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Resend API error (${response.status}):`, errorText);
      captureExternalServiceError("reminder.scheduleEmail",
        new Error(`Resend API ${response.status}`),
        { responseBody: errorText }
      );
      return { success: false, error: `Resend API error: ${response.status}` };
    }

    const data = await response.json();

    // Record that reminder was scheduled
    await prisma.eventReminderSent.create({
      data: {
        sessionId,
        userId,
        resendEmailId: data.id,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to schedule event reminder:", error);
    captureServerError("reminder.schedule", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Cancel a scheduled reminder email via Resend API.
 * - Fire-and-forget for the API call (if it fails, email was likely already sent)
 * - Always deletes the local record to allow re-scheduling
 */
export async function cancelScheduledReminder(sessionId: string, userId: string): Promise<void> {
  try {
    const reminder = await prisma.eventReminderSent.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });

    if (!reminder) return;

    if (reminder.resendEmailId) {
      // Cancel via Resend API (fire and forget - if it fails, email was already sent)
      await fetch(`https://api.resend.com/emails/${reminder.resendEmailId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      }).catch((err) => {
        console.warn("Failed to cancel Resend email (may already be sent):", err);
        captureFireAndForgetError("reminder.cancelEmail", err);
      });
    }

    // Delete the reminder record regardless of cancellation result
    await prisma.eventReminderSent.delete({
      where: { id: reminder.id },
    });
  } catch (error) {
    console.warn("Failed to cancel scheduled reminder:", error);
    captureServerError("reminder.cancel", error);
  }
}
