"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { sanitizeText } from "@/lib/utils/sanitize";
import { isMember } from "@/lib/db/members";
import { generateUniqueChannelName } from "@/lib/db/channels";
import {
  createEventSchema,
  updateEventSchema,
  deleteEventSchema,
  addCoOrganizerSchema,
  removeCoOrganizerSchema,
} from "@/lib/validations/event";
import { checkEventRateLimit } from "@/lib/rate-limit";
import { captureServerError } from "@/lib/sentry";

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
 * Create a new event with sessions
 * - User must be a member of the community
 * - All sessions must be in the future
 */
export async function createEvent(
  input: unknown
): Promise<ActionResult<{ eventId: string; communitySlug: string }>> {
  try {
    const { userId } = await verifySession();

    // Check rate limit
    const rateLimit = await checkEventRateLimit(userId);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "You're creating events too quickly. Please wait before creating another.",
      };
    }

    // Validate input
    const parsed = createEventSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const {
      communityId,
      title,
      description,
      location,
      capacity,
      coverImage,
      sessions,
      isVirtual,
      meetingUrl,
      timezone,
    } = parsed.data;

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

    // Generate unique channel name outside transaction if needed
    const channelName = isVirtual
      ? await generateUniqueChannelName(communityId, title)
      : null;

    // Create event with sessions (and chat channel if virtual) in a transaction
    const event = await prisma.$transaction(async (tx) => {
      // Create chat channel if virtual event
      let chatChannelId: string | undefined;
      if (isVirtual && channelName) {
        const channel = await tx.chatChannel.create({
          data: {
            name: channelName,
            description: `Chat for ${title}`,
            communityId,
            isDefault: false,
          },
        });
        chatChannelId = channel.id;
      }

      // Create the event
      const newEvent = await tx.event.create({
        data: {
          title,
          description: sanitizedDescription,
          location: location || null,
          capacity: capacity || null,
          coverImage: coverImage || null,
          communityId,
          organizerId: userId,
          isVirtual: isVirtual || false,
          meetingUrl: meetingUrl || null,
          chatChannelId: chatChannelId || null,
          timezone: timezone || "America/New_York",
          sessions: {
            create: sessions.map((session) => ({
              title: session.title || null,
              startTime: session.startTime,
              endTime: session.endTime || null,
              location: session.location || null,
              capacity: session.capacity || null,
            })),
          },
        },
      });

      // Update community lastActivityAt
      await tx.community.update({
        where: { id: communityId },
        data: { lastActivityAt: new Date() },
      });

      return newEvent;
    });

    revalidatePath(`/communities/${community.slug}`);
    revalidatePath(`/communities/${community.slug}/events`);
    revalidatePath(`/communities/${community.slug}/chat`);
    revalidatePath("/events");

    return {
      success: true,
      data: { eventId: event.id, communitySlug: community.slug },
    };
  } catch (error) {
    console.error("Failed to create event:", error);
    captureServerError("event.create", error);
    return { success: false, error: "Failed to create event" };
  }
}

/**
 * Update an event and its sessions
 * - Only organizers (creator + co-organizers) can update
 * - Sessions not in the list will be deleted (along with their RSVPs)
 */
export async function updateEvent(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Check rate limit
    const rateLimit = await checkEventRateLimit(userId);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "You're updating events too quickly. Please wait before making changes.",
      };
    }

    // Validate input
    const parsed = updateEventSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const {
      eventId,
      title,
      description,
      location,
      capacity,
      coverImage,
      sessions,
      isVirtual,
      meetingUrl,
      timezone,
    } = parsed.data;

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
      select: {
        title: true,
        isVirtual: true,
        chatChannelId: true,
        communityId: true,
        community: { select: { slug: true } },
        sessions: { select: { id: true } },
      },
    });

    if (!event) {
      return { success: false, error: "Event not found" };
    }

    // Sanitize description
    const sanitizedDescription =
      description !== undefined ? sanitizeText(description) : undefined;

    // Use transaction for atomic update
    await prisma.$transaction(async (tx) => {
      // Handle virtual event changes
      let chatChannelId = event.chatChannelId;

      // If changing from non-virtual to virtual, create chat channel
      if (isVirtual && !event.isVirtual && !event.chatChannelId) {
        const eventTitle = title || event.title;
        // Note: generateUniqueChannelName must be called outside transaction
        // but we're inside, so we'll use the pre-generated name passed in
        const uniqueChannelName = await generateUniqueChannelName(
          event.communityId,
          eventTitle
        );

        const channel = await tx.chatChannel.create({
          data: {
            name: uniqueChannelName,
            description: `Chat for ${eventTitle}`,
            communityId: event.communityId,
            isDefault: false,
          },
        });
        chatChannelId = channel.id;
      }

      // Update event base fields
      await tx.event.update({
        where: { id: eventId },
        data: {
          ...(title && { title }),
          ...(sanitizedDescription !== undefined && {
            description: sanitizedDescription || null,
          }),
          ...(location !== undefined && { location: location || null }),
          ...(capacity !== undefined && { capacity: capacity || null }),
          ...(coverImage !== undefined && { coverImage: coverImage || null }),
          ...(isVirtual !== undefined && { isVirtual }),
          ...(meetingUrl !== undefined && { meetingUrl: meetingUrl || null }),
          ...(chatChannelId !== event.chatChannelId && { chatChannelId }),
          ...(timezone !== undefined && { timezone }),
        },
      });

      // Handle sessions if provided
      if (sessions) {
        const existingIds = event.sessions.map((s) => s.id);
        const newSessionIds = sessions
          .filter((s) => s.id)
          .map((s) => s.id as string);

        // Delete sessions that are no longer in the list
        const toDelete = existingIds.filter((id) => !newSessionIds.includes(id));
        if (toDelete.length > 0) {
          await tx.eventSession.deleteMany({
            where: { id: { in: toDelete } },
          });
        }

        // Update existing and create new sessions
        for (const session of sessions) {
          if (session.id && existingIds.includes(session.id)) {
            // Update existing session
            await tx.eventSession.update({
              where: { id: session.id },
              data: {
                title: session.title || null,
                startTime: session.startTime,
                endTime: session.endTime || null,
                location: session.location || null,
                capacity: session.capacity || null,
              },
            });
          } else {
            // Create new session
            await tx.eventSession.create({
              data: {
                eventId,
                title: session.title || null,
                startTime: session.startTime,
                endTime: session.endTime || null,
                location: session.location || null,
                capacity: session.capacity || null,
              },
            });
          }
        }
      }
    });

    revalidatePath(`/communities/${event.community.slug}/events/${eventId}`);
    revalidatePath(`/communities/${event.community.slug}`);
    revalidatePath("/events");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update event:", error);
    captureServerError("event.update", error);
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

    // Check rate limit
    const rateLimit = await checkEventRateLimit(userId);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "You're making changes too quickly. Please wait before deleting.",
      };
    }

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
    captureServerError("event.delete", error);
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
    captureServerError("event.addCoOrganizer", error);
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
    captureServerError("event.removeCoOrganizer", error);
    return { success: false, error: "Failed to remove co-organizer" };
  }
}

/**
 * Search/filter events
 * - Only shows events from PUBLIC communities (unless filtering by specific communityId)
 * - When filtering by communityId, membership is checked elsewhere (at page level)
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
          // Only show events from PUBLIC communities when browsing all events
          // (when communityId is specified, the page-level auth handles privacy)
          !communityId ? { community: { type: "PUBLIC" } } : {},
          // Past/future filter based on sessions
          showPast
            ? { sessions: { every: { startTime: { lt: now } } } }
            : { sessions: { some: { startTime: { gte: now } } } },
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
            type: true,
          },
        },
        organizer: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        sessions: {
          orderBy: { startTime: "asc" },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            _count: { select: { rsvps: true } },
          },
        },
      },
    });

    // Sort events by first session's startTime
    events.sort((a, b) => {
      const aStart = a.sessions[0]?.startTime || new Date(0);
      const bStart = b.sessions[0]?.startTime || new Date(0);
      return showPast
        ? bStart.getTime() - aStart.getTime()
        : aStart.getTime() - bStart.getTime();
    });

    return events;
  } catch (error) {
    console.error("Failed to search events:", error);
    captureServerError("event.search", error);
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
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        capacity: true,
        coverImage: true,
        isVirtual: true,
        meetingUrl: true,
        timezone: true,
        organizerId: true,
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
        sessions: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            location: true,
            capacity: true,
          },
          orderBy: { startTime: "asc" },
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
