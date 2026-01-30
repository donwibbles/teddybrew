import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getEventForEdit } from "@/lib/actions/event";
import { getCommunityMembers } from "@/lib/db/members";
import { EditEventForm } from "@/components/event/edit-event-form";
import { CoOrganizerManager } from "@/components/event/co-organizer-manager";
import { verifySession } from "@/lib/dal";

interface EditEventPageProps {
  params: Promise<{ slug: string; eventId: string }>;
}

export async function generateMetadata({ params }: EditEventPageProps) {
  const { eventId } = await params;
  const { event } = await getEventForEdit(eventId);

  if (!event) {
    return { title: "Event Not Found" };
  }

  return {
    title: `Edit ${event.title} - Hive Community`,
    description: `Edit event in ${event.community.name}`,
  };
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { slug, eventId } = await params;
  const { userId } = await verifySession();
  const { event, canEdit } = await getEventForEdit(eventId);

  if (!event || event.community.slug !== slug) {
    notFound();
  }

  if (!canEdit) {
    redirect(`/communities/${slug}/events/${eventId}`);
  }

  // Check if user is the creator (not just co-organizer)
  const isCreator = event.organizerId === userId;

  // Get community members for co-organizer selection (only if creator)
  let members: Awaited<ReturnType<typeof getCommunityMembers>> = [];
  if (isCreator) {
    members = await getCommunityMembers(event.community.id);
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
        <Link
          href={`/communities/${event.community.slug}`}
          className="hover:text-primary-600"
        >
          {event.community.name}
        </Link>
        <span>/</span>
        <Link
          href={`/communities/${slug}/events/${eventId}`}
          className="hover:text-primary-600"
        >
          {event.title}
        </Link>
        <span>/</span>
        <span>Edit</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Edit Event</h1>
        <p className="text-neutral-600 mt-1">
          Update event details{isCreator ? " and manage co-organizers" : ""}
        </p>
      </div>

      <div className="space-y-8">
        {/* Edit Form */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <EditEventForm
            event={{
              id: event.id,
              title: event.title,
              description: event.description,
              location: event.location,
              capacity: event.capacity,
              isVirtual: event.isVirtual,
              meetingUrl: event.meetingUrl,
              timezone: event.timezone,
              city: event.city,
              state: event.state,
              eventType: event.eventType,
              showAttendeeCount: event.showAttendeeCount,
              sessions: event.sessions,
            }}
            communitySlug={slug}
            isCreator={isCreator}
          />
        </div>

        {/* Co-organizer Management - Only for creator */}
        {isCreator && (
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <CoOrganizerManager
              eventId={event.id}
              coOrganizers={event.coOrganizers}
              members={members}
              organizerId={event.organizerId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
