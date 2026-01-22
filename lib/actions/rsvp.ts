"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { isMember } from "@/lib/db/members";
import { RSVPStatus } from "@prisma/client";
import { rsvpEventSchema, cancelRsvpSchema } from "@/lib/validations/event";

/**
 * Action result types
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * RSVP to an event (mark as GOING)
 * - User must be a member of the community
 * - Event must not be at capacity
 * - Event must be in the future
 * - User cannot RSVP twice
 */
export async function rsvpToEvent(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Validate input
    const parsed = rsvpEventSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { eventId } = parsed.data;

    // Get event with capacity info and community
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        communityId: true,
        capacity: true,
        startTime: true,
        community: { select: { slug: true } },
        _count: {
          select: {
            rsvps: {
              where: { status: RSVPStatus.GOING },
            },
          },
        },
      },
    });

    if (!event) {
      return { success: false, error: "Event not found" };
    }

    // Check if event is in the future
    if (event.startTime <= new Date()) {
      return { success: false, error: "Cannot RSVP to past events" };
    }

    // Check if user is a member of the community
    const memberCheck = await isMember(userId, event.communityId);
    if (!memberCheck) {
      return {
        success: false,
        error: "You must be a member of this community to RSVP",
      };
    }

    // Check if user already has an RSVP
    const existingRSVP = await prisma.rSVP.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    if (existingRSVP) {
      if (existingRSVP.status === RSVPStatus.GOING) {
        return { success: false, error: "You have already RSVP'd to this event" };
      }
      // Update existing RSVP from NOT_GOING to GOING
      // But first check capacity
      if (event.capacity && event._count.rsvps >= event.capacity) {
        return { success: false, error: "This event is full" };
      }

      await prisma.rSVP.update({
        where: { id: existingRSVP.id },
        data: { status: RSVPStatus.GOING },
      });
    } else {
      // Check capacity for new RSVP
      if (event.capacity && event._count.rsvps >= event.capacity) {
        return { success: false, error: "This event is full" };
      }

      // Create new RSVP
      await prisma.rSVP.create({
        data: {
          userId,
          eventId,
          status: RSVPStatus.GOING,
        },
      });
    }

    revalidatePath(`/communities/${event.community.slug}/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/my-events");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to RSVP to event:", error);
    return { success: false, error: "Failed to RSVP to event" };
  }
}

/**
 * Cancel RSVP to an event
 * - User must have an existing RSVP
 */
export async function cancelRsvp(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Validate input
    const parsed = cancelRsvpSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { eventId } = parsed.data;

    // Get event for revalidation
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        community: { select: { slug: true } },
      },
    });

    if (!event) {
      return { success: false, error: "Event not found" };
    }

    // Check if user has an RSVP
    const existingRSVP = await prisma.rSVP.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    if (!existingRSVP) {
      return { success: false, error: "You have not RSVP'd to this event" };
    }

    // Delete the RSVP entirely (cleaner than setting to NOT_GOING)
    await prisma.rSVP.delete({
      where: { id: existingRSVP.id },
    });

    revalidatePath(`/communities/${event.community.slug}/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/my-events");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to cancel RSVP:", error);
    return { success: false, error: "Failed to cancel RSVP" };
  }
}

/**
 * Get RSVP status for current user on an event
 */
export async function getRsvpStatus(eventId: string): Promise<{
  hasRsvp: boolean;
  status: RSVPStatus | null;
}> {
  try {
    const { userId } = await verifySession();

    const rsvp = await prisma.rSVP.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
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
