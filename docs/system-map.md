# System Architecture Map

**Generated**: 2026-01-30
**Stack**: Next.js 16.1 / React 19 / Prisma 7 / PostgreSQL (Neon) / Ably / NextAuth 5

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ React 19 UI  │  │ Ably Client  │  │  Form State  │  │ Optimistic   │ │
│  │ (RSC + CC)   │  │ (Real-time)  │  │ (Hook Form)  │  │    State     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           EDGE / MIDDLEWARE                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ middleware.ts: CSP headers, auth redirect, nonce generation       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              SERVER                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ App Router   │  │   Server     │  │     DAL      │  │ Rate Limit   │ │
│  │ (pages/api)  │  │   Actions    │  │ (session)    │  │  (Upstash)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   lib/db/*   │  │ Ably Server  │  │   NextAuth   │  │   Sentry     │ │
│  │  (queries)   │  │  (publish)   │  │   (auth.ts)  │  │  (errors)    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ PostgreSQL │  │   Ably     │  │  Resend    │  │ Backblaze  │        │
│  │   (Neon)   │  │ (realtime) │  │  (email)   │  │ B2 (files) │        │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Layout Hierarchy

```
app/layout.tsx (Root)
├── app/(auth)/layout.tsx         → Sign-in, verify-request, auth-error
├── app/(public)/layout.tsx       → Public explore pages, landing
├── app/(app)/layout.tsx          → Authenticated app shell
│   └── app/(app)/communities/[slug]/layout.tsx → Community-scoped pages
├── app/(admin)/admin/layout.tsx  → Admin dashboard
└── app/u/layout.tsx              → Public user profiles
```

### Layout Responsibilities

| Layout | Auth Required | Features |
|--------|--------------|----------|
| `(auth)` | No | Minimal chrome, centered forms |
| `(public)` | No | Public header, explore navigation |
| `(app)` | Yes | Full header, user dropdown, notifications |
| `communities/[slug]` | Yes + Member | Sidebar, presence wrapper, community tabs |
| `(admin)` | Yes + Admin | Admin navigation |
| `u/` | No | Profile-specific layout |

---

## 3. Data Flow Patterns

### 3.1 Standard CRUD Flow

```
UI Component
    │
    ▼
Server Action (lib/actions/*.ts)
    │
    ├── verifySession() ─── DAL (lib/dal.ts) ─── NextAuth (lib/auth.ts)
    ├── checkRateLimit() ─── lib/rate-limit.ts ─── Upstash Redis
    ├── isMember() / canModerate() ─── lib/db/members.ts
    ├── validate() ─── lib/validations/*.ts (Zod)
    │
    ▼
Database Query (lib/db/*.ts)
    │
    ├── Prisma Client (lib/prisma.ts)
    │
    ▼
PostgreSQL (Neon)
    │
    ▼
Return to Action → revalidatePath() → Return to UI
```

### 3.2 Real-time Chat Flow

```
User types message
    │
    ├── Optimistic insert (clientMessageId)
    │   └── Local state update immediately
    │
    ▼
Server Action: sendMessage()
    │
    ├── verifySession()
    ├── checkChatRateLimit()
    ├── sanitizeText()
    ├── Prisma: Create message
    │
    ▼
publishToChannel() ─── Ably Server
    │
    ▼
Ably broadcasts to all subscribers
    │
    ▼
useAblyChannel hook receives message
    │
    ├── Deduplication check (500 ID cache)
    ├── If clientMessageId matches local → reconcile
    ├── Else → insert into message list
    │
    ▼
UI updates
```

### 3.3 Auth Flow

```
User visits /sign-in
    │
    ▼
Enter email → signIn("resend", { email })
    │
    ▼
NextAuth creates verification token
    │
    ▼
Resend sends magic link email
    │
    ▼
User clicks link → /api/auth/callback
    │
    ├── Token verified
    ├── Session created (30-day expiry)
    ├── Cookie set (__Secure-next-auth.session-token)
    │
    ▼
Redirect to /dashboard

Session Check (every request):
middleware.ts → check cookie existence (for redirect logic)
Server Components → auth() via DAL
Server Actions → verifySession() throws if unauthenticated
```

---

## 4. Ably Channel Architecture

### Channel Naming Convention

| Pattern | Purpose | Capabilities |
|---------|---------|--------------|
| `community:{id}:chat:{channelId}` | Chat messages | subscribe, presence |
| `community:{id}:presence` | Online members | subscribe, presence |
| `community:{id}:forum` | Forum notifications | subscribe |
| `community:{id}:document:{docId}` | Doc collaboration | subscribe, presence |
| `user:{id}:notifications` | Personal notifications | subscribe |

### Token Scoping (Security)

```typescript
// Token generation scopes access per user
capability = {
  // Personal notifications
  [`user:${userId}:notifications`]: ["subscribe"],

  // For each community membership:
  [`community:${communityId}:presence`]: ["subscribe", "presence"],
  [`community:${communityId}:forum`]: ["subscribe"],
  [`community:${communityId}:document:*`]: ["subscribe", "presence"],

  // General chat channels (all members)
  [`community:${communityId}:chat:${channelId}`]: ["subscribe", "presence"],

  // Event chat channels (only if RSVP'd GOING)
  [`community:${communityId}:chat:${eventChannelId}`]: ["subscribe", "presence"],
}
```

---

## 5. Presence System

```
CommunityPresenceWrapper (components/community/)
    │
    ▼
CommunityPresenceProvider (contexts/presence-context.tsx)
    │
    ├── useAblyChannel() for presence channel
    ├── Ref counting for mount/unmount
    │
    ▼
Ably Presence API
    │
    ├── presence.enter({ userId, name, image })
    ├── presence.subscribe('enter' | 'leave' | 'update')
    │
    ▼
Online members list displayed in UI
```

---

## 6. Message Threading Model

```
Depth 0 (Root messages)
├── depth=0, threadRootId=null, replyToId=null
│
└── Depth 1 (Direct replies)
    ├── depth=1, threadRootId=parent.id, replyToId=parent.id
    │
    └── Depth 2 (Reply to reply - MAX)
        └── depth=2, threadRootId=parent.threadRootId, replyToId=parent.id

Constraints:
- Max depth enforced in sendMessage action
- replyCount cached on root message
- Pinning: isPinnedInChannel (root) or isPinnedInThread (within thread)
```

---

## 7. Rate Limiting Configuration

| Action | Limit | Window |
|--------|-------|--------|
| Auth | 3 attempts | 15 min |
| Chat | 1 message | 1 sec |
| Reaction | 20 reactions | 1 min |
| Post | 1 post | 1 min |
| Comment | 5 comments | 1 min |
| Vote | 10 votes | 1 min |
| Event | 5 events | 1 hour |
| Community | 3 communities | 1 hour |
| Membership | 10 joins | 1 hour |
| Profile | 10 updates | 1 hour |
| Channel | 5 channels | 1 hour |
| Document | 10 documents | 1 hour |
| Folder | 10 folders | 1 hour |
| RSVP | 20 RSVPs | 1 hour |
| Invite | 20 invites | 1 hour |
| Upload | 30 uploads | 1 hour |

**Note**: If Upstash Redis is not configured, all requests are allowed (graceful degradation).

---

## 8. File Upload Flow

```
Client: Select file
    │
    ▼
Server Action: getPresignedUploadUrl()
    │
    ├── verifySession()
    ├── checkUploadRateLimit()
    ├── Validate file type/size
    │
    ▼
lib/b2.ts: Generate presigned URL
    │
    ▼
Client: PUT file directly to B2
    │
    ▼
Server Action: Save URL reference to database
```

**Supported uploads**:
- Profile images
- Community card/banner images
- Event cover images
- Document attachments (via TipTap editor)

---

## 9. Notification Flow

```
Trigger event (reply, vote, mention, etc.)
    │
    ▼
Server Action creates Notification record
    │
    ▼
publishToChannel(userNotificationChannel)
    │
    ▼
Client: useAblyChannel receives notification
    │
    ├── Update notification count badge
    ├── Show toast (if configured)
    │
    ▼
User clicks notification → navigates to link
    │
    ▼
Mark as read (markNotificationRead action)
```

---

## 10. Key File References

| Area | Primary Files |
|------|---------------|
| **Auth** | `lib/auth.ts`, `lib/dal.ts`, `middleware.ts` |
| **Real-time** | `lib/ably.ts`, `lib/ably-client.ts`, `hooks/use-ably.ts` |
| **Actions** | `lib/actions/*.ts` (17 action files) |
| **Database** | `lib/db/*.ts` (12 query files), `lib/prisma.ts` |
| **Validation** | `lib/validations/*.ts` (9 schema files) |
| **Security** | `lib/utils/sanitize.ts`, `lib/rate-limit.ts` |
| **Presence** | `contexts/presence-context.tsx` |
| **Chat UI** | `components/chat/*.tsx` (13 components) |
| **Schema** | `prisma/schema.prisma` |

---

## 11. Database Entity Relationships

```
User ─┬── owns ──────── Community ─┬── has ────── Member
      │                            ├── has ────── Event ── has ── EventSession ── has ── RSVP
      ├── member of ───────────────┤
      ├── authored ────────────────├── has ────── Post ── has ── Comment
      ├── messages ────────────────├── has ────── ChatChannel ── has ── Message
      ├── notifications ───────────├── has ────── Document ── has ── DocumentVersion
      └── reactions ───────────────└── has ────── ModerationLog
```

---

## 12. Environment Dependencies

| Variable | Service | Required |
|----------|---------|----------|
| `DATABASE_URL` | Neon PostgreSQL | Yes |
| `NEXTAUTH_URL` | NextAuth | Yes |
| `NEXTAUTH_SECRET` | NextAuth | Yes |
| `RESEND_API_KEY` | Email | Yes |
| `RESEND_FROM_EMAIL` | Email | Yes |
| `ABLY_API_KEY` | Real-time | Yes |
| `UPSTASH_REDIS_REST_URL` | Rate limiting | No (degrades gracefully) |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting | No |
| `B2_ENDPOINT` | File storage | No (uploads disabled) |
| `B2_ACCOUNT_ID` | File storage | No |
| `B2_APPLICATION_KEY` | File storage | No |
| `B2_BUCKET_NAME` | File storage | No |
| `B2_PUBLIC_URL` | File storage | No |
| `SENTRY_DSN` | Error tracking | No |
