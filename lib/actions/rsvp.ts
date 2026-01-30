"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { isMember } from "@/lib/db/members";
import { RSVPStatus } from "@prisma/client";
import {
  rsvpSessionSchema,
  cancelRsvpSchema,
  rsvpAllSessionsSchema,
} from "@/lib/validations/event";
import { scheduleEventReminder, cancelScheduledReminder } from "./reminder";
import { getRsvpConfirmationEmailHtml, getRsvpConfirmationEmailText } from "@/lib/email/templates";
import { captureServerError, captureFireAndForgetError } from "@/lib/sentry";
import { checkRsvpRateLimit } from "@/lib/rate-limit";

/**
 * Action result types
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * RSVP to a session (mark as GOING)
 * - User must be a member of the community
 * - Session must not be at capacity
 * - Session must be in the future
 * - User cannot RSVP twice to same session
 */
export async function rsvpToSession(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Rate limiting
    const rateLimit = await checkRsvpRateLimit(userId);
    if (!rateLimit.success) {
      return { success: false, error: "You're RSVPing too quickly. Please wait before trying again." };
    }

    // Validate input
    const parsed = rsvpSessionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { sessionId } = parsed.data;

    // Get session with event and community info
    const session = await prisma.eventSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        startTime: true,
        capacity: true,
        location: true,
        event: {
          select: {
            id: true,
            title: true,
            communityId: true,
            capacity: true,
            location: true,
            coverImage: true,
            meetingUrl: true,
            timezone: true,
            community: { select: { slug: true, name: true, type: true } },
          },
        },
      },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    // Check if session is in the future
    if (session.startTime <= new Date()) {
      return { success: false, error: "Cannot RSVP to past sessions" };
    }

    // Check if user is a member of the community
    const memberCheck = await isMember(userId, session.event.communityId);
    let autoJoined = false;

    if (!memberCheck) {
      // For private communities, membership is required
      if (session.event.community.type === "PRIVATE") {
        return {
          success: false,
          error: "You must be a member of this community to RSVP",
        };
      }

      // Auto-join public community on RSVP
      await prisma.member.create({
        data: {
          userId,
          communityId: session.event.communityId,
          role: "MEMBER",
        },
      });
      autoJoined = true;
    }

    // Determine effective capacity (session overrides event)
    const effectiveCapacity = session.capacity ?? session.event.capacity;

    // Use a transaction to prevent race conditions on capacity
    const result = await prisma.$transaction(async (tx) => {
      // Check if user already has an RSVP to this session
      const existingRSVP = await tx.rSVP.findUnique({
        where: {
          userId_sessionId: {
            userId,
            sessionId,
          },
        },
      });

      if (existingRSVP && existingRSVP.status === RSVPStatus.GOING) {
        return {
          success: false as const,
          error: "You have already RSVP'd to this session",
        };
      }

      // Check capacity inside transaction to prevent race condition
      if (effectiveCapacity) {
        const currentCount = await tx.rSVP.count({
          where: { sessionId, status: RSVPStatus.GOING },
        });
        if (currentCount >= effectiveCapacity) {
          return { success: false as const, error: "This session is full" };
        }
      }

      if (existingRSVP) {
        // Update existing RSVP from NOT_GOING to GOING
        await tx.rSVP.update({
          where: { id: existingRSVP.id },
          data: { status: RSVPStatus.GOING },
        });
      } else {
        // Create new RSVP
        await tx.rSVP.create({
          data: {
            userId,
            sessionId,
            status: RSVPStatus.GOING,
          },
        });
      }

      return { success: true as const };
    });

    if (!result.success) {
      return result;
    }

    // Send RSVP confirmation and schedule reminder (fire and forget)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailEventReminders: true },
    });

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const eventUrl = `${baseUrl}/communities/${session.event.community.slug}/events/${session.event.id}`;

    // Only send emails if user has email reminders enabled
    if (user?.email && user.emailEventReminders) {
      // Send RSVP confirmation email (immediate)
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL,
          to: user.email,
          subject: `You're signed up: ${session.event.title}`,
          html: getRsvpConfirmationEmailHtml({
            eventTitle: session.event.title,
            sessionDate: session.startTime,
            location: session.location || session.event.location,
            meetingUrl: session.event.meetingUrl,
            coverImage: session.event.coverImage,
            eventUrl,
            communityName: session.event.community.name,
            timezone: session.event.timezone,
          }),
          text: getRsvpConfirmationEmailText({
            eventTitle: session.event.title,
            sessionDate: session.startTime,
            location: session.location || session.event.location,
            meetingUrl: session.event.meetingUrl,
            eventUrl,
            communityName: session.event.community.name,
            timezone: session.event.timezone,
          }),
        }),
      }).catch((err) => {
        console.warn("Failed to send RSVP confirmation:", err);
        captureFireAndForgetError("rsvp.sendConfirmation", err);
      });

      // Schedule reminder email 24 hours before event
      const reminderTime = new Date(session.startTime.getTime() - 24 * 60 * 60 * 1000);

      // Only schedule if reminder time is in the future (event is > 24h away)
      if (reminderTime > new Date()) {
        scheduleEventReminder({
          userId,
          sessionId,
          scheduledFor: reminderTime,
        }).catch((err) => {
          console.warn("Failed to schedule reminder:", err);
          captureFireAndForgetError("rsvp.scheduleReminder", err);
        });
      }
    }

    revalidatePath(
      `/communities/${session.event.community.slug}/events/${session.event.id}`
    );
    revalidatePath("/events");
    revalidatePath("/my-events");
    revalidatePath("/dashboard");

    // If auto-joined, also revalidate the community page
    if (autoJoined) {
      revalidatePath(`/communities/${session.event.community.slug}`);
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to RSVP to session:", error);
    captureServerError("rsvp.create", error);
    return { success: false, error: "Failed to RSVP to session" };
  }
}

/**
 * Cancel RSVP to a session
 * - User must have an existing RSVP
 */
export async function cancelRsvp(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Rate limiting
    const rateLimit = await checkRsvpRateLimit(userId);
    if (!rateLimit.success) {
      return { success: false, error: "You're making changes too quickly. Please wait before trying again." };
    }

    // Validate input
    const parsed = cancelRsvpSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { sessionId } = parsed.data;

    // Get session with event for revalidation
    const session = await prisma.eventSession.findUnique({
      where: { id: sessionId },
      select: {
        event: {
          select: {
            id: true,
            community: { select: { slug: true } },
          },
        },
      },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    // Check if user has an RSVP
    const existingRSVP = await prisma.rSVP.findUnique({
      where: {
        userId_sessionId: {
          userId,
          sessionId,
        },
      },
    });

    if (!existingRSVP) {
      return { success: false, error: "You have not RSVP'd to this session" };
    }

    // Delete the RSVP entirely
    await prisma.rSVP.delete({
      where: { id: existingRSVP.id },
    });

    // Cancel any scheduled reminder (fire and forget)
    cancelScheduledReminder(sessionId, userId);

    revalidatePath(
      `/communities/${session.event.community.slug}/events/${session.event.id}`
    );
    revalidatePath("/events");
    revalidatePath("/my-events");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to cancel RSVP:", error);
    captureServerError("rsvp.cancel", error);
    return { success: false, error: "Failed to cancel RSVP" };
  }
}

/**
 * RSVP to all sessions of an event at once
 */
export async function rsvpToAllSessions(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Rate limiting
    const rateLimit = await checkRsvpRateLimit(userId);
    if (!rateLimit.success) {
      return { success: false, error: "You're RSVPing too quickly. Please wait before trying again." };
    }

    const parsed = rsvpAllSessionsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { eventId } = parsed.data;

    // Get event with sessions
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        communityId: true,
        capacity: true,
        community: { select: { slug: true, type: true } },
        sessions: {
          where: { startTime: { gt: new Date() } },
          select: { id: true, capacity: true },
        },
      },
    });

    if (!event) {
      return { success: false, error: "Event not found" };
    }

    if (event.sessions.length === 0) {
      return { success: false, error: "No upcoming sessions available" };
    }

    // Check membership
    const memberCheck = await isMember(userId, event.communityId);
    let autoJoined = false;

    if (!memberCheck) {
      // For private communities, membership is required
      if (event.community.type === "PRIVATE") {
        return {
          success: false,
          error: "You must be a member of this community to RSVP",
        };
      }

      // Auto-join public community on RSVP
      await prisma.member.create({
        data: {
          userId,
          communityId: event.communityId,
          role: "MEMBER",
        },
      });
      autoJoined = true;
    }

    // Create RSVPs for all sessions
    await prisma.$transaction(async (tx) => {
      for (const session of event.sessions) {
        // Check if already RSVP'd
        const existing = await tx.rSVP.findUnique({
          where: { userId_sessionId: { userId, sessionId: session.id } },
        });

        if (!existing) {
          // Check capacity
          const effectiveCapacity = session.capacity ?? event.capacity;
          if (effectiveCapacity) {
            const count = await tx.rSVP.count({
              where: { sessionId: session.id, status: RSVPStatus.GOING },
            });
            if (count >= effectiveCapacity) continue; // Skip full sessions
          }

          await tx.rSVP.create({
            data: { userId, sessionId: session.id, status: RSVPStatus.GOING },
          });
        } else if (existing.status !== RSVPStatus.GOING) {
          await tx.rSVP.update({
            where: { id: existing.id },
            data: { status: RSVPStatus.GOING },
          });
        }
      }
    });

    revalidatePath(`/communities/${event.community.slug}/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/my-events");
    revalidatePath("/dashboard");

    // If auto-joined, also revalidate the community page
    if (autoJoined) {
      revalidatePath(`/communities/${event.community.slug}`);
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to RSVP to all sessions:", error);
    captureServerError("rsvp.createAll", error);
    return { success: false, error: "Failed to RSVP to all sessions" };
  }
}

/**
 * Get RSVP status for current user on a session
 */
export async function getSessionRsvpStatus(sessionId: string): Promise<{
  hasRsvp: boolean;
  status: RSVPStatus | null;
}> {
  try {
    const { userId } = await verifySession();

    const rsvp = await prisma.rSVP.findUnique({
      where: {
        userId_sessionId: {
          userId,
          sessionId,
        },
      },
    });

    return {
      hasRsvp: !!rsvp,
      status: rsvp?.status || null,
    };
  } catch {
    return { hasRsvp: false, status: null };
  }
}

/**
 * Get RSVP status for current user on all sessions of an event
 */
export async function getEventRsvpStatus(eventId: string): Promise<{
  isAttending: boolean;
  sessionsAttending: string[];
  totalSessions: number;
}> {
  try {
    const { userId } = await verifySession();

    const sessions = await prisma.eventSession.findMany({
      where: { eventId },
      select: { id: true },
    });

    const rsvps = await prisma.rSVP.findMany({
      where: {
        userId,
        sessionId: { in: sessions.map((s) => s.id) },
        status: RSVPStatus.GOING,
      },
      select: { sessionId: true },
    });

    return {
      isAttending: rsvps.length > 0,
      sessionsAttending: rsvps.map((r) => r.sessionId),
      totalSessions: sessions.length,
    };
  } catch {
    return { isAttending: false, sessionsAttending: [], totalSessions: 0 };
  }
}
