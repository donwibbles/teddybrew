"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { sanitizeText } from "@/lib/utils/sanitize";
import { isMember } from "@/lib/db/members";
import {
  createEventSchema,
  updateEventSchema,
  deleteEventSchema,
  addCoOrganizerSchema,
  removeCoOrganizerSchema,
} from "@/lib/validations/event";

/**
 * Action result types
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Check if user is an organizer (creator or co-organizer) of an event
 */
async function isOrganizer(userId: string, eventId: string): Promise<boolean> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      organizerId: true,
      coOrganizers: { select: { id: true } },
    },
  });

  if (!event) return false;

  return (
    event.organizerId === userId ||
    event.coOrganizers.some((co) => co.id === userId)
  );
}

/**
 * Create a new event
 * - User must be a member of the community
 * - Date must be in the future
 */
export async function createEvent(
  input: unknown
): Promise<ActionResult<{ eventId: string; communitySlug: string }>> {
  try {
    const { userId } = await verifySession();

    // Validate input
    const parsed = createEventSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { communityId, title, description, startTime, endTime, location, capacity } =
      parsed.data;

    // Check if user is a member of the community
    const memberCheck = await isMember(userId, communityId);
    if (!memberCheck) {
      return {
        success: false,
        error: "You must be a member of this community to create events",
      };
    }

    // Get community slug for redirect
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { slug: true },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    // Sanitize description
    const sanitizedDescription = description
      ? sanitizeText(description)
      : undefined;

    // Create event
    const event = await prisma.event.create({
      data: {
        title,
        description: sanitizedDescription,
        startTime,
        endTime: endTime || null,
        location: location || null,
        capacity: capacity || null,
        communityId,
        organizerId: userId,
      },
    });

    revalidatePath(`/communities/${community.slug}`);
    revalidatePath(`/communities/${community.slug}/events`);
    revalidatePath("/events");

    return {
      success: true,
      data: { eventId: event.id, communitySlug: community.slug },
    };
  } catch (error) {
    console.error("Failed to create event:", error);
    return { success: false, error: "Failed to create event" };
  }
}

/**
 * Update an event
 * - Only organizers (creator + co-organizers) can update
 * - Date must be in the future
 */
export async function updateEvent(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Validate input
    const parsed = updateEventSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { eventId, title, description, startTime, endTime, location, capacity } =
      parsed.data;

    // Check if user is an organizer
    const canEdit = await isOrganizer(userId, eventId);
    if (!canEdit) {
      return {
        success: false,
        error: "Only event organizers can edit this event",
      };
    }

    // Get event with community for revalidation
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { community: { select: { slug: true } } },
    });

    if (!event) {
      return { success: false, error: "Event not found" };
    }

    // Sanitize description
    const sanitizedDescription =
      description !== undefined ? sanitizeText(description) : undefined;

    // Update event
    await prisma.event.update({
      where: { id: eventId },
      data: {
        ...(title && { title }),
        ...(sanitizedDescription !== undefined && {
          description: sanitizedDescription || null,
        }),
        ...(startTime && { startTime }),
        ...(endTime !== undefined && { endTime: endTime || null }),
        ...(location !== undefined && { location: location || null }),
        ...(capacity !== undefined && { capacity: capacity || null }),
      },
    });

    revalidatePath(`/communities/${event.community.slug}/events/${eventId}`);
    revalidatePath(`/communities/${event.community.slug}`);
    revalidatePath("/events");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update event:", error);
    return { success: false, error: "Failed to update event" };
  }
}

/**
 * Delete an event
 * - Only the event creator can delete (not co-organizers)
 * - Cascades to delete all RSVPs
 */
export async function deleteEvent(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Validate input
    const parsed = deleteEventSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { eventId } = parsed.data;

    // Get event and check ownership
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        organizerId: true,
        community: { select: { slug: true } },
      },
    });

    if (!event) {
      return { success: false, error: "Event not found" };
    }

    // Only the creator can delete (not co-organizers)
    if (event.organizerId !== userId) {
      return {
        success: false,
        error: "Only the event creator can delete this event",
      };
    }

    // Delete event (cascades to RSVPs via schema)
    await prisma.event.delete({
      where: { id: eventId },
    });

    revalidatePath(`/communities/${event.community.slug}`);
    revalidatePath(`/communities/${event.community.slug}/events`);
    revalidatePath("/events");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete event:", error);
    return { success: false, error: "Failed to delete event" };
  }
}

/**
 * Add a co-organizer to an event
 * - Only the event creator can add co-organizers
 * - User must be a member of the community
 */
export async function addCoOrganizer(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Validate input
    const parsed = addCoOrganizerSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { eventId, userId: coOrganizerId } = parsed.data;

    // Get event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        organizerId: true,
        communityId: true,
        coOrganizers: { select: { id: true } },
        community: { select: { slug: true } },
      },
    });

    if (!event) {
      return { success: false, error: "Event not found" };
    }

    // Only creator can add co-organizers
    if (event.organizerId !== userId) {
      return {
        success: false,
        error: "Only the event creator can add co-organizers",
      };
    }

    // Check if user is already a co-organizer or the organizer
    if (
      coOrganizerId === event.organizerId ||
      event.coOrganizers.some((co) => co.id === coOrganizerId)
    ) {
      return { success: false, error: "User is already an organizer" };
    }

    // Check if target user is a member of the community
    const targetIsMember = await isMember(coOrganizerId, event.communityId);
    if (!targetIsMember) {
      return {
        success: false,
        error: "User must be a community member to be a co-organizer",
      };
    }

    // Add co-organizer
    await prisma.event.update({
      where: { id: eventId },
      data: {
        coOrganizers: {
          connect: { id: coOrganizerId },
        },
      },
    });

    revalidatePath(`/communities/${event.community.slug}/events/${eventId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to add co-organizer:", error);
    return { success: false, error: "Failed to add co-organizer" };
  }
}

/**
 * Remove a co-organizer from an event
 * - Only the event creator can remove co-organizers
 */
export async function removeCoOrganizer(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Validate input
    const parsed = removeCoOrganizerSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { eventId, userId: coOrganizerId } = parsed.data;

    // Get event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        organizerId: true,
        community: { select: { slug: true } },
      },
    });

    if (!event) {
      return { success: false, error: "Event not found" };
    }

    // Only creator can remove co-organizers
    if (event.organizerId !== userId) {
      return {
        success: false,
        error: "Only the event creator can remove co-organizers",
      };
    }

    // Remove co-organizer
    await prisma.event.update({
      where: { id: eventId },
      data: {
        coOrganizers: {
          disconnect: { id: coOrganizerId },
        },
      },
    });

    revalidatePath(`/communities/${event.community.slug}/events/${eventId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to remove co-organizer:", error);
    return { success: false, error: "Failed to remove co-organizer" };
  }
}

/**
 * Search/filter events
 */
export async function searchEvents(
  query?: string,
  communityId?: string,
  showPast: boolean = false
) {
  try {
    const trimmedQuery = query?.trim().toLowerCase();
    const now = new Date();

    const events = await prisma.event.findMany({
      where: {
        AND: [
          // Community filter
          communityId ? { communityId } : {},
          // Past/future filter
          showPast ? {} : { startTime: { gte: now } },
          // Search query
          trimmedQuery
            ? {
                OR: [
                  { title: { contains: trimmedQuery, mode: "insensitive" } },
                  {
                    description: {
                      contains: trimmedQuery,
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : {},
        ],
      },
      include: {
        community: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
        organizer: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            rsvps: true,
          },
        },
      },
      orderBy: { startTime: showPast ? "desc" : "asc" },
    });

    return events;
  } catch (error) {
    console.error("Failed to search events:", error);
    return [];
  }
}

/**
 * Get event details with organizer check
 */
export async function getEventForEdit(eventId: string) {
  try {
    const { userId } = await verifySession();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        community: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        coOrganizers: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!event) {
      return { event: null, canEdit: false };
    }

    const canEdit =
      event.organizerId === userId ||
      event.coOrganizers.some((co) => co.id === userId);

    return { event, canEdit };
  } catch {
    return { event: null, canEdit: false };
  }
}
