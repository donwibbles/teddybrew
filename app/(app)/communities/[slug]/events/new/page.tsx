import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCommunityWithDetails } from "@/lib/db/communities";
import { getMembershipStatus } from "@/lib/actions/membership";
import { CreateEventForm } from "@/components/event/create-event-form";

interface NewEventPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: NewEventPageProps) {
  const { slug } = await params;
  const community = await getCommunityWithDetails(slug);

  if (!community) {
    return { title: "Community Not Found" };
  }

  return {
    title: `Create Event - ${community.name} - Hive Community`,
    description: `Create a new event in ${community.name}`,
  };
}

export default async function NewEventPage({ params }: NewEventPageProps) {
  const { slug } = await params;
  const community = await getCommunityWithDetails(slug);

  if (!community) {
    notFound();
  }

  // Check if user is a member (only members can create events)
  const membership = await getMembershipStatus(community.id);

  if (!membership.isMember) {
    redirect(`/communities/${slug}`);
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
        <Link
          href={`/communities/${community.slug}`}
          className="hover:text-primary-600"
        >
          {community.name}
        </Link>
        <span>/</span>
        <span>New Event</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Create New Event
        </h1>
        <p className="text-neutral-600 mt-1">
          Schedule an event for your community members
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <CreateEventForm
          communityId={community.id}
          communityName={community.name}
        />
      </div>
    </div>
  );
}
