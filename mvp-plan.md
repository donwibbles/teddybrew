# MVP Plan: Passwordless Communities + Events

## Overview
This document describes the full MVP architecture and implementation plan for a web-only product that supports:
- Passwordless user accounts (magic link email)
- Creating and joining communities (public and private)
- Creating and RSVPing to events inside communities

The system uses a single long-running Next.js server, Neon Postgres, and Auth.js.

---

## Stack
- **Next.js 16.1** (App Router, Turbopack, long-running server)
- **React 19.2** (Server Components, Server Actions)
- **Auth.js v5 beta** (Email magic link via Resend)
- **Neon Postgres** (managed PostgreSQL with connection pooling)
- **Prisma ORM 7.2** (Rust-free client, type-safe database access)
- **Tailwind CSS 4.1** (Oxide engine, zero configuration)
- **shadcn/ui** (Radix UI primitives, accessible components)
- **Hosting**: Fly.io or Railway (always-on Node server)

---

## Authentication
- Passwordless email magic links (24-hour expiry)
- Auth.js v5 with Prisma adapter
- Resend for transactional email delivery
- Database sessions (no JWT for MVP)

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host/db"

# Auth
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"  # or production URL

# Email
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"

# Optional
NODE_ENV="development"
```

---

## Database Schema

### Complete Prisma Schema

```prisma
// This is your Prisma schema file
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// AUTH.JS REQUIRED TABLES
// ============================================================================

model Account {
  id                String  @id @default(cuid())
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ============================================================================
// APPLICATION MODELS
// ============================================================================

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime? @map("email_verified")
  image         String?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // Relations
  accounts           Account[]
  sessions           Session[]
  communitiesOwned   Community[]
  communityMemberships CommunityMember[]
  eventsCreated      Event[]
  eventRsvps         EventRsvp[]

  @@index([email])
  @@map("users")
}

model Community {
  id          String   @id @default(cuid())
  slug        String   @unique // IMMUTABLE: Cannot be changed after creation
  name        String
  description String?  @db.Text
  isPublic    Boolean  @default(true) @map("is_public")
  ownerId     String   @map("owner_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  owner   User              @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  members CommunityMember[]
  events  Event[]

  @@index([slug])
  @@index([ownerId])
  @@index([isPublic, createdAt])
  @@map("communities")
}

model CommunityMember {
  id          String   @id @default(cuid())
  communityId String   @map("community_id")
  userId      String   @map("user_id")
  role        String   @default("member") // "owner" or "member"
  joinedAt    DateTime @default(now()) @map("joined_at")

  // Relations
  community Community @relation(fields: [communityId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([communityId, userId])
  @@index([userId])
  @@index([communityId, role])
  @@map("community_members")
}

model Event {
  id          String    @id @default(cuid())
  communityId String    @map("community_id")
  creatorId   String    @map("creator_id")
  title       String
  description String?   @db.Text
  startTime   DateTime  @map("start_time")
  endTime     DateTime? @map("end_time")
  timezone    String    @default("UTC")
  location    String?   // Physical address or "Virtual"
  virtualUrl  String?   @map("virtual_url") // Meeting link if virtual
  capacity    Int?      // null = unlimited
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  // Relations
  community Community   @relation(fields: [communityId], references: [id], onDelete: Cascade)
  creator   User        @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  rsvps     EventRsvp[]

  @@index([communityId, startTime])
  @@index([creatorId])
  @@index([startTime])
  @@map("events")
}

model EventRsvp {
  id        String   @id @default(cuid())
  eventId   String   @map("event_id")
  userId    String   @map("user_id")
  status    String   @default("yes") // "yes", "no", "maybe"
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([eventId, userId])
  @@index([userId])
  @@index([eventId, status])
  @@map("event_rsvps")
}
```

### Schema Design Decisions

**Timestamps**: All models include `createdAt` and `updatedAt` for audit trails

**Soft Deletes**: NOT implemented for MVP. Use hard deletes (Cascade) to keep it simple. Can add later if needed.

**Indexes**:
- Primary lookups: email, slug
- List queries: communityId + startTime for events
- Permission checks: userId, communityId + userId
- Discovery: isPublic + createdAt for community listings

**Unique Constraints**:
- User email (Auth.js requirement)
- Community slug (for URLs, **immutable after creation**)
- CommunityMember userId + communityId (one membership per user)
- EventRsvp eventId + userId (one RSVP per user per event)

**Critical Invariant**:
- Community owners MUST have a corresponding CommunityMember record with role="owner"
- This is enforced in the community creation transaction to prevent ownership/membership drift

---

## Community Access Model

### Public vs Private Communities

**Public Communities**:
- Visible in community discovery/listing at `/communities`
- Anyone can view community details and events
- Requires explicit "Join" action to become a member
- Members can RSVP to events

**Private Communities**:
- NOT shown in public listings
- Only accessible via direct link (shareable URL)
- Non-members see "Request to join" or "Private community" message
- For MVP: Auto-approve joins (click to join). Post-MVP can add approval flow

### Community Discovery

**Discovery Page**: `/communities`

Display public communities with:
- Community name
- Description (truncated to 150 chars)
- Member count
- Upcoming events count
- Owner name
- Created date
- "View" button → `/c/[slug]`

**Sorting**: Most recent first (createdAt DESC)

**No search or filtering in MVP** - just a simple list

**Query Example**:
```typescript
const communities = await prisma.community.findMany({
  where: { isPublic: true },
  include: {
    owner: { select: { name: true, email: true } },
    _count: { select: { members: true, events: true } }
  },
  orderBy: { createdAt: 'desc' },
  take: 50 // Simple pagination limit
});
```

### Join/Leave Flow

**Joining**:
1. User clicks "Join Community" button on `/c/[slug]`
2. POST to `/api/communities/[slug]/join`
3. Creates CommunityMember record with role="member"
4. Redirect back to community page
5. Show "Leave Community" button

**Creating** (enforcing owner invariant):
```typescript
// In POST /api/communities - atomic transaction
const community = await prisma.community.create({
  data: { name, slug, description, isPublic, ownerId: session.user.id }
});

// CRITICAL: Always create owner membership in same transaction
await prisma.communityMember.create({
  data: {
    communityId: community.id,
    userId: session.user.id,
    role: "owner"
  }
});
```

**Leaving**:
- POST to `/api/communities/[slug]/leave`
- Deletes CommunityMember record
- Only members (not owner) can leave
- Owner cannot leave (must delete community instead)

---

## Event Specifications

### Event Visibility

**Important**: Events inherit visibility from their community:
- **Public community events**: Anyone can view event details, but only community members can RSVP
- **Private community events**: Only community members can view and RSVP

Non-members viewing public community events will see all event details (title, description, date, location, attendee count) but cannot interact (no RSVP button).

### Required Fields

```typescript
{
  title: string;           // Required, 3-100 chars
  description?: string;    // Optional, max 5000 chars
  startTime: Date;         // Required, must be future date
  endTime?: Date;          // Optional, must be after startTime
  timezone: string;        // Required, IANA timezone, default "UTC"
  location?: string;       // Optional, free text (e.g., "123 Main St" or "Virtual")
  virtualUrl?: string;     // Optional, valid URL for video calls
  capacity?: number;       // Optional, null = unlimited
}
```

### Timezone Handling

**Approach**: Store timestamps in UTC, display in user's local timezone

**Implementation**:
1. Store `timezone` field (IANA format: "America/New_York", "Europe/London")
2. Creator selects timezone from dropdown (use `Intl.DateTimeFormat().resolvedOptions().timeZone` as default)
3. Database stores `startTime`/`endTime` as UTC
4. Display layer converts to viewer's local timezone using browser `Intl` API

**Libraries**: Use native JavaScript `Intl` API - no external deps needed for MVP

**Display Format**:
```
March 15, 2026 at 7:00 PM EST
(Shows in your timezone: 4:00 PM PST)
```

### Capacity Limits

**Implementation**:
- `capacity` field: `Int?` (nullable = unlimited)
- If set, enforce in RSVP logic
- Count only "yes" RSVPs against capacity
- Show "Event Full" when capacity reached
- Don't allow new "yes" RSVPs when full
- Canceling RSVP frees up spot

**Race Condition Acknowledgment**:
Capacity enforcement is **best-effort** in MVP and may allow rare overbooking under extreme concurrency (e.g., two users RSVPing to the last spot simultaneously). This is acceptable for MVP because:
- The race window is tiny (milliseconds)
- Worst case: 1-2 extra attendees beyond capacity
- Can be fixed post-MVP with database transactions or row-level locking if needed

**Display**:
```
15 / 30 attending
```
or
```
42 attending
```

### RSVP States

**Three states** (schema and API):
- `yes`: Attending
- `no`: Not attending
- `maybe`: Interested/tentative

**MVP Decision**:
- **Schema & API**: Support all three states (`["yes", "no", "maybe"]`) for future-proofing
- **UI**: Only show "Going" and "Not Going" buttons that map to "yes" and "no"
- **Rationale**: API implementation cost is near zero, but UI complexity is significant (3 buttons, different states, colors, cognitive load)
- **Future**: Adding "Maybe" button to UI later is trivial since API already supports it

**Query Pattern**: Always filter RSVPs by status in queries:
```typescript
// Attendee list - only "yes"
const attendees = await prisma.eventRsvp.findMany({
  where: { eventId, status: "yes" },
  include: { user: true }
});

// Capacity check - only count "yes"
const yesCount = await prisma.eventRsvp.count({
  where: { eventId, status: "yes" }
});
```

### Cancel RSVP

**Flow**:
1. User changes status from "yes" to "no"
2. Same endpoint: `POST /api/events/[id]/rsvp` with `{ status: "no" }`
3. Updates existing EventRsvp record
4. Frees capacity slot if applicable

**MVP Choice**: Use status="no" approach to keep history. Simpler queries.

---

## Authorization & Permissions

### Permission Matrix

| Action | Owner | Member | Non-Member (Public) | Non-Member (Private) |
|--------|-------|--------|---------------------|----------------------|
| View community | Yes | Yes | Yes | No |
| Join community | N/A | N/A | Yes | Yes (with link) |
| Leave community | No | Yes | N/A | N/A |
| Create event | Yes | Yes | No | No |
| Edit event | Yes (any) | Yes (own only) | No | No |
| Delete event | Yes (any) | Yes (own only) | No | No |
| View event | Yes | Yes | Yes (public comm) | No |
| RSVP to event | Yes | Yes | No | No |
| Remove member | Yes | No | No | No |

### Who Can Create Events

**Decision**: Both owner and members can create events

**Rationale**: Empowers communities, reduces bottleneck. Owner can always delete inappropriate events.

### Authorization Helper Functions

Create `/lib/permissions.ts`:

```typescript
export async function canViewCommunity(
  communityId: string,
  userId: string | null
): Promise<boolean> {
  const community = await prisma.community.findUnique({
    where: { id: communityId }
  });

  if (!community) return false;
  if (community.isPublic) return true;
  if (!userId) return false;

  const membership = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: { communityId, userId }
    }
  });

  return !!membership;
}

export async function canCreateEvent(
  communityId: string,
  userId: string
): Promise<boolean> {
  const membership = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: { communityId, userId }
    }
  });

  return !!membership; // Owner or member
}

export async function canEditEvent(
  eventId: string,
  userId: string
): Promise<boolean> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      community: { select: { ownerId: true } }
    }
  });

  if (!event) return false;

  // Owner of community or creator of event
  return event.creatorId === userId || event.community.ownerId === userId;
}

export async function canDeleteEvent(
  eventId: string,
  userId: string
): Promise<boolean> {
  return canEditEvent(eventId, userId); // Same permissions
}

export async function isCommunityOwner(
  communityId: string,
  userId: string
): Promise<boolean> {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { ownerId: true }
  });

  return community?.ownerId === userId;
}
```

### Member Removal

**Who**: Only community owner

**Endpoint**: `DELETE /api/communities/[slug]/members/[userId]`

**Implementation**:
```typescript
// Check if requester is owner
// 1. Transfer event ownership to community owner (preserves scheduled events)
await prisma.event.updateMany({
  where: { communityId, creatorId: memberUserId },
  data: { creatorId: community.ownerId }
});

// 2. Delete user's RSVPs to community events
await prisma.eventRsvp.deleteMany({
  where: {
    userId: memberUserId,
    event: { communityId }
  }
});

// 3. Delete CommunityMember record
await prisma.communityMember.delete({
  where: { communityId_userId: { communityId, userId: memberUserId } }
});
```

**Event Ownership Transfer**:
When a member is removed, their events are **transferred to the community owner** rather than deleted. This:
- Preserves scheduled events (less disruptive to community)
- Prevents orphaned events
- Gives owner full control over all community content

**UI**: Owner sees "Remove" button next to each member in member list

### Query Helpers

To ensure consistent RSVP filtering across the codebase, create helper functions in `/lib/queries.ts`:

```typescript
import { prisma } from "@/lib/prisma";

/**
 * Get all attendees for an event (status="yes" only)
 */
export async function getEventAttendees(eventId: string) {
  return prisma.eventRsvp.findMany({
    where: { eventId, status: "yes" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" }
  });
}

/**
 * Get count of "yes" RSVPs for an event (for capacity checks)
 */
export async function getEventAttendeeCount(eventId: string): Promise<number> {
  return prisma.eventRsvp.count({
    where: { eventId, status: "yes" }
  });
}

/**
 * Check if event is at capacity
 */
export async function isEventFull(eventId: string): Promise<boolean> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { capacity: true }
  });

  if (!event || !event.capacity) return false; // No capacity limit

  const attendeeCount = await getEventAttendeeCount(eventId);
  return attendeeCount >= event.capacity;
}

/**
 * Get user's RSVP status for an event
 */
export async function getUserRsvpStatus(
  eventId: string,
  userId: string
): Promise<"yes" | "no" | "maybe" | null> {
  const rsvp = await prisma.eventRsvp.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { status: true }
  });

  return rsvp?.status as "yes" | "no" | "maybe" | null;
}
```

**Usage in API routes**:
```typescript
// Check capacity before allowing RSVP
if (await isEventFull(eventId)) {
  throw new ApiError("Event is at capacity", 400, "EVENT_FULL");
}

// Display attendee list
const attendees = await getEventAttendees(eventId);
```

---

## Email Configuration

### Development vs Production

**Development**:
- Use Resend's test mode OR
- Use `nodemailer` with Ethereal email (fake SMTP)
- Log magic links to console as fallback

**Production**:
- Resend with verified domain
- Set EMAIL_FROM to verified sender

### Email Template Structure

**Location**: `/lib/email-templates.ts`

**MVP Approach**: Simple HTML strings (no React Email yet)

**Magic Link Template**:

```typescript
// /lib/email-templates.ts
export function getMagicLinkEmail(url: string): { subject: string; html: string } {
  return {
    subject: "Sign in to Hive Community",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f9fafb; border-radius: 8px; padding: 32px; margin: 20px 0;">
            <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #111;">
              Sign in to Hive Community
            </h1>
            <p style="margin: 0 0 24px 0; font-size: 16px; color: #555;">
              Click the button below to sign in to your account. This link will expire in 24 hours.
            </p>
            <a href="${url}"
               style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 500; font-size: 16px;">
              Sign in
            </a>
            <p style="margin: 24px 0 0 0; font-size: 14px; color: #777;">
              If you didn't request this email, you can safely ignore it.
            </p>
            <p style="margin: 12px 0 0 0; font-size: 14px; color: #999;">
              Or copy and paste this URL into your browser:<br>
              <span style="word-break: break-all; color: #2563eb;">${url}</span>
            </p>
          </div>
        </body>
      </html>
    `
  };
}
```

### Auth.js Email Provider Config

```typescript
// /lib/auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/prisma";
import { getMagicLinkEmail } from "@/lib/email-templates";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM || "noreply@example.com",
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        const { subject, html } = getMagicLinkEmail(url);

        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${provider.apiKey}`,
            },
            body: JSON.stringify({
              from: provider.from,
              to: email,
              subject,
              html,
            }),
          });
        } catch (error) {
          console.error("Failed to send email:", error);
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: "/signin",
    verifyRequest: "/verify-request",
    error: "/auth/error",
  },
  session: {
    strategy: "database",
  },
});
```

---

## Error Handling & Validation

### Form Validation Strategy

**Client-Side**: Use `zod` for schema validation + React Hook Form (optional, or plain React state)

**Server-Side**: Always validate with `zod` in API routes (never trust client)

### Validation Schemas

Create `/lib/validations.ts`:

```typescript
import { z } from "zod";

export const createCommunitySchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  slug: z.string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().max(5000).optional(),
  isPublic: z.boolean().default(true),
});

export const createEventSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(5000).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  timezone: z.string(),
  location: z.string().max(500).optional(),
  virtualUrl: z.string().url().optional(),
  capacity: z.number().int().positive().optional(),
}).refine(
  (data) => !data.endTime || new Date(data.endTime) > new Date(data.startTime),
  { message: "End time must be after start time", path: ["endTime"] }
);

export const rsvpSchema = z.object({
  status: z.enum(["yes", "no", "maybe"]),
});
```

### API Error Response Format

**Standard Error Response**:

```typescript
{
  error: string;        // Human-readable message
  code?: string;        // Machine-readable error code
  field?: string;       // Field name for validation errors
  details?: unknown;    // Additional context (dev only)
}
```

**Status Codes**:
- 400: Bad request (validation errors)
- 401: Unauthorized (not signed in)
- 403: Forbidden (signed in but no permission)
- 404: Not found
- 409: Conflict (duplicate slug, etc.)
- 500: Internal server error

### API Error Handler

Create `/lib/api-errors.ts`:

```typescript
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error("API Error:", error);

  // Zod validation error
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // Prisma unique constraint error
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A record with this value already exists", code: "DUPLICATE" },
        { status: 409 }
      );
    }
  }

  // Custom API error
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  // Unknown error
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
```

**Usage in API Routes**:

```typescript
import { auth } from "@/lib/auth";
import { handleApiError, ApiError } from "@/lib/api-errors";
import { createCommunitySchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("You must be signed in", 401, "UNAUTHORIZED");
    }

    const body = await request.json();
    const data = createCommunitySchema.parse(body); // Throws ZodError if invalid

    // Create community...

    return NextResponse.json(community, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Error Boundaries

**App-Level Error Boundary** (`/app/error.tsx`):

```typescript
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
        <p className="text-gray-600 mb-6">{error.message}</p>
        <button
          onClick={reset}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
```

**Global Not Found** (`/app/not-found.tsx`):

```typescript
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-6">
          The page you're looking for doesn't exist.
        </p>
        <a href="/" className="text-blue-600 hover:underline">
          Go home
        </a>
      </div>
    </div>
  );
}
```

---

## Testing Strategy

### Manual Testing Checklist

Before deployment, test these critical paths:

**1. Authentication Flow**
- [ ] Sign in with email (receive magic link)
- [ ] Click magic link (redirects to app)
- [ ] Session persists on refresh
- [ ] Sign out works

**2. Community Flow**
- [ ] Create public community
- [ ] Create private community
- [ ] View community page
- [ ] Join public community
- [ ] Leave community
- [ ] View community list (only shows public)

**3. Event Flow**
- [ ] Create event as owner
- [ ] Create event as member
- [ ] RSVP "yes" to event
- [ ] Change RSVP to "no"
- [ ] View event attendee list
- [ ] Respect capacity limits (if set)

**4. Permissions**
- [ ] Non-member can't access private community
- [ ] Non-member can't create event
- [ ] Non-member can't RSVP
- [ ] Member can't edit other's events
- [ ] Owner can edit any event

### Automated Testing (Post-MVP)

**Deferred for MVP** - Focus on manual testing first

Can add later:
- `vitest` for unit tests
- `@testing-library/react` for component tests
- E2E tests with Playwright (optional)

---

## Migration & Seed Data

### Prisma Migration Strategy

**Development Workflow**:

```bash
# Initial setup
npx prisma init
# Edit schema.prisma
npx prisma migrate dev --name init
npx prisma generate

# Schema changes during development
# Edit schema.prisma
npx prisma migrate dev --name add_capacity_to_events
npx prisma generate

# Reset database (when needed)
npx prisma migrate reset  # Drops DB, reruns all migrations, runs seed
```

**Production Workflow**:

```bash
# In CI/CD or before deployment
npx prisma migrate deploy  # Applies pending migrations (no prompts)
```

### Seed Data Script

Create `/prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create test users
  const user1 = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      name: "Alice Johnson",
      emailVerified: new Date(),
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      name: "Bob Smith",
      emailVerified: new Date(),
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: "charlie@example.com" },
    update: {},
    create: {
      email: "charlie@example.com",
      name: "Charlie Davis",
      emailVerified: new Date(),
    },
  });

  // Create communities
  const publicCommunity = await prisma.community.upsert({
    where: { slug: "tech-meetup" },
    update: {},
    create: {
      slug: "tech-meetup",
      name: "Tech Meetup NYC",
      description: "Monthly gatherings for tech enthusiasts in New York City",
      isPublic: true,
      ownerId: user1.id,
    },
  });

  const privateCommunity = await prisma.community.upsert({
    where: { slug: "book-club" },
    update: {},
    create: {
      slug: "book-club",
      name: "Secret Book Club",
      description: "Private book club for close friends",
      isPublic: false,
      ownerId: user2.id,
    },
  });

  // Add members
  await prisma.communityMember.upsert({
    where: {
      communityId_userId: {
        communityId: publicCommunity.id,
        userId: user1.id,
      },
    },
    update: {},
    create: {
      communityId: publicCommunity.id,
      userId: user1.id,
      role: "owner",
    },
  });

  await prisma.communityMember.upsert({
    where: {
      communityId_userId: {
        communityId: publicCommunity.id,
        userId: user2.id,
      },
    },
    update: {},
    create: {
      communityId: publicCommunity.id,
      userId: user2.id,
      role: "member",
    },
  });

  await prisma.communityMember.upsert({
    where: {
      communityId_userId: {
        communityId: privateCommunity.id,
        userId: user2.id,
      },
    },
    update: {},
    create: {
      communityId: privateCommunity.id,
      userId: user2.id,
      role: "owner",
    },
  });

  // Create events
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 14); // 2 weeks from now

  const event1 = await prisma.event.create({
    data: {
      communityId: publicCommunity.id,
      creatorId: user1.id,
      title: "React 19 Deep Dive",
      description: "Join us for an exploration of React 19's new features",
      startTime: futureDate,
      timezone: "America/New_York",
      location: "123 Tech Street, New York, NY 10001",
      capacity: 30,
    },
  });

  const virtualDate = new Date();
  virtualDate.setDate(virtualDate.getDate() + 7); // 1 week from now

  const event2 = await prisma.event.create({
    data: {
      communityId: publicCommunity.id,
      creatorId: user2.id,
      title: "Virtual Coffee Chat",
      description: "Casual virtual meetup to discuss latest tech trends",
      startTime: virtualDate,
      timezone: "America/New_York",
      location: "Virtual",
      virtualUrl: "https://meet.google.com/example",
    },
  });

  // Create RSVPs
  await prisma.eventRsvp.create({
    data: {
      eventId: event1.id,
      userId: user1.id,
      status: "yes",
    },
  });

  await prisma.eventRsvp.create({
    data: {
      eventId: event1.id,
      userId: user2.id,
      status: "yes",
    },
  });

  await prisma.eventRsvp.create({
    data: {
      eventId: event2.id,
      userId: user2.id,
      status: "maybe",
    },
  });

  console.log("Seed completed successfully!");
  console.log({
    users: [user1.email, user2.email, user3.email],
    communities: [publicCommunity.slug, privateCommunity.slug],
    events: [event1.title, event2.title],
  });
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Add to package.json**:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "scripts": {
    "db:seed": "prisma db seed",
    "db:reset": "prisma migrate reset",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  },
  "devDependencies": {
    "tsx": "^4.7.0"
  }
}
```

**Run Seed**:
```bash
npm run db:seed
```

---

## File Structure

```
/app
  /api
    /auth
      /[...nextauth]
        route.ts
    /communities
      route.ts                    # POST create
      /[slug]
        /join
          route.ts               # POST join
        /leave
          route.ts               # POST leave
        /members
          /[userId]
            route.ts             # DELETE remove member
    /events
      route.ts                   # POST create
      /[id]
        route.ts                 # PATCH edit, DELETE delete
        /rsvp
          route.ts               # POST/PATCH RSVP
  /c
    /[slug]
      page.tsx                   # Community detail
      /events
        /new
          page.tsx               # Create event form
  /communities
    page.tsx                     # Community listing
    /new
      page.tsx                   # Create community form
  /events
    /[id]
      page.tsx                   # Event detail
      /edit
        page.tsx                 # Edit event form
  /signin
    page.tsx                     # Sign in page
  /verify-request
    page.tsx                     # Check email page
  layout.tsx
  page.tsx                       # Homepage
  error.tsx
  not-found.tsx

/lib
  auth.ts                        # Auth.js config
  prisma.ts                      # Prisma client singleton
  permissions.ts                 # Authorization helpers
  queries.ts                     # Database query helpers (RSVP, attendees)
  validations.ts                 # Zod schemas
  api-errors.ts                  # Error handling
  email-templates.ts             # Email HTML

/prisma
  schema.prisma
  seed.ts

/components
  /ui
    (shadcn/ui components)
  nav.tsx
  community-card.tsx
  event-card.tsx
  rsvp-button.tsx
  member-list.tsx
```

---

## Pages

### Public Pages

**Homepage** (`/`):
- Hero section with value proposition
- Call to action: "Browse Communities" or "Sign In"
- Brief feature overview
- No auth required

**Sign In** (`/signin`):
- Email input form
- Submit triggers magic link email
- Redirect to `/verify-request`

**Verify Request** (`/verify-request`):
- "Check your email" message
- Instructions to click magic link

**Community Detail** (`/c/[slug]`):
- Community info (name, description, owner)
- Member count, event count
- "Join" button (if not member)
- List of upcoming events
- If private and not member: "Private community" message

**Community Listing** (`/communities`):
- Grid/list of public communities
- Sort by most recent
- Simple pagination or "Load more"

### Authenticated Pages

**Create Community** (`/communities/new`):
- Form: name, slug, description, public/private toggle
- Auto-generate slug from name (editable)
- Submit creates community, redirects to `/c/[slug]`

**Create Event** (`/c/[slug]/events/new`):
- Form: title, description, date/time, timezone, location, virtual URL, capacity
- Date/time picker with timezone selector
- Submit creates event, redirects to `/events/[id]`

**Event Detail** (`/events/[id]`):
- Event info (title, description, date/time, location/link)
- RSVP buttons ("Going", "Not Going")
- Attendee list with RSVP status
- "Edit" button (if owner/creator)
- Capacity indicator (if set)

**Edit Event** (`/events/[id]/edit`):
- Same form as create, pre-filled
- Only accessible to owner or creator

---

## API Routes

### Communities

**POST `/api/communities`**
- Create new community
- Auth: Required
- Body: `{ name, slug, description?, isPublic? }`
- Returns: Community object
- Errors: 401 (not signed in), 409 (slug taken), 400 (validation)

**POST `/api/communities/[slug]/join`**
- Join community as member
- Auth: Required
- Body: None
- Returns: CommunityMember object
- Errors: 401, 404 (community not found), 409 (already member)

**POST `/api/communities/[slug]/leave`**
- Leave community
- Auth: Required
- Body: None
- Returns: Success message
- Errors: 401, 404, 403 (owner can't leave)

**DELETE `/api/communities/[slug]/members/[userId]`**
- Remove member from community
- Auth: Required (must be owner)
- Body: None
- Returns: Success message
- Errors: 401, 403 (not owner), 404

### Events

**POST `/api/events`**
- Create new event
- Auth: Required (must be community member)
- Body: `{ communityId, title, description?, startTime, endTime?, timezone, location?, virtualUrl?, capacity? }`
- Returns: Event object
- Errors: 401, 403 (not member), 400 (validation)

**PATCH `/api/events/[id]`**
- Edit event
- Auth: Required (must be owner or creator)
- Body: Same as POST (partial)
- Returns: Updated event object
- Errors: 401, 403 (not authorized), 404, 400

**DELETE `/api/events/[id]`**
- Delete event
- Auth: Required (must be owner or creator)
- Body: None
- Returns: Success message
- Errors: 401, 403, 404

**POST `/api/events/[id]/rsvp`**
- RSVP to event (or update existing RSVP)
- Auth: Required (must be community member)
- Body: `{ status: "yes" | "no" | "maybe" }`
- Returns: EventRsvp object
- Errors: 401, 403 (not member), 404, 400 (event full)

---

## Deployment

### Pre-Deployment Checklist

**Before First Deploy**:
1. [ ] Set all environment variables in hosting platform
2. [ ] Run `prisma migrate deploy` to create tables
3. [ ] Verify DATABASE_URL points to production Neon DB
4. [ ] Verify Resend API key is production key
5. [ ] Verify EMAIL_FROM domain is verified in Resend
6. [ ] Test magic link email delivery
7. [ ] Create initial community via seed or UI
8. [ ] Test full user flow end-to-end

### Fly.io Configuration

**Example `fly.toml`**:

```toml
app = "hive-community"
primary_region = "ewr"

[build]

[env]
  NODE_ENV = "production"
  AUTH_URL = "https://hive-community.fly.dev"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = false
  min_machines_running = 1

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

**Deploy Commands**:
```bash
fly secrets set AUTH_SECRET=xxx
fly secrets set DATABASE_URL=xxx
fly secrets set RESEND_API_KEY=xxx
fly secrets set EMAIL_FROM=xxx

fly deploy
```

### Railway Configuration

**Environment Variables**:
- Add all env vars in Railway dashboard
- Railway auto-detects Next.js and builds correctly

**Deploy**:
```bash
# Connect GitHub repo or use Railway CLI
railway up
```

---

## Key Dependencies

```json
{
  "name": "hive-community",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "next": "16.1.0",
    "react": "19.2.1",
    "react-dom": "19.2.1",
    "@prisma/client": "7.2.0",
    "next-auth": "5.0.0-beta.30",
    "@auth/prisma-adapter": "2.7.4",
    "zod": "4.3.5",
    "react-hook-form": "7.71.1",
    "@hookform/resolvers": "5.2.2",
    "tailwindcss": "4.1.0",
    "lucide-react": "0.562.0",
    "resend": "6.7.0",
    "sonner": "1.7.1",
    "date-fns": "4.1.0"
  },
  "devDependencies": {
    "@types/node": "22.10.2",
    "@types/react": "19.0.6",
    "@types/react-dom": "19.0.2",
    "typescript": "5.9.3",
    "prisma": "7.2.0",
    "tsx": "4.19.2"
  }
}
```

### Version Highlights (January 2025)

- **Next.js 16.1**: Latest stable with 10-14x faster dev startup (Turbopack caching), 20MB smaller package, security patches
- **React 19.2**: Stable release with Server Components and Server Actions
- **Prisma 7.2**: Rust-free client, significant performance improvements
- **Tailwind 4.1**: 5x faster full builds, 100x faster incremental builds, Oxide engine
- **Zod 4.3**: 14x faster string parsing, 7x faster arrays, smaller bundle
- **Auth.js beta.30**: Production-ready v5 beta with modern API
- **React Hook Form 7.71**: Latest stable with excellent performance
- **lucide-react 0.562**: Latest icon library with 1000+ icons
- **Resend 6.7**: Latest email API SDK
- **sonner 1.7**: Toast notifications (recommended by shadcn/ui)
- **date-fns 4.1**: Lightweight date utility library

---

## MVP Principles

### In Scope
- Passwordless authentication via magic links
- Public and private communities
- Community discovery (public only)
- Join/leave communities
- Create events (owner and members)
- RSVP to events (yes/no/maybe)
- Basic permissions (owner vs member)
- Event capacity limits
- Timezone support

### Out of Scope (Post-MVP)
- Chat functionality (add with Ably later)
- Notifications (email/push)
- Advanced roles (moderator, admin, etc.)
- Search/filtering
- Community categories/tags
- Event comments
- User profiles/bio
- Image uploads
- Social features (follow, like, etc.)
- Analytics/insights
- Mobile apps
- SSO/OAuth providers

### Core User Flow
1. User visits homepage
2. Browses public communities
3. Signs in with email (magic link)
4. Joins community
5. Views upcoming events
6. RSVPs to event
7. Receives event details (in app, no email yet)

---

## Implementation Invariants

These are critical rules that must be maintained throughout the codebase to ensure data consistency and correct behavior:

### 1. Owner Membership Invariant
**Rule**: Community owners MUST have a corresponding CommunityMember record with role="owner"

**Enforcement**: Create owner membership in the same transaction as community creation
```typescript
// CORRECT - atomic transaction
const community = await prisma.community.create({...});
await prisma.communityMember.create({
  communityId: community.id,
  userId: ownerId,
  role: "owner"
});
```

**Why**: Prevents ownership/membership drift and simplifies permission checks

### 2. Slug Immutability
**Rule**: Community slugs CANNOT be changed after creation

**Enforcement**:
- No UPDATE endpoint for slug field
- Schema comment marks it as immutable
- Frontend does not expose rename functionality

**Why**: Prevents broken links, SEO issues, and URL redirect complexity

### 3. Event Visibility Inheritance
**Rule**: Events inherit visibility from their parent community
- Public community events: Viewable by anyone, RSVP requires membership
- Private community events: Viewable and RSVP-able only by members

**Enforcement**: Check community membership in permission helpers

**Why**: Simplifies mental model and prevents permission confusion

### 4. Capacity Enforcement (Best-Effort)
**Rule**: Event capacity is enforced best-effort and may allow rare overbooking under extreme concurrency

**Acceptance Criteria**:
- Race window is tiny (milliseconds)
- Worst case: 1-2 extra attendees beyond capacity
- Can be hardened post-MVP with database transactions or locking

**Why**: Acceptable tradeoff for MVP simplicity vs. complexity of pessimistic locking

### 5. RSVP History Preservation
**Rule**: RSVPs use status updates ("no") rather than deletion to preserve history

**Enforcement**:
- Update EventRsvp.status instead of deleting records
- Always filter by `status = "yes"` when querying attendees or checking capacity

**Query Pattern**:
```typescript
// CORRECT - filter by status
const attendees = await prisma.eventRsvp.findMany({
  where: { eventId, status: "yes" }
});

// INCORRECT - don't just fetch all RSVPs
const attendees = await prisma.eventRsvp.findMany({
  where: { eventId } // Missing status filter!
});
```

**Why**: Preserves analytics, allows "changed their mind" tracking, enables future features

### 6. Event Ownership on Member Removal
**Rule**: When a member is removed, their events transfer to the community owner (not deleted)

**Enforcement**: In member removal endpoint, update event creatorId before deleting membership
```typescript
// Transfer ownership first
await prisma.event.updateMany({
  where: { communityId, creatorId: memberUserId },
  data: { creatorId: ownerId }
});
// Then delete membership
await prisma.communityMember.delete({...});
```

**Why**: Preserves scheduled events, less disruptive to community, gives owner full control

### 7. RSVP States (Schema vs UI)
**Rule**: Schema and API support three states (yes/no/maybe), but UI only exposes two (yes/no) in MVP

**Implementation**:
- API accepts and validates `["yes", "no", "maybe"]`
- Frontend only sends "yes" or "no"
- "Maybe" button can be added to UI later with zero backend changes

**Why**: Future-proofs API while keeping MVP UI simple

---

## Summary of Key Decisions

1. **Database**: Prisma with Neon Postgres, comprehensive indexes, no soft deletes for MVP
2. **Community Access**: Public communities in listings, private accessible via link only, auto-approve joins
3. **Community Slugs**: Immutable after creation (no rename feature in MVP)
4. **Owner Membership**: Community owners must have CommunityMember record with role="owner" (enforced atomically)
5. **Event Visibility**: Inherits from community (public events viewable by all, RSVP requires membership)
6. **Event Timezone**: Store UTC, display in user's local timezone using Intl API
7. **Event Capacity**: Optional integer field, best-effort enforcement (rare overbooking acceptable)
8. **RSVP States**: Three states (yes/no/maybe) in schema/API, UI shows yes/no buttons in MVP
9. **RSVP History**: Status updates rather than deletion (preserves analytics)
10. **Member Removal**: Events transfer to community owner (not deleted)
11. **Permissions**: Members can create events, only owner/creator can edit, owner can remove members
12. **Email**: Resend for production, simple HTML templates, magic links with 24hr expiry
13. **Validation**: Zod schemas on both client and server, standardized error responses
14. **Testing**: Manual checklist for MVP, automated tests post-MVP
15. **Query Helpers**: Centralized RSVP filtering functions to ensure consistency

---

## Next Steps

1. **Setup Project**
   - Initialize Next.js project with TypeScript
   - Install dependencies
   - Configure Prisma with Neon Postgres
   - Setup Auth.js with Resend

2. **Database & Auth**
   - Create and run migrations
   - Test magic link authentication
   - Implement permission helpers

3. **Core Features**
   - Build community creation and discovery
   - Implement join/leave flow
   - Build event creation and RSVP
   - Add authorization checks

4. **Testing & Polish**
   - Run through manual testing checklist
   - Add error boundaries
   - Test edge cases (capacity limits, timezones)

5. **Deploy**
   - Configure Fly.io or Railway
   - Set environment variables
   - Run production migrations
   - Test full flow in production

6. **Post-MVP** (Future)
   - Add chat functionality (Ably)
   - Email notifications for events
   - Advanced moderation tools
   - Search and filtering

---

## Visual Design & Styling

### Styling Technology Stack

**CSS Framework: Tailwind CSS 4.1**

**Rationale**:
- Native integration with Next.js 16
- **5x faster full builds, 100x faster incremental builds** with Oxide engine
- Excellent mobile-first responsive utilities
- **Zero configuration** required (CSS-based theming)
- Zero runtime overhead (purged in production)
- Massive community, extensive documentation
- Modern CSS features (cascade layers, @property, color-mix())
- Perfect for prototyping and rapid iteration

**Component Library: shadcn/ui (with Tailwind v4 support)**

**Rationale**:
- Copy-paste approach = full control, no package bloat
- Built on Radix UI primitives (accessibility built-in)
- Works seamlessly with Tailwind CSS v4
- Beautiful, modern components out of the box
- Customizable to your design system
- Excellent form components (crucial for forms)
- Active maintenance and community

**Form Handling: React Hook Form 7.71 + Zod 4.3**

**Rationale**:
- Zod 4.3 with **14x faster string parsing**, 7x faster arrays
- React Hook Form 7.71 is lightweight and performant
- Native TypeScript support with improved type inference
- Minimal re-renders
- Easy integration with shadcn/ui form components via @hookform/resolvers

**Icon Library: Lucide React 0.562**

**Rationale**:
- Modern, consistent icon set
- Tree-shakeable (only import what you use)
- shadcn/ui uses Lucide by default
- 1000+ icons covering all MVP needs
- Latest version with newest icon additions

**Installation**:

```bash
# Create Next.js 16 app with Tailwind
npx create-next-app@16.1 hive-community --typescript --tailwind --app --turbopack

cd hive-community

# Install core dependencies
npm install next@16.1.0 react@19.2.1 react-dom@19.2.1

# Install database & auth
npm install prisma@7.2.0 @prisma/client@7.2.0
npm install next-auth@beta @auth/prisma-adapter@2.7.4

# Install form handling & validation
npm install zod@4.3.5 react-hook-form@7.71.1 @hookform/resolvers@5.2.2

# Install UI & utilities
npm install lucide-react@0.562.0
npm install resend@6.7.0
npm install sonner@1.7.1
npm install date-fns@4.1.0

# Upgrade Tailwind to v4.1 (if needed)
npm install tailwindcss@4.1.0

# Install dev dependencies
npm install -D typescript@5.9.3 tsx@4.19.2
npm install -D @types/node@22 @types/react@19 @types/react-dom@19

# Initialize shadcn/ui
npx shadcn@latest init
```

### Design System Specification

**Tailwind v4 Configuration**

Tailwind v4 uses CSS-based configuration instead of JavaScript. All design tokens are defined in your `app/globals.css` file using the `@theme` directive.

**Complete globals.css:**

```css
@import "tailwindcss";

@theme {
  /* Font Family */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;

  /* Primary Colors (Community & Action) */
  --color-primary-50: #eff6ff;   /* Very light blue */
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;  /* Main brand color */
  --color-primary-600: #2563eb;  /* Hover states */
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;

  /* Neutral Colors (UI Structure) */
  --color-neutral-50: #fafafa;   /* Backgrounds */
  --color-neutral-100: #f5f5f5;  /* Card backgrounds */
  --color-neutral-200: #e5e5e5;  /* Borders */
  --color-neutral-300: #d4d4d4;
  --color-neutral-400: #a3a3a3;
  --color-neutral-500: #737373;  /* Secondary text */
  --color-neutral-600: #525252;
  --color-neutral-700: #404040;
  --color-neutral-800: #262626;
  --color-neutral-900: #171717;  /* Primary text */

  /* Semantic Colors */
  --color-success-500: #10b981;  /* Green - "Going" RSVP */
  --color-success-600: #059669;
  --color-success-100: #d1fae5;  /* Success backgrounds */
  --color-success-700: #047857;

  --color-error-500: #ef4444;    /* Red - "Not Going", errors */
  --color-error-600: #dc2626;
  --color-error-50: #fef2f2;     /* Error backgrounds */
  --color-error-200: #fecaca;

  --color-warning-500: #f59e0b;  /* Amber - Capacity warnings */
  --color-warning-600: #d97706;
  --color-warning-100: #fef3c7;

  /* Font Sizes with Line Heights */
  --font-size-xs: 0.75rem;       /* 12px - captions, badges */
  --line-height-xs: 1rem;

  --font-size-sm: 0.875rem;      /* 14px - small text */
  --line-height-sm: 1.25rem;

  --font-size-base: 1rem;        /* 16px - body text */
  --line-height-base: 1.5rem;

  --font-size-lg: 1.125rem;      /* 18px - emphasized text */
  --line-height-lg: 1.75rem;

  --font-size-xl: 1.25rem;       /* 20px - card titles */
  --line-height-xl: 1.75rem;

  --font-size-2xl: 1.5rem;       /* 24px - section headings */
  --line-height-2xl: 2rem;

  --font-size-3xl: 1.875rem;     /* 30px - page titles */
  --line-height-3xl: 2.25rem;

  --font-size-4xl: 2.25rem;      /* 36px - hero headings */
  --line-height-4xl: 2.5rem;

  --font-size-5xl: 3rem;         /* 48px - homepage hero */
  --line-height-5xl: 1;

  /* Border Radius */
  --radius-sm: 0.25rem;          /* 4px - small elements */
  --radius: 0.5rem;              /* 8px - buttons, inputs */
  --radius-md: 0.625rem;         /* 10px - cards */
  --radius-lg: 0.75rem;          /* 12px - modals */
  --radius-xl: 1rem;             /* 16px - large cards */
  --radius-full: 9999px;         /* Pills, avatars */

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

  /* Breakpoints (Tailwind defaults) */
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}
```

**Important Notes:**
- **No tailwind.config.js needed** - Tailwind v4 eliminates the JavaScript config file
- All customization happens in CSS using `@theme`
- Design tokens are CSS custom properties for maximum flexibility
- Automatic content detection (no manual content paths)

**Spacing Scale**

Use Tailwind's default spacing (4px base unit):
```
0.5 = 2px   (tight gaps)
1   = 4px   (minimal spacing)
2   = 8px   (compact)
3   = 12px  (default gap)
4   = 16px  (card padding)
6   = 24px  (section spacing)
8   = 32px  (large gaps)
12  = 48px  (section dividers)
16  = 64px  (page sections)
```

**Usage Examples:**

```tsx
// Same Tailwind classes work with v4
<div className="flex gap-4 p-6 rounded-lg shadow-md bg-white border border-neutral-200">
  <button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg">
    Submit
  </button>
</div>
```

### Page Designs

#### 1. Homepage (`/`)

**Layout Structure**:
- Navigation bar (sticky)
- Hero section (centered, max-w-4xl)
- Feature highlights (3-column grid)
- Footer (minimal)

**Hero Section**:
- Container: `max-w-4xl mx-auto px-4 py-16 md:py-24 text-center`
- Heading: `text-4xl md:text-5xl font-bold text-neutral-900 leading-tight`
  - Text: "Build Communities. Connect People."
- Subheading: `text-lg md:text-xl text-neutral-600 mt-6 max-w-2xl mx-auto`
  - Text: "Create public or private communities, organize events, and bring people together."
- CTA Buttons:
  - Primary: `bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold shadow-md`
    - Text: "Browse Communities"
  - Secondary: `bg-white hover:bg-neutral-50 text-neutral-900 px-8 py-3 rounded-lg font-semibold border-2 border-neutral-200`
    - Text: "Sign In"
  - Layout: `flex gap-4 justify-center` (horizontal on desktop, stack on mobile)

**Feature Highlights** (3 columns):
- Container: `max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-8`
- Each Feature Card:
  - Icon: Lucide icon in `text-primary-600` at 32px
  - Title: `text-xl font-semibold text-neutral-900 mt-4`
  - Description: `text-neutral-600 mt-2`
  - Examples: "Create Communities", "Organize Events", "Stay Connected"

**Mobile Differences**:
- Hero heading smaller (`text-4xl` vs `text-5xl`)
- CTA buttons stack vertically
- Feature grid becomes single column
- Reduced padding

#### 2. Sign In Page (`/signin`)

**Layout**:
- Centered card on full-height page
- Container: `min-h-screen flex items-center justify-center px-4`
- Card: `max-w-md w-full bg-white rounded-xl shadow-lg p-8`

**Form Elements**:
- Heading: `text-2xl font-bold text-neutral-900 text-center`
- Label: `text-sm font-medium text-neutral-700 mb-2 block`
- Input:
  ```
  w-full px-4 py-3 border border-neutral-300 rounded-lg
  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
  ```
- Submit Button:
  ```
  w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg
  font-semibold disabled:opacity-50
  ```
  - Text: "Send Magic Link"
  - Loading state: Spinner + "Sending..."

**Visual Feedback**:
- Error: Red border (`border-error-500`), red text below
- Success: Green checkmark, redirect message

#### 3. Community Discovery (`/communities`)

**Layout**:
- Page header with title and "Create Community" button
- Community grid (responsive: 1 col mobile, 2 col tablet, 3 col desktop)

**Page Header**:
- Container: `max-w-7xl mx-auto px-4 py-8`
- Layout: `flex justify-between items-center`
- Title: `text-3xl font-bold text-neutral-900`
- Create Button:
  ```
  bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg
  font-semibold flex items-center gap-2
  ```

**Community Card**:
- Grid: `grid gap-6 md:grid-cols-2 lg:grid-cols-3`
- Card:
  ```
  bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow
  border border-neutral-200 p-6
  ```
- Content:
  - Name: `text-xl font-semibold text-neutral-900 mb-2`
  - Badge (Public): `bg-primary-100 text-primary-700 text-xs font-medium px-2.5 py-0.5 rounded-full`
  - Description: `text-neutral-600 text-sm line-clamp-3 mb-4`
  - Stats: `flex items-center gap-4 text-sm text-neutral-500`
    - Members count (Users icon)
    - Events count (Calendar icon)
  - View button: `text-primary-600 hover:text-primary-700 font-medium`

**Hover State**: `hover:shadow-lg hover:-translate-y-0.5 transition-all`

**Empty State**:
- Large icon (64px) in `text-neutral-300`
- Text: "No public communities yet"
- CTA: "Create Community" button

**Loading State**: Skeleton cards with `animate-pulse`

#### 4. Community Detail (`/c/[slug]`)

**Layout**:
- Community header (name, description, stats)
- Join/Leave button
- Tabs: Events | Members
- Event list

**Community Header**:
- Container: `max-w-4xl mx-auto px-4 py-8`
- Name: `text-3xl md:text-4xl font-bold text-neutral-900 mb-3`
- Badge:
  - Public: `bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium`
  - Private: `bg-neutral-200 text-neutral-700 px-3 py-1 rounded-full text-sm font-medium` + Lock icon
- Description: `text-neutral-700 text-lg mt-4 leading-relaxed`
- Stats Row: `flex items-center gap-6 mt-6 text-neutral-600`
  - Members, events, owner, created date (each with icon)

**Join/Leave Button**:
- Join: `bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold shadow-md`
- Leave: `bg-white hover:bg-neutral-50 text-neutral-700 px-8 py-3 rounded-lg font-semibold border-2 border-neutral-300`

**Tabs**:
- Container: `border-b border-neutral-200 mb-8`
- Tab: `px-6 py-3 font-medium text-neutral-600`
- Active: `text-primary-600 border-b-2 border-primary-600`

**Event List**:
- Each event: Card with hover state
- Layout: `bg-white border border-neutral-200 rounded-lg p-6 hover:shadow-md cursor-pointer`
- Title: `text-xl font-semibold text-neutral-900`
- Date: `flex items-center gap-2 text-neutral-600 mt-2` with Calendar icon
- Location: MapPin or Video icon
- Attendees: `flex items-center gap-2 mt-3 text-sm text-neutral-600`
- RSVP badge: Color-coded (going = green, not going = gray)

**Private Lock State** (non-members):
- Blur events list
- Large Lock icon at center
- Message: "This is a private community"
- CTA: "Join to see events"

**Create Event Button** (members only):
- Position: Top-right of events section
- Style: Primary button with Plus icon

#### 5. Create Community Form (`/communities/new`)

**Layout**:
- Centered form card (max-w-2xl)
- Container: `min-h-screen flex items-center justify-center px-4 py-12`
- Card: `max-w-2xl w-full bg-white rounded-xl shadow-lg p-8`

**Form Fields**:

1. **Community Name**
   - Standard text input
   - Helper text: "This will be shown to everyone"
   - Validation errors shown in red below

2. **Slug**
   - Input with prefix showing "/c/"
   - Prefix: `bg-neutral-100 px-3 py-3 text-neutral-600 text-sm`
   - Helper: "Cannot be changed later. Use lowercase, numbers, and hyphens."
   - Auto-generate button

3. **Description** (optional)
   - Textarea: `min-h-32 resize-none`
   - Character count in bottom-right

4. **Visibility Toggle**
   - shadcn/ui Switch component
   - Container: `flex items-center justify-between p-4 bg-neutral-50 rounded-lg`
   - Public: Globe icon, "Anyone can discover and view"
   - Private: Lock icon, "Only members can view (shareable link)"

**Submit Section**:
- Buttons: `flex gap-3`
- Submit: `bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold`
- Cancel: `bg-white hover:bg-neutral-50 text-neutral-700 px-8 py-3 rounded-lg border border-neutral-300`

#### 6. Event Detail (`/events/[id]`)

**Layout**:
- Event header (title, date/time, location)
- RSVP buttons
- Description section
- Attendee list

**Event Header**:
- Container: `max-w-3xl mx-auto px-4 py-8 text-center`
- Breadcrumb: `text-sm text-neutral-600 mb-4`
- Title: `text-3xl md:text-4xl font-bold text-neutral-900 mb-6`
- Date/Time Block:
  ```
  bg-neutral-50 rounded-lg p-6 max-w-md mx-auto
  ```
  - Primary date: `text-2xl font-semibold text-neutral-900`
  - Time: `text-lg text-neutral-700 mt-2`
  - Timezone hint: `text-sm text-neutral-500 mt-2`

**Location/Virtual**:
- Physical: MapPin icon + full address
- Virtual: Video icon + link (clickable, styled as primary link)

**RSVP Section**:
- Container: `max-w-3xl mx-auto px-4 py-8 border-y border-neutral-200`
- Button Group: `flex gap-3 justify-center`
- Going Button:
  - Default: `bg-success-600 hover:bg-success-700 text-white px-8 py-3 rounded-lg font-semibold`
  - Active: Add `ring-2 ring-success-300`
- Not Going Button:
  - Default: `bg-white hover:bg-neutral-50 text-neutral-700 px-8 py-3 rounded-lg border-2 border-neutral-300`
  - Active: `bg-neutral-200 text-neutral-900`

**Capacity Indicator** (if set):
- Progress bar: `w-full max-w-xs mx-auto bg-neutral-200 rounded-full h-2`
- Fill: `bg-primary-600` with width percentage
- Text: "15 / 30 spots filled"
- Full state: Red color, "Event is full"

**Description**:
- Container: `max-w-3xl mx-auto px-4 py-8`
- Content: `text-neutral-700 leading-relaxed prose prose-neutral`

**Attendee List**:
- Container: `max-w-3xl mx-auto px-4 py-8 bg-neutral-50 rounded-lg`
- Heading: `text-xl font-semibold text-neutral-900 mb-6` - "Attending (15)"
- Grid: `grid gap-3 md:grid-cols-2`
- Attendee Card: `flex items-center gap-3 bg-white p-3 rounded-lg`
  - Avatar: `w-10 h-10 rounded-full bg-primary-100 text-primary-700` (initials)
  - Name: `text-neutral-900 font-medium`

#### 7. Create Event Form (`/c/[slug]/events/new`)

**Layout**: Similar to Create Community form, centered card

**Form Fields**:

1. **Event Title** - Text input
2. **Description** - Textarea (`min-h-40`)
3. **Date Picker** - shadcn/ui Calendar + Popover
4. **Time Pickers** - Start and end time (two columns on desktop)
5. **Timezone Selector** - Dropdown/Combobox
6. **Location Type Toggle** - Radio group (Physical vs Virtual)
   - Physical: Show address input
   - Virtual: Show URL input
7. **Capacity** (optional) - Number input with checkbox "Limit capacity"

**Validation**:
- Start time must be in future
- End time must be after start time
- Virtual URL must be valid
- Show errors inline

#### 8. Navigation

**Top Navigation Bar**:

- Container: `sticky top-0 z-50 bg-white border-b border-neutral-200 px-4 py-3 shadow-sm`
- Inner: `max-w-7xl mx-auto flex items-center justify-between`

**Logo/Brand**:
- Style: `text-xl font-bold text-neutral-900 flex items-center gap-2`
- Icon: Users icon in `text-primary-600`
- Text: "Hive Community"

**Navigation Links** (Desktop):
- Container: `hidden md:flex items-center gap-6`
- Link: `text-neutral-600 hover:text-neutral-900 font-medium`
- Active: `text-primary-600 font-semibold`

**User Menu** (Authenticated):
- Avatar button: `w-9 h-9 rounded-full bg-primary-100 text-primary-700` (initials)
- Dropdown (shadcn/ui Dropdown Menu): Profile, My Communities, Create Community, Sign Out

**Sign In Button** (Not Authenticated):
- Style: `bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-semibold`

**Mobile Menu**:
- Hamburger icon from Lucide
- Drawer (shadcn/ui Sheet) slides from right
- Links: Full-width with larger touch targets

### Common UI Patterns

**Button Variants**:

```typescript
// Primary
"bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md"

// Secondary
"bg-white hover:bg-neutral-50 text-neutral-900 px-6 py-2.5 rounded-lg font-semibold border-2 border-neutral-200"

// Ghost
"text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 px-6 py-2.5 rounded-lg font-medium"

// Danger
"bg-error-600 hover:bg-error-700 text-white px-6 py-2.5 rounded-lg font-semibold"

// Success
"bg-success-600 hover:bg-success-700 text-white px-6 py-2.5 rounded-lg font-semibold"
```

**Card Design**:
```typescript
"bg-white border border-neutral-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
```

**Badge/Tag Variants**:
```typescript
// Primary
"bg-primary-100 text-primary-700 px-2.5 py-0.5 rounded-full text-xs font-medium"

// Success
"bg-success-100 text-success-700 px-2.5 py-0.5 rounded-full text-xs font-medium"

// Neutral
"bg-neutral-100 text-neutral-700 px-2.5 py-0.5 rounded-full text-xs font-medium"
```

**Loading Spinners**:
- Use Lucide `Loader2` icon with `animate-spin`
- Color: `text-primary-600`

**Skeleton Loaders**:
```typescript
"animate-pulse bg-neutral-200 rounded-lg h-32 w-full"
```

**Toast Notifications** (shadcn/ui Sonner):
- Success: Green with checkmark
- Error: Red with alert icon
- Position: Top-right
- Duration: 3-5 seconds

**Empty States**:
- Large icon (64px) in `text-neutral-300`
- Title: `text-xl font-semibold text-neutral-900`
- Description: `text-neutral-600 mt-2`
- CTA: Primary button

**Error States**:
- Alert box: `bg-error-50 border border-error-200 rounded-lg p-4`
- Icon: AlertCircle in `text-error-600`
- Title: `text-error-900 font-semibold`

### Component Library

**Reusable Components to Build**:

1. **Button** - `/components/ui/button.tsx` (from shadcn/ui)
   - Variants: primary, secondary, ghost, danger, success
   - Sizes: sm, md, lg
   - States: default, loading, disabled

2. **Card** - `/components/ui/card.tsx` (from shadcn/ui)
   - Base card with header, content, footer slots

3. **Badge** - `/components/ui/badge.tsx` (from shadcn/ui)
   - Variants: primary, success, warning, error, neutral

4. **CommunityCard** - `/components/community-card.tsx`
   - Props: community data
   - Displays: name, description, stats, owner
   - Clickable navigation

5. **EventCard** - `/components/event-card.tsx`
   - Props: event data, user RSVP status
   - Displays: title, date/time, location, capacity

6. **RsvpButton** - `/components/rsvp-button.tsx`
   - Props: eventId, currentStatus
   - States: going, not going, none
   - Handles API calls and optimistic updates

7. **MemberList** - `/components/member-list.tsx`
   - Props: members array, showRemoveButton (owner only)
   - Grid layout with avatars

8. **NavBar** - `/components/nav.tsx`
   - Responsive with mobile menu
   - Different states for auth/unauth

9. **FormField** - `/components/ui/form.tsx` (from shadcn/ui)
   - Label, input, error, helper text
   - Integrated with React Hook Form

10. **LoadingSpinner** - `/components/ui/spinner.tsx`
    - Centered spinner with optional text

### Accessibility Checklist

**Color Contrast**:
- [ ] All text meets WCAG AA (4.5:1 for normal, 3:1 for large)
- [ ] Primary button contrast passes
- [ ] Link contrast passes
- [ ] Error text contrast passes

**Keyboard Navigation**:
- [ ] All interactive elements focusable via Tab
- [ ] Focus indicators visible (`ring-2 ring-primary-500`)
- [ ] Skip to main content link
- [ ] Modal traps focus, Esc to close
- [ ] Forms submittable with Enter

**Screen Reader Support**:
- [ ] All images have alt text
- [ ] Form inputs have associated labels
- [ ] ARIA labels for icon-only buttons
- [ ] ARIA live regions for dynamic content
- [ ] Semantic HTML (`<nav>`, `<main>`, `<article>`)

**Form Accessibility**:
- [ ] Error messages announced with `role="alert"`
- [ ] Required fields marked with `required` attribute
- [ ] Error states have `aria-invalid="true"`
- [ ] Helper text linked with `aria-describedby`

**Focus States**:
```typescript
focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
```

**Motion & Animation**:
- [ ] Respect `prefers-reduced-motion`
  ```css
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

**Mobile Touch Targets**:
- [ ] Minimum 44x44px touch targets
- [ ] Adequate spacing (gap-3 minimum)

### Implementation Priority

**Phase 1: Foundation (Week 1)**
1. Setup & Configuration
   - Initialize Next.js with Tailwind
   - Install shadcn/ui
   - Configure design tokens in tailwind.config.ts
   - Set up component structure

2. Core Components
   - Button (all variants)
   - Card, Badge
   - Form components (Input, Textarea, Label)
   - NavBar (basic version)

3. Basic Pages
   - Homepage (hero + CTA)
   - Sign In page
   - Navigation shell

**Phase 2: Authentication & Discovery (Week 2)**
4. Auth UI
   - Complete sign in flow with visual feedback
   - Verify request page
   - User menu dropdown

5. Community Discovery
   - Community listing page
   - CommunityCard component
   - Empty states, loading skeletons

**Phase 3: Core Features (Week 2-3)**
6. Community Forms
   - Create community form
   - Form validation UI
   - Success/error states

7. Community Detail
   - Community header
   - Join/Leave button with states
   - Event list view, Member list

**Phase 4: Events (Week 3-4)**
8. Event Forms
   - Create event form
   - Date/time picker integration
   - Location/virtual toggle
   - Edit event form

9. Event Detail
   - Event detail page
   - RSVP buttons with states
   - Attendee list
   - Capacity indicator

**Phase 5: Polish (Week 4)**
10. Refinement
    - Toast notifications
    - Error boundaries
    - 404 page styling
    - Mobile responsiveness testing
    - Accessibility audit
    - Loading states for all actions

### Design Aesthetic

**Style**: Modern, Clean, Approachable

**Characteristics**:
- Generous whitespace
- Subtle shadows and borders
- Rounded corners (professional feel)
- Clear hierarchy with typography
- Color used purposefully
- Friendly but not playful

**Visual Inspiration**:
- **Luma** (luma.com) - Event organization, clean cards
- **Partiful** (partiful.com) - Community events, friendly UI
- **Meetup** (meetup.com) - Community discovery
- **Linear** (linear.app) - UI polish, interactions
- **Vercel** - Design system, button styles

**Mood/Tone**: "Friendly and Polished"
- Professional enough for work communities
- Approachable for hobby groups
- Not corporate/sterile
- Not overly casual/playful
- Trustworthy and reliable

**Design Principles**:
1. Clarity over cleverness - Obvious interactions
2. Speed over perfection - Ship MVP, iterate
3. Consistency over variety - Reuse patterns
4. Mobile-first - Design for smallest screen first
5. Accessible by default - Build it in, don't retrofit

### Quick Start Implementation

**Step 1: Initialize Project with Next.js 16 & Tailwind 4**
```bash
npx create-next-app@16.1 hive-community \
  --typescript \
  --tailwind \
  --app \
  --turbopack \
  --use-npm

cd hive-community
```

**Step 2: Install All Dependencies**
```bash
# Core framework
npm install next@16.1.0 react@19.2.1 react-dom@19.2.1

# Database & Auth
npm install prisma@7.2.0 @prisma/client@7.2.0
npm install next-auth@beta @auth/prisma-adapter@2.7.4

# Forms & Validation
npm install zod@4.3.5 react-hook-form@7.71.1 @hookform/resolvers@5.2.2

# UI & Utilities
npm install lucide-react@0.562.0 resend@6.7.0 sonner@1.7.1 date-fns@4.1.0

# Upgrade to Tailwind v4 (if needed)
npm install tailwindcss@4.1.0

# Dev dependencies
npm install -D typescript@5.9.3 tsx@4.19.2 @types/node@22 @types/react@19 @types/react-dom@19
```

**Step 3: Initialize shadcn/ui**
```bash
npx shadcn@latest init

# When prompted, choose:
# - TypeScript: Yes
# - Style: Default
# - Base color: Slate (or your preference)
# - CSS variables: Yes
```

**Step 4: Install shadcn/ui Components**
```bash
npx shadcn@latest add button card badge input label textarea
npx shadcn@latest add form dropdown-menu dialog calendar popover
npx shadcn@latest add sheet toast skeleton
```

**Step 5: Configure app/globals.css (Tailwind v4)**
```css
@import "tailwindcss";

@theme {
  /* Font Family */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;

  /* Primary Colors */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;

  /* Add neutral, success, error, warning colors from Design System above */
  --color-neutral-50: #fafafa;
  --color-neutral-100: #f5f5f5;
  --color-neutral-200: #e5e5e5;
  --color-neutral-300: #d4d4d4;
  --color-neutral-400: #a3a3a3;
  --color-neutral-500: #737373;
  --color-neutral-600: #525252;
  --color-neutral-700: #404040;
  --color-neutral-800: #262626;
  --color-neutral-900: #171717;

  --color-success-500: #10b981;
  --color-success-600: #059669;
  --color-success-100: #d1fae5;

  --color-error-500: #ef4444;
  --color-error-600: #dc2626;
  --color-error-50: #fef2f2;

  /* Add more tokens as needed from Design System section */
}
```

**Step 6: Update postcss.config.mjs (Tailwind v4)**
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

**Step 7: Remove tailwind.config.js/ts (Not needed in v4)**
```bash
rm tailwind.config.ts
# Or if it's .js
rm tailwind.config.js
```

**Step 8: Initialize Prisma**
```bash
npx prisma init

# Copy the schema from the Database Schema section above into prisma/schema.prisma
# Update .env with your DATABASE_URL

npx prisma generate
npx prisma migrate dev --name init
```

**Step 9: Create Base Layout**
```typescript
// /app/layout.tsx
import './globals.css'
import { Inter } from 'next/font/google'
import NavBar from '@/components/nav'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Hive Community',
  description: 'Build communities. Connect people.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NavBar />
        <main>{children}</main>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
```

**Step 10: Create Environment Variables**
```bash
# .env.local
DATABASE_URL="postgresql://..."
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"
NODE_ENV="development"
```

**Step 11: Start Development**
```bash
npm run dev
# Opens http://localhost:3000 with Turbopack (ultra-fast HMR)
```

**Step 12: Build First Page**
Follow the homepage design specs above to create the landing page.

---

## Turbopack Benefits (Next.js 16)

With `--turbopack` flag, you get:
- **10-14x faster** dev server startup
- **100x faster** incremental builds with Tailwind v4
- Sub-second HMR (Hot Module Replacement)
- Better error messages and stack traces

---

## Error Monitoring & Tracking

### Sentry Integration

**Version**: @sentry/nextjs 10.34.0 (Latest stable, January 2025)

**Why Sentry:**
- Real-time error tracking across client, server, and edge runtimes
- Performance monitoring and profiling
- Release tracking and health monitoring
- Session replay for debugging user issues
- Automatic breadcrumbs for context
- Source map support for production debugging
- Native Next.js 16 support with Turbopack

**Installation:**

```bash
# Automated setup (recommended)
npx @sentry/wizard@latest -i nextjs

# Or manual installation
npm install @sentry/nextjs@10.34.0
```

**Configuration:**

The Sentry wizard creates three config files:

**1. `sentry.client.config.ts` (Client-side)**
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 1.0,

  // Session replay for debugging
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

**2. `sentry.server.config.ts` (Server-side)**
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: 1.0,

  enabled: process.env.NODE_ENV === "production",

  // Ignore common non-critical errors
  ignoreErrors: [
    "Non-Error promise rejection captured",
    "ResizeObserver loop limit exceeded",
  ],
});
```

**3. `sentry.edge.config.ts` (Edge runtime)**
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  enabled: process.env.NODE_ENV === "production",
});
```

**4. Update `next.config.mjs`:**
```javascript
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  // Your existing config
};

export default withSentryConfig(nextConfig, {
  org: "your-org",
  project: "hive-community",

  // Upload source maps for better debugging
  silent: !process.env.CI,

  // Disable telemetry
  telemetry: false,

  // Better stack traces
  widenClientFileUpload: true,

  // Tunnel requests to avoid ad-blockers
  tunnelRoute: "/monitoring",

  // Hide source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,
});
```

**5. Environment Variables:**
```bash
# .env.local
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# .env.production (sensitive, don't commit)
SENTRY_AUTH_TOKEN=your-auth-token
```

**Custom Error Boundaries:**

```typescript
// /components/error-boundary.tsx
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
        <p className="text-neutral-600 mb-6">{error.message}</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
```

**Manual Error Tracking:**

```typescript
// In API routes or Server Actions
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  try {
    // Your logic
  } catch (error) {
    // Log to Sentry with context
    Sentry.captureException(error, {
      tags: {
        endpoint: "/api/communities",
        method: "POST",
      },
      user: {
        id: session?.user?.id,
        email: session?.user?.email,
      },
      extra: {
        body: await request.json(),
      },
    });

    throw error;
  }
}
```

**Performance Monitoring:**

```typescript
// Instrument slow operations
import * as Sentry from "@sentry/nextjs";

const transaction = Sentry.startTransaction({
  name: "Create Community",
  op: "http.server",
});

try {
  // Your operation
  const community = await prisma.community.create({...});

  transaction.setStatus("ok");
} catch (error) {
  transaction.setStatus("internal_error");
  throw error;
} finally {
  transaction.finish();
}
```

**Best Practices:**

1. **Source Maps**: Always upload source maps for production debugging
2. **Sampling**: Use lower sampling rates in high-traffic apps to control costs
3. **PII Filtering**: Never send passwords, tokens, or sensitive data
4. **Release Tracking**: Tag releases to track which version caused errors
5. **Alerts**: Set up Sentry alerts for critical errors via Slack/email
6. **Session Replay**: Use sparingly (10% sample) to avoid quota issues
7. **Ignore Non-Critical**: Filter out expected errors (404s, validation failures)

---

## Security

### Security Architecture

The MVP implements defense-in-depth security following OWASP best practices and Next.js 16 security guidelines.

### 1. Authentication Security (Auth.js)

**Built-in Protections:**
- CSRF protection (automatic with Server Actions)
- OAuth state tampering prevention
- Clickjacking protection
- Replay attack mitigation

**Cookie Security:**

```typescript
// /lib/auth.ts
import NextAuth from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // ... other config

  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,   // 24 hours
  },

  pages: {
    signIn: "/signin",
    error: "/auth/error",
  },
});
```

**Environment Variables Security:**

```bash
# CRITICAL: Never commit these to Git
# Use strong, randomly generated secrets

# Generate AUTH_SECRET with:
# openssl rand -base64 32

AUTH_SECRET=your-super-secret-key-minimum-32-chars
NEXTAUTH_SECRET=your-super-secret-key-minimum-32-chars

# Validate environment variables at build time
DATABASE_URL=postgresql://...
RESEND_API_KEY=re_...
```

**Validate Environment Variables:**

```typescript
// /lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url(),
  RESEND_API_KEY: z.string().startsWith("re_"),
  EMAIL_FROM: z.string().email(),
  NODE_ENV: z.enum(["development", "production", "test"]),
});

export const env = envSchema.parse(process.env);
```

### 2. Content Security Policy (CSP)

**Next.js Native CSP Implementation:**

```typescript
// /middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: ${
      process.env.NODE_ENV === "production" ? "" : "'unsafe-eval'"
    };
    style-src 'self' 'nonce-${nonce}' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("Content-Security-Policy", cspHeader);

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
```

### 3. Security Headers

**next.config.mjs:**

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
```

### 4. Input Validation & Sanitization

**Always Validate in Server Actions:**

```typescript
// /lib/actions/communities.ts
"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import { createCommunitySchema } from "@/lib/validations";
import DOMPurify from "isomorphic-dompurify";
import { prisma } from "@/lib/prisma";
import * as Sentry from "@sentry/nextjs";

export async function createCommunity(formData: FormData) {
  try {
    // 1. Verify authentication
    const { userId } = await verifySession();

    // 2. Extract and validate with Zod
    const rawData = {
      name: formData.get("name"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      type: formData.get("type"),
    };

    const data = createCommunitySchema.parse(rawData);

    // 3. Sanitize HTML in description
    if (data.description) {
      data.description = DOMPurify.sanitize(data.description, {
        ALLOWED_TAGS: [], // Strip all HTML for MVP
      });
    }

    // 4. Additional security checks
    if (data.slug.includes("..") || data.slug.includes("/")) {
      return { error: "Invalid slug format" };
    }

    // 5. Create community with owner membership (atomic transaction)
    const community = await prisma.community.create({
      data: {
        ...data,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: "owner",
          },
        },
      },
    });

    revalidatePath("/communities");
    return { success: true, community };
  } catch (error) {
    Sentry.captureException(error);
    if (error instanceof z.ZodError) {
      return { error: "Invalid input", details: error.errors };
    }
    return { error: "Failed to create community" };
  }
}
```

**Install Sanitization Library:**

```bash
npm install isomorphic-dompurify@2.16.0
```

### 5. Rate Limiting

**Install Rate Limiter:**

```bash
npm install @upstash/ratelimit@2.0.4 @upstash/redis@1.34.3
```

**Setup Rate Limiting:**

```typescript
// /lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a rate limiter that allows 10 requests per 10 seconds
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

// Different limits for different endpoints
export const authRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "15 m"), // 3 attempts per 15 minutes
  analytics: true,
  prefix: "@upstash/ratelimit/auth",
});
```

**Apply to Server Actions:**

```typescript
// /lib/actions/communities.ts
"use server";

import { headers } from "next/headers";
import { ratelimit } from "@/lib/rate-limit";
import { verifySession } from "@/lib/dal";

export async function createCommunity(formData: FormData) {
  try {
    // 1. Rate limit by user ID (after auth)
    const { userId } = await verifySession();
    const { success, reset } = await ratelimit.limit(userId);

    if (!success) {
      const waitTime = Math.ceil((reset - Date.now()) / 1000);
      return {
        error: `Rate limit exceeded. Try again in ${waitTime} seconds`
      };
    }

    // 2. Proceed with action logic
    // ... rest of action
  } catch (error) {
    return { error: "Action failed" };
  }
}

// For public endpoints (e.g., sign-in), rate limit by IP
export async function requestMagicLink(email: string) {
  const headersList = headers();
  const ip = headersList.get("x-forwarded-for") ?? "anonymous";

  const { success, reset } = await authRatelimit.limit(ip);

  if (!success) {
    const waitTime = Math.ceil((reset - Date.now()) / 1000);
    return {
      error: `Too many attempts. Try again in ${waitTime} seconds`
    };
  }

  // ... rest of auth logic
}
```

**Environment Variables for Upstash:**

```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### 6. SQL Injection Prevention

**Prisma ORM Protects Against SQL Injection:**

Prisma uses parameterized queries by default, which prevents SQL injection:

```typescript
// ✅ SAFE - Prisma parameterizes automatically
const community = await prisma.community.findUnique({
  where: { slug: userInput },
});

// ❌ NEVER use raw SQL with user input
const result = await prisma.$queryRaw`
  SELECT * FROM communities WHERE slug = ${userInput}
`; // Still safe with Prisma, but avoid raw queries

// ✅ If you must use raw SQL, use Prisma.sql
import { Prisma } from "@prisma/client";
const result = await prisma.$queryRaw(
  Prisma.sql`SELECT * FROM communities WHERE slug = ${userInput}`
);
```

### 7. XSS Prevention

**React & Next.js Built-in Protection:**

React automatically escapes content, but be careful with:

```typescript
// ✅ SAFE - React escapes automatically
<div>{userContent}</div>

// ❌ DANGEROUS - Bypasses React's protection
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ SAFE - Sanitize first if you must use HTML
import DOMPurify from "isomorphic-dompurify";

<div
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(userContent)
  }}
/>
```

### 8. CSRF Protection

**Next.js Server Actions - Automatic Protection:**

Server Actions include CSRF protection automatically:
- Only POST method allowed
- Origin header validation
- Must be same-host as page

**Additional Protection for API Routes:**

```typescript
// /lib/csrf.ts
import { headers } from "next/headers";

export function validateCSRF() {
  const headersList = headers();
  const origin = headersList.get("origin");
  const host = headersList.get("host");

  if (!origin || !host) {
    throw new Error("Missing origin or host header");
  }

  const originUrl = new URL(origin);
  if (originUrl.host !== host) {
    throw new Error("CSRF validation failed");
  }
}

// Use in API routes
export async function POST(request: Request) {
  validateCSRF();
  // ... rest of logic
}
```

### 9. Dependency Security

**Automated Scanning:**

```json
// package.json
{
  "scripts": {
    "security:audit": "npm audit",
    "security:fix": "npm audit fix",
    "security:check": "npx audit-ci --moderate"
  }
}
```

**GitHub Dependabot:**

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "your-username"
    labels:
      - "dependencies"
      - "security"
```

**Snyk Integration:**

```bash
# Install Snyk CLI
npm install -g snyk

# Authenticate
snyk auth

# Test for vulnerabilities
snyk test

# Monitor project
snyk monitor
```

### 10. Secrets Management

**Never Commit Secrets:**

**.gitignore:**
```
.env
.env*.local
.env.production
```

**Validate at Build Time:**

```typescript
// /lib/validate-env.ts
if (process.env.NODE_ENV === "production") {
  const requiredEnvVars = [
    "DATABASE_URL",
    "AUTH_SECRET",
    "RESEND_API_KEY",
  ];

  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}
```

### 11. Data Access Layer (DAL)

**Centralize Data Access:**

```typescript
// /lib/dal.ts - Data Access Layer
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cache } from "react";

export const getSession = cache(async () => {
  return await auth();
});

export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id };
});

// Always check permissions in DAL
export async function getCommunity(slug: string) {
  const session = await getSession();

  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      members: session?.user
        ? {
            where: { userId: session.user.id },
          }
        : false,
    },
  });

  if (!community) {
    throw new Error("Community not found");
  }

  // Check if user can access private community
  if (!community.isPublic && !session?.user) {
    throw new Error("Unauthorized");
  }

  if (!community.isPublic && session?.user) {
    const isMember = community.members?.length > 0;
    if (!isMember) {
      throw new Error("Forbidden");
    }
  }

  // Return DTO (Data Transfer Object) - never full objects
  return {
    id: community.id,
    slug: community.slug,
    name: community.name,
    description: community.description,
    isPublic: community.isPublic,
    isMember: !!session?.user && community.members?.length > 0,
  };
}
```

### Security Checklist

**Pre-Launch:**
- [ ] All environment variables validated and secured
- [ ] AUTH_SECRET is strong (minimum 32 characters)
- [ ] CSP headers configured
- [ ] Rate limiting implemented on all public endpoints
- [ ] Input validation on all API routes
- [ ] XSS protection verified (no dangerouslySetInnerHTML without sanitization)
- [ ] HTTPS enforced in production
- [ ] Security headers configured
- [ ] Sentry error tracking enabled
- [ ] npm audit shows no high/critical vulnerabilities
- [ ] .env files in .gitignore
- [ ] Data Access Layer implemented for sensitive operations
- [ ] Session timeouts configured
- [ ] CORS properly configured (if needed)

**Ongoing:**
- [ ] Weekly dependency updates via Dependabot
- [ ] Monthly security audits
- [ ] Review Sentry errors daily
- [ ] Update Auth.js when security patches released
- [ ] Monitor rate limit metrics
- [ ] Review access logs for suspicious activity

### Additional Dependencies

```bash
# Security & monitoring
npm install @sentry/nextjs@10.34.0
npm install isomorphic-dompurify@2.16.0
npm install @upstash/ratelimit@2.0.4 @upstash/redis@1.34.3

# Update package.json
```

---

## Stack Performance Improvements

The updated stack (January 2025) provides significant performance improvements over previous versions:

### Build & Development Speed
- **Next.js 16.1**: 10-14x faster dev server startup with Turbopack file caching
- **Tailwind 4.1**: 100x faster incremental builds, 5x faster full builds
- **Combined**: Sub-second HMR, microsecond-level CSS rebuilds

### Runtime Performance
- **React 19.2**: Stable Server Components, optimized reconciliation
- **Prisma 7.2**: Rust-free client, smaller bundle, faster queries
- **Zod 4.3**: 14x faster string parsing, 7x faster array validation

### Developer Experience
- **Zero config**: Tailwind v4 eliminates config files
- **Automatic content detection**: No manual paths needed
- **Better TypeScript**: Improved inference in React Hook Form + Zod
- **Modern CSS**: Native cascade layers, @property, color-mix()

### Package Size Reductions
- Next.js: 20MB smaller (faster CI/CD)
- Prisma: Rust-free means smaller install
- Zod: Reduced bundle size with tree-shaking

---

## Migration Notes from Original Plan

If you started with the earlier recommended versions, here are the key changes:

### Next.js 14 → 16
- Update to App Router if not already using
- Turbopack is now stable (use `--turbopack` flag)
- New `next upgrade` command for easy updates
- Breaking changes are minimal

### Tailwind v3 → v4
- **Major change**: Move config from `tailwind.config.ts` to CSS `@theme`
- Remove JavaScript config file entirely
- Update `@import "tailwindcss"` in globals.css
- Class names remain the same
- Automatic content detection (no manual paths)

### Prisma 5 → 7
- Rust-free client (smaller, easier install)
- No breaking changes in schema syntax
- Faster query execution
- Better error messages

### Zod 3 → 4
- 14x performance improvement
- API mostly backward compatible
- Better TypeScript inference
- Smaller bundle size

---

This document serves as the complete blueprint for building the MVP. All architectural decisions have been made to prioritize simplicity, developer experience, and rapid iteration with the latest stable technologies (January 2025).
