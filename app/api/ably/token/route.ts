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

    // Generate scoped token request
    const tokenRequest = await generateAblyTokenRequest(userId, communityIds);

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("Failed to generate Ably token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
