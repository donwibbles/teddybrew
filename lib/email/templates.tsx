/**
 * Email templates for Hive Community
 * Accessible HTML with plain text fallback
 */

interface MagicLinkEmailProps {
  url: string;
  host: string;
}

/**
 * Generate HTML email for magic link authentication
 * Designed to display correctly in Gmail, Outlook, and Apple Mail
 */
export function getMagicLinkEmailHtml({ url, host }: MagicLinkEmailProps): string {
  // Escape HTML to prevent XSS
  const escapedHost = host.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Sign in to Hive Community</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">
                Hive Community
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">
                Sign in to your account
              </h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #52525b;">
                Click the button below to sign in to Hive Community. This link will expire in 24 hours.
              </p>

              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 0 0 24px;">
                    <a href="${url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 28px; background-color: #18181b; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500; border-radius: 6px;">
                      Sign in to Hive Community
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative link -->
              <p style="margin: 0 0 8px; font-size: 14px; color: #71717a;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; word-break: break-all; color: #3b82f6;">
                <a href="${url}" style="color: #3b82f6; text-decoration: underline;">${url}</a>
              </p>

              <!-- Security notice -->
              <p style="margin: 0; padding: 16px; background-color: #fafafa; border-radius: 6px; font-size: 14px; line-height: 1.5; color: #71717a;">
                If you didn't request this email, you can safely ignore it. Someone may have entered your email address by mistake.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e4e4e7; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                This email was sent from ${escapedHost}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Generate plain text email for magic link authentication
 * Fallback for email clients that don't support HTML
 */
export function getMagicLinkEmailText({ url, host }: MagicLinkEmailProps): string {
  return `
Sign in to Hive Community

Click the link below to sign in to your account. This link will expire in 24 hours.

${url}

If you didn't request this email, you can safely ignore it. Someone may have entered your email address by mistake.

---
This email was sent from ${host}
`.trim();
}

// ============ COMMUNITY INVITE EMAILS ============

interface CommunityInviteEmailProps {
  communityName: string;
  communityDescription?: string | null;
  inviterName: string;
  acceptUrl: string;
  expiresInDays: number;
}

/**
 * Generate HTML email for community invitation
 */
export function getCommunityInviteEmailHtml({
  communityName,
  communityDescription,
  inviterName,
  acceptUrl,
  expiresInDays,
}: CommunityInviteEmailProps): string {
  const escapedCommunityName = communityName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedInviterName = inviterName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedDescription = communityDescription
    ? communityDescription.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : null;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>You're invited to join ${escapedCommunityName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">
                Hive Community
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">
                You're invited to join ${escapedCommunityName}
              </h2>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #52525b;">
                <strong>${escapedInviterName}</strong> has invited you to join their community on Hive.
              </p>
              ${escapedDescription ? `
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.5; color: #71717a; padding: 12px; background-color: #fafafa; border-radius: 6px;">
                "${escapedDescription}"
              </p>
              ` : ''}

              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 0 0 24px;">
                    <a href="${acceptUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 28px; background-color: #18181b; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500; border-radius: 6px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative link -->
              <p style="margin: 0 0 8px; font-size: 14px; color: #71717a;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; word-break: break-all; color: #3b82f6;">
                <a href="${acceptUrl}" style="color: #3b82f6; text-decoration: underline;">${acceptUrl}</a>
              </p>

              <!-- Notice -->
              <p style="margin: 0; padding: 16px; background-color: #fafafa; border-radius: 6px; font-size: 14px; line-height: 1.5; color: #71717a;">
                This invitation expires in ${expiresInDays} days. You must sign in with this email address to accept.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e4e4e7; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                If you don't want to join this community, you can ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Generate plain text email for community invitation
 */
export function getCommunityInviteEmailText({
  communityName,
  communityDescription,
  inviterName,
  acceptUrl,
  expiresInDays,
}: CommunityInviteEmailProps): string {
  return `
You're invited to join ${communityName}

${inviterName} has invited you to join their community on Hive Community.
${communityDescription ? `\n"${communityDescription}"\n` : ''}
Accept the invitation by clicking the link below:

${acceptUrl}

This invitation expires in ${expiresInDays} days.
You must sign in with this email address to accept.

---
If you don't want to join this community, you can ignore this email.
`.trim();
}

// ============ RSVP CONFIRMATION EMAILS ============

/**
 * Format event time with explicit timezone
 * Falls back gracefully if timezone is invalid
 */
function formatEventTime(date: Date, timezone: string): { date: string; time: string } {
  try {
    const formattedDate = date.toLocaleDateString("en-US", {
      timeZone: timezone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }) + ` (${timezone})`;
    return { date: formattedDate, time: formattedTime };
  } catch {
    // Fallback if invalid timezone
    const formattedDate = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
    return { date: formattedDate, time: formattedTime };
  }
}

interface RsvpConfirmationEmailProps {
  eventTitle: string;
  sessionDate: Date;
  location?: string | null;
  meetingUrl?: string | null;
  coverImage?: string | null;
  eventUrl: string;
  communityName: string;
  timezone?: string;
}

/**
 * Generate HTML email for RSVP confirmation
 */
export function getRsvpConfirmationEmailHtml({
  eventTitle,
  sessionDate,
  location,
  meetingUrl,
  coverImage,
  eventUrl,
  communityName,
  timezone = "America/New_York",
}: RsvpConfirmationEmailProps): string {
  const escapedTitle = eventTitle.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedCommunity = communityName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedLocation = location
    ? location.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : null;

  const { date: formattedDate, time: formattedTime } = formatEventTime(sessionDate, timezone);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>You're signed up: ${escapedTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">
                Hive Community
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              ${coverImage ? `<img src="${coverImage}" alt="" width="100%" style="border-radius: 8px; max-height: 200px; object-fit: cover; display: block; margin-bottom: 16px;" />` : ''}
              <p style="margin: 0 0 8px; font-size: 14px; color: #22c55e; font-weight: 500;">
                You're signed up!
              </p>
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">
                ${escapedTitle}
              </h2>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #52525b;">
                    <strong>When:</strong> ${formattedDate} at ${formattedTime}
                  </td>
                </tr>
                ${escapedLocation ? `
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #52525b;">
                    <strong>Where:</strong> ${escapedLocation}
                  </td>
                </tr>
                ` : ''}
                ${meetingUrl ? `
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #52525b;">
                    <strong>Meeting Link:</strong> <a href="${meetingUrl}" style="color: #3b82f6;">${meetingUrl}</a>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #52525b;">
                    <strong>Community:</strong> ${escapedCommunity}
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px; padding: 12px; background-color: #f0fdf4; border-radius: 6px; font-size: 14px; line-height: 1.5; color: #166534;">
                We'll send you a reminder 24 hours before the event.
              </p>

              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 0 0 24px;">
                    <a href="${eventUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 28px; background-color: #18181b; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500; border-radius: 6px;">
                      View Event Details
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e4e4e7; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                You can manage your RSVP from the event page.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Generate plain text email for RSVP confirmation
 */
export function getRsvpConfirmationEmailText({
  eventTitle,
  sessionDate,
  location,
  meetingUrl,
  communityName,
  eventUrl,
  timezone = "America/New_York",
}: RsvpConfirmationEmailProps): string {
  const { date: formattedDate, time: formattedTime } = formatEventTime(sessionDate, timezone);

  return `
You're signed up: ${eventTitle}

When: ${formattedDate} at ${formattedTime}
${location ? `Where: ${location}` : ''}
${meetingUrl ? `Meeting Link: ${meetingUrl}` : ''}
Community: ${communityName}

We'll send you a reminder 24 hours before the event.

View event details: ${eventUrl}

---
You can manage your RSVP from the event page.
`.trim();
}

// ============ EVENT REMINDER EMAILS ============

interface EventReminderEmailProps {
  eventTitle: string;
  eventDescription?: string | null;
  startTime: Date;
  location?: string | null;
  meetingUrl?: string | null;
  coverImage?: string | null;
  eventUrl: string;
  communityName: string;
  unsubscribeUrl: string;
  timezone?: string;
}

/**
 * Generate HTML email for event reminder
 */
export function getEventReminderEmailHtml({
  eventTitle,
  eventDescription,
  startTime,
  location,
  meetingUrl,
  coverImage,
  eventUrl,
  communityName,
  unsubscribeUrl,
  timezone = "America/New_York",
}: EventReminderEmailProps): string {
  const escapedTitle = eventTitle.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedCommunity = communityName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedDescription = eventDescription
    ? eventDescription.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : null;
  const escapedLocation = location
    ? location.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : null;

  const { date: formattedDate, time: formattedTime } = formatEventTime(startTime, timezone);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Reminder: ${escapedTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">
                Hive Community
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              ${coverImage ? `<img src="${coverImage}" alt="" width="100%" style="border-radius: 8px; max-height: 200px; object-fit: cover; display: block; margin-bottom: 16px;" />` : ''}
              <p style="margin: 0 0 8px; font-size: 14px; color: #71717a;">
                Event Reminder
              </p>
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">
                ${escapedTitle}
              </h2>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #52525b;">
                    <strong>When:</strong> ${formattedDate} at ${formattedTime}
                  </td>
                </tr>
                ${escapedLocation ? `
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #52525b;">
                    <strong>Where:</strong> ${escapedLocation}
                  </td>
                </tr>
                ` : ''}
                ${meetingUrl ? `
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #52525b;">
                    <strong>Meeting Link:</strong> <a href="${meetingUrl}" style="color: #3b82f6;">${meetingUrl}</a>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #52525b;">
                    <strong>Community:</strong> ${escapedCommunity}
                  </td>
                </tr>
              </table>

              ${escapedDescription ? `
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.5; color: #52525b;">
                ${escapedDescription}
              </p>
              ` : ''}

              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 0 0 24px;">
                    <a href="${eventUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 28px; background-color: #18181b; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500; border-radius: 6px;">
                      View Event Details
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e4e4e7; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                <a href="${unsubscribeUrl}" style="color: #a1a1aa; text-decoration: underline;">Unsubscribe from event reminders</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Generate plain text email for event reminder
 */
export function getEventReminderEmailText({
  eventTitle,
  eventDescription,
  startTime,
  location,
  meetingUrl,
  eventUrl,
  communityName,
  unsubscribeUrl,
  timezone = "America/New_York",
}: EventReminderEmailProps): string {
  const { date: formattedDate, time: formattedTime } = formatEventTime(startTime, timezone);

  return `
Event Reminder: ${eventTitle}

When: ${formattedDate} at ${formattedTime}
${location ? `Where: ${location}` : ''}
${meetingUrl ? `Meeting Link: ${meetingUrl}` : ''}
Community: ${communityName}
${eventDescription ? `\n${eventDescription}\n` : ''}

View event details: ${eventUrl}

---
Unsubscribe from event reminders: ${unsubscribeUrl}
`.trim();
}
