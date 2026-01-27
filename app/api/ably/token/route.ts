import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAblyTokenRequest } from "@/lib/ably";

export async function GET() {
  try {
    // Verify user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's community memberships for token scoping
    const memberships = await prisma.member.findMany({
      where: { userId },
      select: { communityId: true },
    });

    const communityIds = memberships.map((m) => m.communityId);

    // Get general (non-event) chat channels for each community
    const generalChannels = await prisma.chatChannel.findMany({
      where: {
        communityId: { in: communityIds },
        event: null, // Not linked to an event
      },
      select: {
        id: true,
        communityId: true,
      },
    });

    // Build map of communityId -> general chat channel IDs
    const generalChannelsByCommunity = new Map<string, Set<string>>();
    for (const channel of generalChannels) {
      if (!generalChannelsByCommunity.has(channel.communityId)) {
        generalChannelsByCommunity.set(channel.communityId, new Set());
      }
      generalChannelsByCommunity.get(channel.communityId)!.add(channel.id);
    }

    // Get event chat channel IDs where user has RSVP'd GOING
    const rsvpedEvents = await prisma.rSVP.findMany({
      where: {
        userId,
        status: "GOING",
      },
      select: {
        session: {
          select: {
            event: {
              select: {
                communityId: true,
                chatChannelId: true,
              },
            },
          },
        },
      },
    });

    // Build map of communityId -> event chat channel IDs (only for RSVP'd events)
    const eventChannelsByCommunity = new Map<string, Set<string>>();
    for (const rsvp of rsvpedEvents) {
      const { communityId, chatChannelId } = rsvp.session.event;
      if (chatChannelId) {
        if (!eventChannelsByCommunity.has(communityId)) {
          eventChannelsByCommunity.set(communityId, new Set());
        }
        eventChannelsByCommunity.get(communityId)!.add(chatChannelId);
      }
    }

    // Generate scoped token request
    const tokenRequest = await generateAblyTokenRequest(
      userId,
      communityIds,
      generalChannelsByCommunity,
      eventChannelsByCommunity
    );

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("Failed to generate Ably token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
