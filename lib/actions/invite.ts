"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import {
  sendInviteSchema,
  acceptInviteSchema,
  cancelInviteSchema,
  resendInviteSchema,
} from "@/lib/validations/invite";
import { getCommunityInviteEmailHtml, getCommunityInviteEmailText } from "@/lib/email/templates";
import { MemberRole, NotificationType } from "@prisma/client";
import { captureServerError, captureExternalServiceError } from "@/lib/sentry";
import { checkInviteRateLimit } from "@/lib/rate-limit";

/**
 * Action result types
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const INVITE_EXPIRY_DAYS = 7;

/**
 * Send a community invite
 * - Only owner can send invites
 * - Upserts if expired invite exists for same email
 */
export async function sendCommunityInvite(
  input: unknown
): Promise<ActionResult<{ inviteId: string }>> {
  try {
    // Verify user is authenticated
    const { userId } = await verifySession();

    // Rate limiting
    const rateLimit = await checkInviteRateLimit(userId);
    if (!rateLimit.success) {
      return { success: false, error: "You're sending invites too quickly. Please wait before trying again." };
    }

    // Validate input
    const parsed = sendInviteSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { communityId, email } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Get community and verify ownership
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        ownerId: true,
        type: true,
      },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    if (community.ownerId !== userId) {
      return { success: false, error: "Only the community owner can send invites" };
    }

    // Check if user is already a member
    const existingMember = await prisma.member.findFirst({
      where: {
        communityId,
        user: { email: normalizedEmail },
      },
    });

    if (existingMember) {
      return { success: false, error: "This person is already a member of the community" };
    }

    // Get inviter info
    const inviter = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Check for existing invite
    const existingInvite = await prisma.communityInvite.findUnique({
      where: { communityId_email: { communityId, email: normalizedEmail } },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    let invite;

    if (existingInvite) {
      // Check if not expired
      if (existingInvite.expiresAt > new Date()) {
        return { success: false, error: "An invite has already been sent to this email" };
      }

      // Update expired invite with new token
      invite = await prisma.communityInvite.update({
        where: { id: existingInvite.id },
        data: {
          token: crypto.randomUUID(),
          expiresAt,
          createdById: userId,
          createdAt: new Date(),
        },
      });
    } else {
      // Create new invite
      invite = await prisma.communityInvite.create({
        data: {
          communityId,
          email: normalizedEmail,
          token: crypto.randomUUID(),
          expiresAt,
          createdById: userId,
        },
      });
    }

    // Build accept URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const acceptUrl = `${baseUrl}/invite/${invite.token}`;

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: normalizedEmail,
        subject: `You're invited to join ${community.name} on Hive`,
        html: getCommunityInviteEmailHtml({
          communityName: community.name,
          communityDescription: community.description,
          inviterName: inviter?.name || "A community owner",
          acceptUrl,
          expiresInDays: INVITE_EXPIRY_DAYS,
        }),
        text: getCommunityInviteEmailText({
          communityName: community.name,
          communityDescription: community.description,
          inviterName: inviter?.name || "A community owner",
          acceptUrl,
          expiresInDays: INVITE_EXPIRY_DAYS,
        }),
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error("Failed to send invite email:", error);
      captureExternalServiceError("invite.sendEmail",
        new Error(`Resend API ${emailResponse.status}`),
        { responseBody: error }
      );
      // Delete the invite if email fails
      await prisma.communityInvite.delete({ where: { id: invite.id } });
      return { success: false, error: "Failed to send invite email" };
    }

    // Check if invitee is an existing user - create in-app notification
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      await prisma.notification.create({
        data: {
          type: NotificationType.COMMUNITY_INVITE,
          userId: existingUser.id,
          title: `Invitation to join ${community.name}`,
          message: `${inviter?.name || "Someone"} has invited you to join their community.`,
          link: `/invite/${invite.token}`,
        },
      });
    }

    revalidatePath(`/communities/${community.slug}/settings`);

    return { success: true, data: { inviteId: invite.id } };
  } catch (error) {
    console.error("Failed to send community invite:", error);
    captureServerError("invite.send", error);
    return { success: false, error: "Failed to send invite" };
  }
}

/**
 * Accept a community invite
 * - Requires authentication
 * - Email must match invite email
 */
export async function acceptInvite(
  input: unknown
): Promise<ActionResult<{ communitySlug: string }>> {
  try {
    // Verify user is authenticated
    const { userId } = await verifySession();

    // Validate input
    const parsed = acceptInviteSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { token } = parsed.data;

    // Get invite
    const invite = await prisma.communityInvite.findUnique({
      where: { token },
      include: {
        community: {
          select: { id: true, slug: true, name: true },
        },
      },
    });

    if (!invite) {
      return { success: false, error: "Invite not found" };
    }

    // Check expiry
    if (invite.expiresAt < new Date()) {
      return { success: false, error: "This invite has expired" };
    }

    // Get current user's email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Check email match
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return {
        success: false,
        error: "This invite was sent to a different email address",
      };
    }

    // Check if already a member
    const existingMember = await prisma.member.findUnique({
      where: { userId_communityId: { userId, communityId: invite.communityId } },
    });

    if (existingMember) {
      // Delete the invite since user is already a member
      await prisma.communityInvite.delete({ where: { id: invite.id } });
      return {
        success: true,
        data: { communitySlug: invite.community.slug },
      };
    }

    // Add user as member and delete invite in a transaction
    await prisma.$transaction([
      prisma.member.create({
        data: {
          userId,
          communityId: invite.communityId,
          role: MemberRole.MEMBER,
        },
      }),
      prisma.communityInvite.delete({ where: { id: invite.id } }),
    ]);

    revalidatePath(`/communities/${invite.community.slug}`);
    revalidatePath("/communities");

    return { success: true, data: { communitySlug: invite.community.slug } };
  } catch (error) {
    console.error("Failed to accept invite:", error);
    captureServerError("invite.accept", error);
    return { success: false, error: "Failed to accept invite" };
  }
}

/**
 * Cancel/revoke an invite
 * - Only owner can cancel
 */
export async function cancelInvite(
  input: unknown
): Promise<ActionResult> {
  try {
    // Verify user is authenticated
    const { userId } = await verifySession();

    // Validate input
    const parsed = cancelInviteSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { inviteId } = parsed.data;

    // Get invite and verify ownership
    const invite = await prisma.communityInvite.findUnique({
      where: { id: inviteId },
      include: {
        community: {
          select: { slug: true, ownerId: true },
        },
      },
    });

    if (!invite) {
      return { success: false, error: "Invite not found" };
    }

    if (invite.community.ownerId !== userId) {
      return { success: false, error: "Only the community owner can cancel invites" };
    }

    // Delete invite
    await prisma.communityInvite.delete({ where: { id: inviteId } });

    revalidatePath(`/communities/${invite.community.slug}/settings`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to cancel invite:", error);
    captureServerError("invite.cancel", error);
    return { success: false, error: "Failed to cancel invite" };
  }
}

/**
 * Resend an invite
 * - Only owner can resend
 * - Regenerates token and extends expiry
 */
export async function resendInvite(
  input: unknown
): Promise<ActionResult> {
  try {
    // Verify user is authenticated
    const { userId } = await verifySession();

    // Rate limiting
    const rateLimit = await checkInviteRateLimit(userId);
    if (!rateLimit.success) {
      return { success: false, error: "You're sending invites too quickly. Please wait before trying again." };
    }

    // Validate input
    const parsed = resendInviteSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { inviteId } = parsed.data;

    // Get invite and verify ownership
    const invite = await prisma.communityInvite.findUnique({
      where: { id: inviteId },
      include: {
        community: {
          select: { slug: true, name: true, description: true, ownerId: true },
        },
      },
    });

    if (!invite) {
      return { success: false, error: "Invite not found" };
    }

    if (invite.community.ownerId !== userId) {
      return { success: false, error: "Only the community owner can resend invites" };
    }

    // Get inviter info
    const inviter = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Regenerate token and extend expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const updatedInvite = await prisma.communityInvite.update({
      where: { id: inviteId },
      data: {
        token: crypto.randomUUID(),
        expiresAt,
      },
    });

    // Build accept URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const acceptUrl = `${baseUrl}/invite/${updatedInvite.token}`;

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: invite.email,
        subject: `Reminder: You're invited to join ${invite.community.name} on Hive`,
        html: getCommunityInviteEmailHtml({
          communityName: invite.community.name,
          communityDescription: invite.community.description,
          inviterName: inviter?.name || "A community owner",
          acceptUrl,
          expiresInDays: INVITE_EXPIRY_DAYS,
        }),
        text: getCommunityInviteEmailText({
          communityName: invite.community.name,
          communityDescription: invite.community.description,
          inviterName: inviter?.name || "A community owner",
          acceptUrl,
          expiresInDays: INVITE_EXPIRY_DAYS,
        }),
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error("Failed to resend invite email:", error);
      captureExternalServiceError("invite.resendEmail",
        new Error(`Resend API ${emailResponse.status}`),
        { responseBody: error }
      );
      return { success: false, error: "Failed to resend invite email" };
    }

    revalidatePath(`/communities/${invite.community.slug}/settings`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to resend invite:", error);
    captureServerError("invite.resend", error);
    return { success: false, error: "Failed to resend invite" };
  }
}

/**
 * Get pending invites for a community
 * - Only owner can view
 */
export async function getCommunityInvites(communityId: string) {
  try {
    // Verify user is authenticated
    const { userId } = await verifySession();

    // Get community and verify ownership
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { ownerId: true },
    });

    if (!community) {
      return [];
    }

    if (community.ownerId !== userId) {
      return [];
    }

    // Get pending invites
    const invites = await prisma.communityInvite.findMany({
      where: { communityId },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { name: true },
        },
      },
    });

    return invites;
  } catch (error) {
    console.error("Failed to get community invites:", error);
    captureServerError("invite.list", error);
    return [];
  }
}

/**
 * Get invite by token (for accept page)
 * - Public, but only returns limited info
 */
export async function getInviteByToken(token: string) {
  try {
    const invite = await prisma.communityInvite.findUnique({
      where: { token },
      include: {
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            slug: true,
            _count: { select: { members: true } },
          },
        },
      },
    });

    if (!invite) {
      return null;
    }

    return {
      id: invite.id,
      email: invite.email,
      expiresAt: invite.expiresAt,
      isExpired: invite.expiresAt < new Date(),
      community: {
        id: invite.community.id,
        name: invite.community.name,
        description: invite.community.description,
        slug: invite.community.slug,
        memberCount: invite.community._count.members,
      },
    };
  } catch (error) {
    console.error("Failed to get invite by token:", error);
    captureServerError("invite.getByToken", error);
    return null;
  }
}
