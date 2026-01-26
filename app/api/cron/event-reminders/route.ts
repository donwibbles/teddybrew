import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getEventReminderEmailHtml, getEventReminderEmailText } from "@/lib/email/templates";

/**
 * Cron endpoint to send event reminder emails
 * Should be called daily (e.g., via external cron service)
 * Sends reminders for events happening in 24-48 hours
 */
export async function GET() {
  try {
    // Verify cron secret to prevent public access
    const headersList = await headers();
    const authHeader = headersList.get("authorization");

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Find sessions starting in 24-48 hour window
    // Using a window handles cron timing variance
    const now = new Date();
    const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now

    const sessions = await prisma.eventSession.findMany({
      where: {
        startTime: {
          gte: windowStart,
          lt: windowEnd,
        },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            meetingUrl: true,
            community: {
              select: {
                slug: true,
                name: true,
              },
            },
          },
        },
        rsvps: {
          where: { status: "GOING" },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                emailEventReminders: true,
              },
            },
          },
        },
      },
    });

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    for (const session of sessions) {
      for (const rsvp of session.rsvps) {
        // Skip if user opted out of reminders
        if (!rsvp.user.emailEventReminders) {
          skipped++;
          continue;
        }

        // Check idempotency - already sent?
        const alreadySent = await prisma.eventReminderSent.findUnique({
          where: {
            sessionId_userId: {
              sessionId: session.id,
              userId: rsvp.user.id,
            },
          },
        });

        if (alreadySent) {
          skipped++;
          continue;
        }

        // Build URLs
        const eventUrl = `${baseUrl}/communities/${session.event.community.slug}/events/${session.event.id}`;
        // Simple unsubscribe - just link to settings for now
        // A signed token-based unsubscribe would be more secure for one-click
        const unsubscribeUrl = `${baseUrl}/settings`;

        try {
          // Send email via Resend
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM_EMAIL,
              to: rsvp.user.email,
              subject: `Reminder: ${session.event.title}`,
              html: getEventReminderEmailHtml({
                eventTitle: session.event.title,
                eventDescription: session.event.description,
                startTime: session.startTime,
                location: session.location || session.event.location,
                meetingUrl: session.event.meetingUrl,
                eventUrl,
                communityName: session.event.community.name,
                unsubscribeUrl,
              }),
              text: getEventReminderEmailText({
                eventTitle: session.event.title,
                eventDescription: session.event.description,
                startTime: session.startTime,
                location: session.location || session.event.location,
                meetingUrl: session.event.meetingUrl,
                eventUrl,
                communityName: session.event.community.name,
                unsubscribeUrl,
              }),
            }),
          });

          if (!emailResponse.ok) {
            const error = await emailResponse.text();
            errors.push(`Failed to send to ${rsvp.user.email}: ${error}`);
            continue;
          }

          // Record sent for idempotency
          await prisma.eventReminderSent.create({
            data: {
              sessionId: session.id,
              userId: rsvp.user.id,
            },
          });

          sent++;
        } catch (error) {
          errors.push(`Error sending to ${rsvp.user.email}: ${error}`);
        }
      }
    }

    return Response.json({
      success: true,
      sent,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Event reminder cron error:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
