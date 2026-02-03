import { notFound, redirect } from "next/navigation";
import { getCommunityWithDetails, getMembershipStatus } from "@/lib/db/queries";
import { getChannels } from "@/lib/db/channels";
import { getSession } from "@/lib/dal";
import { ChatLayout } from "@/components/chat/chat-layout";

interface ChatPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ channel?: string }>;
}

export async function generateMetadata({ params }: ChatPageProps) {
  const { slug } = await params;
  const community = await getCommunityWithDetails(slug);

  if (!community) {
    return { title: "Community Not Found" };
  }

  return {
    title: `Chat - ${community.name} - Hive Community`,
    description: `Chat with members of ${community.name}`,
  };
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const { slug } = await params;
  const { channel: channelParam } = await searchParams;
  const community = await getCommunityWithDetails(slug);

  if (!community) {
    notFound();
  }

  const session = await getSession();
  if (!session?.user) {
    redirect(`/sign-in?callbackUrl=/communities/${slug}/chat`);
  }

  const membership = await getMembershipStatus(community.id);

  // Only members can access chat
  if (!membership.isMember) {
    redirect(`/communities/${slug}`);
  }

  // Get channels for this community
  const channels = await getChannels(community.id);

  // Use channel from query param if provided and valid, otherwise default
  const defaultChannel = channels.find((c) => c.isDefault) || channels[0];
  const selectedChannelId = channelParam && channels.some((c) => c.id === channelParam)
    ? channelParam
    : defaultChannel?.id;

  const currentUser = {
    id: session.user.id!,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  };

  return (
    <div>
      <ChatLayout
        communityId={community.id}
        communitySlug={community.slug}
        channels={channels}
        currentUser={currentUser}
        isOwner={membership.isOwner}
        defaultChannelId={selectedChannelId}
      />
    </div>
  );
}
