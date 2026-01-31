# Database and Prisma Review

**Generated**: 2026-01-30

---

## Schema Overview

| Model | Purpose | Key Indexes |
|-------|---------|-------------|
| User | Auth.js users | email (unique), username (unique) |
| Account | OAuth accounts | userId, provider+providerAccountId |
| Session | User sessions | sessionToken (unique), userId |
| Community | Groups | slug (unique), ownerId, type, state, lastActivityAt |
| Member | Memberships | userId+communityId (unique), role |
| Event | Community events | communityId+createdAt, organizerId, state |
| EventSession | Event times | eventId+startTime |
| RSVP | Event attendance | userId+sessionId (unique), status |
| ChatChannel | Chat rooms | communityId+name (unique) |
| Message | Chat messages | channelId+createdAt, threadRootId+createdAt |
| MessageReaction | Emoji reactions | messageId+userId+emoji (unique) |
| Post | Forum posts | communityId+createdAt, communityId+voteScore, communityId+slug |
| Comment | Post comments | postId+createdAt, postId+voteScore, parentId |
| PostVote / CommentVote | Voting | postId+userId / commentId+userId |
| Document | Wiki pages | communityId+slug, communityId+folderId |
| Notification | User alerts | userId+isRead+createdAt |

---

## Migration Safety Review

### Migration 0000_init
**Risk**: Low (initial setup)
- Creates base tables with proper indexes
- All foreign keys have appropriate CASCADE rules
- No data to migrate

### Migration 20260127000000_add_post_slug
**Risk**: Low
- Adds slug column to Post
- No ALTER on existing constraints

### Migration 20260128000000_add_compound_indexes
**Risk**: Low
- Adds compound indexes for query optimization
- Non-blocking CREATE INDEX CONCURRENTLY not used, but tables are small

### Migration 20260130000000_chat_threading_pins_notifications
**Risk**: Medium - Production concerns

```sql
-- These ALTER statements will lock Message table
ALTER TABLE "Message" ADD COLUMN "clientMessageId" TEXT;
ALTER TABLE "Message" ADD COLUMN "threadRootId" TEXT;
-- etc.
```

**Concerns**:
1. Multiple ALTERs on same table - each locks table briefly
2. Backfill UPDATE runs in same migration - good for atomicity but could be slow

**Recommendations for future migrations**:
- For large tables, use batched backfills in application code
- Consider `CREATE INDEX CONCURRENTLY` for production indexes
- Split schema changes from backfill operations

---

## Index Coverage Analysis

### Well-Covered Query Patterns

| Query Pattern | Index Used |
|--------------|------------|
| Community by slug | `Community_slug_key` |
| Members by community | `Member_communityId_idx` |
| Messages by channel (recent) | `Message_channelId_createdAt_idx` |
| Posts by community (recent) | `Post_communityId_createdAt_idx` |
| Posts by community (top) | `Post_communityId_voteScore_idx` |
| Thread replies | `Message_threadRootId_createdAt_idx` |
| Pinned channel messages | `Message_channelId_isPinnedInChannel_idx` |
| User's unread by channel | `UserChannelRead_userId_channelId_key` |
| Notifications (unread) | `Notification_userId_isRead_createdAt_idx` |

### Potentially Missing Indexes

| Query | Current Behavior | Recommendation |
|-------|-----------------|----------------|
| Hot posts (time decay sort) | Fetches 100, sorts in memory | P3: Add materialized score column if needed |
| Comments by post + vote score | Has index | OK |
| Events by state across communities | Sequential scan possible | `Event_state_idx` exists - OK |

---

## N+1 Query Analysis

### Identified Patterns

#### `lib/db/posts.ts` - generateUniquePostSlug
```typescript
// Potentially 100+ queries in worst case
for (let i = 2; i <= 100; i++) {
  if (!(await postSlugExists(communityId, candidate, excludePostId))) {
    return candidate;
  }
}
```

**Risk**: Low - slug collisions are rare
**Recommendation**: Could optimize with single query to find next available, but low priority

#### `lib/db/posts.ts` - getPostComments
```typescript
// Level-by-level fetching for nested comments
for (let depth = 0; depth < 5 && currentParentIds.length > 0; depth++) {
  const levelReplies = await prisma.comment.findMany({...});
}
```

**Risk**: Medium - up to 6 queries per comment load
**Status**: Intentional design with bounded limits (1000 replies per level)

### Well-Optimized Queries

- **getPosts**: Single query with includes for author role
- **getPostBySlug**: Single query with all relations
- **getChatMessages**: Single query with reaction aggregation
- **getMemberPermissions**: Single query for all role checks

---

## Cascade Delete Audit

### Intentional Cascades (Safe)

| Parent | Child | Behavior | Notes |
|--------|-------|----------|-------|
| User | Account | CASCADE | Auth.js requirement |
| User | Session | CASCADE | Auth.js requirement |
| User | Member | CASCADE | User leaves all communities on delete |
| Community | Member | CASCADE | Membership ends with community |
| Community | Event | CASCADE | Events belong to community |
| Community | Post | CASCADE | Posts belong to community |
| Event | EventSession | CASCADE | Sessions belong to event |
| EventSession | RSVP | CASCADE | RSVPs belong to session |
| Post | Comment | CASCADE | Comments belong to post |
| Message | MessageReaction | CASCADE | Reactions belong to message |

### Soft Delete Patterns (Good)

- **Post**: deletedAt, deletedById
- **Comment**: deletedAt, deletedById
- **Message**: deletedAt, deletedById
- **Document**: deletedAt, deletedById

### Potential Data Loss Risks

| Scenario | Cascade Chain | Mitigation |
|----------|---------------|------------|
| Community delete | Removes all events, posts, messages, documents | Requires name confirmation |
| User delete | Removes all memberships, organized events | Content kept (author relation preserved) |

---

## Race Condition Analysis

### Message Depth Enforcement
```typescript
// Transaction ensures atomic check + create
await prisma.$transaction(async (tx) => {
  const parent = await tx.message.findUnique({...});
  if (parent.depth >= 2) throw new Error("Maximum depth");
  const message = await tx.message.create({
    data: { depth: parent.depth + 1 }
  });
});
```
**Status**: Correct - transaction prevents race

### Reply Count Cache
```typescript
// Increment in same transaction as message create
await tx.message.update({
  where: { id: threadRootId },
  data: { replyCount: { increment: 1 } },
});
```
**Status**: Correct - atomic increment in transaction

### Vote Score Cache
```typescript
// Update in same transaction as vote upsert
await tx.post.update({
  data: { voteScore: { increment: scoreDelta } },
});
```
**Status**: Correct - atomic increment in transaction

### Comment Depth Enforcement
```typescript
// lib/actions/comment.ts - depth check
if (parent) {
  if (parent.depth >= 4) {
    return { success: false, error: "Maximum nesting depth reached" };
  }
  depth = parent.depth + 1;
}
```
**Status**: Potential race if two replies submitted simultaneously. Consider transaction like Message.

---

## Performance Concerns

### Hot Sort Algorithm
```typescript
// Fetches 100 posts, sorts in memory
const posts = await prisma.post.findMany({
  take: sort === "hot" ? 100 : limit + 1,
});
sortedPosts = [...posts].sort((a, b) => getHotScore(...));
```

**Current Impact**: Acceptable for small communities
**Future Consideration**:
- Add computed `hotScore` column updated periodically
- Or use Redis for hot rankings

### Unread Count Calculation
```typescript
// N queries for N channels
await Promise.all(
  channelIds.map(async (channelId) => {
    const count = await prisma.message.count({...});
  })
);
```

**Current Impact**: Acceptable - parallel queries
**Future Consideration**: Single aggregation query

---

## Schema Design Quality

### Good Patterns

1. **Compound unique constraints**: `userId_communityId`, `userId_sessionId`, etc.
2. **Soft deletes**: Preserves audit trail
3. **Cached counts**: `voteScore`, `replyCount`, `commentCount`
4. **Timestamp tracking**: `createdAt`, `updatedAt`, `lastActivityAt`
5. **CUID IDs**: Good distribution, URL-safe

### Improvement Opportunities

| Area | Current | Suggestion | Priority |
|------|---------|------------|----------|
| Comment depth race | No transaction | Add transaction like Message | P2 |
| Hot score | Computed at read | Pre-compute periodically | P3 |
| Full-text search | `contains` with `insensitive` | PostgreSQL tsvector | P3 |

---

## Summary

The database schema is well-designed with:
- Proper indexes for common query patterns
- Safe cascade delete rules
- Soft delete for user content
- Atomic operations in transactions where needed

**Action Items**:
1. P2: Add transaction around comment depth check
2. P2: Consider batched backfill strategy for future large migrations
3. P3: Monitor hot sort performance as data grows
