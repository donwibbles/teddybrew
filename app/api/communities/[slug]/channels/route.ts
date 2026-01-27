import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCommunityBySlug } from "@/lib/db/communities";
import { getMembershipStatus } from "@/lib/actions/membership";
import { getChannels } from "@/lib/db/channels";
import { captureServerError } from "@/lib/sentry";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;

    // Verify user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get community
    const community = await getCommunityBySlug(slug);
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Check membership
    const membership = await getMembershipStatus(community.id);
    if (!membership.isMember) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    // Get channels
    const channels = await getChannels(community.id);

    // Return simplified channel data
    return NextResponse.json({
      channels: channels.map((c) => ({
        id: c.id,
        name: c.name,
        isDefault: c.isDefault,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch channels:", error);
    captureServerError("api.fetchChannels", error, { layer: "api-route" });
    return NextResponse.json(
      { error: "Failed to fetch channels" },
      { status: 500 }
    );
  }
}
