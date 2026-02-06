import Link from "next/link";
import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifySession } from "@/lib/dal";
import { getUserUpcomingEventsSidebar } from "@/lib/db/events";
import { formatEventTime } from "@/lib/utils/timezone";

export async function UpcomingEventsSidebar() {
  const { userId } = await verifySession();
  const events = await getUserUpcomingEventsSidebar(userId, 3);

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {events.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-foreground-muted mb-2">No upcoming events</p>
            <Link
              href="/events"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Browse events
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/communities/${event.communitySlug}/events/${event.id}`}
                className="block p-2 -mx-2 rounded-lg hover:bg-background-hover transition-colors"
              >
                <p className="text-sm font-medium text-foreground truncate">
                  {event.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-foreground-muted">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>
                    {formatEventTime(
                      new Date(event.nextSessionStart),
                      event.timezone,
                      {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }
                    )}
                  </span>
                </div>
                <p className="text-xs text-foreground-muted mt-0.5">
                  {event.communityName}
                </p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function UpcomingEventsSidebarSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="h-4 w-32 bg-background-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-4 w-3/4 bg-background-muted rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-background-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
