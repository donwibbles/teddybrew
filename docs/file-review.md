# File-by-File Review Notes

**Generated**: 2026-01-30
**Reviewer**: Automated codebase review
**Scope**: ~280 source files

---

## Review Summary

| Category | Count | Status |
|----------|-------|--------|
| P0 Critical Issues | 1 | Fixed |
| P1 High Priority | 6 | Documented |
| P2 Medium Priority | 12 | Documented |
| P3 Low Priority | 10+ | Documented |

---

## P0 Issues (Fixed)

### `components/community/moderation-log.tsx`
**Issue**: Variable accessed before declaration
- `loadLogs()` called in useEffect before function was defined
- **Status**: Fixed - moved function definition above useEffect

---

## P1 Issues (High Priority)

### `hooks/use-ably.ts`

| Line | Issue | Risk |
|------|-------|------|
| 25 | Async Promise executor | Anti-pattern, can mask errors |
| 218 | Stale ref in cleanup | Memory leak potential |

**Findings**:
- Deduplication cache (lines 138-144) caps at 1000 then trims to 500 - adequate for most use cases
- 50ms batching for message throttling - reasonable balance
- Presence ref counting implemented correctly for mount/unmount cycles
- Good: Rate limit errors filtered from Sentry

**Recommendation**: Refactor Promise executor to avoid async, store ref copy in effect.

---

### `components/forum/markdown-renderer.tsx`

| Line | Issue | Risk |
|------|-------|------|
| 190 | Unknown JSX properties `jsx`, `global` | Lint error |

**Findings**:
- styled-jsx syntax is valid in Next.js but may need config for linter
- DOMPurify configuration is secure with explicit allowlist
- Links get `target="_blank" rel="noopener noreferrer"` - good XSS prevention

**Recommendation**: Either suppress lint rule for styled-jsx or migrate to CSS modules/Tailwind.

---

### `lib/validations/__tests__/post.test.ts` (4 failures)

**Cause**: Post validation schema changed but tests not updated
- Tests expect old field requirements
- Schema now requires `communityId` and `issueTagIds`

**Recommendation**: Update test fixtures to include required fields.

---

### `lib/actions/__tests__/community.test.ts` (5 failures)

**Cause**: Validation order changed - state required before slug uniqueness check runs
- Tests expect "already taken" error but get "State is required" first

**Recommendation**: Update test data to include valid state for non-virtual communities.

---

### `lib/actions/__tests__/membership.test.ts` (Suite fails)

**Cause**: `server-only` package not resolved in Vitest
- lib/db/members.ts imports "server-only" which Vitest can't resolve

**Recommendation**: Add Vitest alias: `"server-only": ""` in vitest.config.ts.

---

## P2 Issues (Medium Priority)

### React Compiler / Hooks Violations

The following files have `setState` calls directly in `useEffect`, which the React Compiler flags:

| File | Pattern | Notes |
|------|---------|-------|
| `components/activity/activity-feed.tsx:48` | loadMore in useEffect | Infinite scroll trigger |
| `components/community/invitations-section.tsx:32` | loadInvites on mount | Data fetching |
| `components/event/create-event-form.tsx:63` | setTimezone | Client timezone detection |
| `components/event/edit-event-form.tsx:122` | setTimezone | Timezone initialization |
| `components/forum/global-post-list.tsx:62,92` | setState on sort change | Pagination reset |
| `components/forum/post-list.tsx:57,88` | setState on sort change | Pagination reset |
| `components/layout/mobile-nav.tsx:53,73` | Channel loading | Data fetching |

**Pattern**: Most are for data fetching on mount or pagination. Not bugs, but React Compiler will skip memoization.

**Recommendation**: Convert to `useSyncExternalStore` or data fetching libraries where appropriate.

---

### React Hook Form Incompatibility

| File | Issue |
|------|-------|
| `components/community/create-community-form.tsx:45` | `watch()` incompatible with React Compiler |
| `components/community/edit-community-form.tsx:80` | `watch()` incompatible |
| `components/profile/profile-edit-form.tsx:92` | `watch()` incompatible |

**Notes**: React Hook Form's `watch()` API returns functions that can't be safely memoized. React Compiler will skip these components.

**Recommendation**: Accept the tradeoff or migrate to controlled inputs.

---

### Ref Access During Render

| File | Line | Issue |
|------|------|-------|
| `components/forum/create-post-form.tsx` | 114 | Passing ref to handleSubmit |
| `components/forum/edit-post-form.tsx` | 135 | Passing ref to handleSubmit |

**Notes**: React Hook Form's `handleSubmit` may access ref during render.

**Recommendation**: Wrap in useCallback or review React Hook Form patterns.

---

### Image Optimization Warnings

Files using `<img>` instead of `<Image />`:

- `app/(app)/communities/[slug]/events/[eventId]/page.tsx` (3 instances)
- `components/community/member-list.tsx:41`
- `components/community/member-management-list.tsx:127`
- `components/event/event-card.tsx:240`

**Recommendation**: Replace with `next/image` for automatic optimization.

---

## Security Review Summary

### Positive Findings

| Area | Implementation | Status |
|------|---------------|--------|
| **Authentication** | NextAuth v5 with Prisma adapter | Solid |
| **Session Verification** | `verifySession()` in all server actions | Consistent |
| **Rate Limiting** | 17 separate limiters by action type | Comprehensive |
| **Input Sanitization** | DOMPurify via `sanitizeText()` | Applied consistently |
| **XSS Prevention** | Strict CSP, DOMPurify on render | Strong |
| **Authorization** | `isMember()`, `canModerate()` checks | Consistent |
| **Audit Logging** | `logModerationAction()` for sensitive ops | Good coverage |
| **Soft Deletes** | Posts, comments, messages use deletedAt | Good practice |
| **Private Communities** | Never appear in public search | Correct |
| **Event Channels** | RSVP check for access | Properly scoped |
| **Ably Token Scoping** | Per-channel capabilities by membership | Secure |

### Areas to Monitor

| Area | Concern | Priority |
|------|---------|----------|
| **Rate Limit Fallback** | If Redis unavailable, all requests allowed | P2 - Add monitoring |
| **PostgreSQL SSL** | Warning about SSL mode semantics change | P1 - Set explicit sslmode |
| **Middleware Deprecation** | Next.js 16 deprecates middleware pattern | P2 - Plan migration |

---

## Critical File Reviews

### `lib/auth.ts`
**Purpose**: NextAuth v5 configuration
**Complexity**: Low | **Correctness**: High | **Readability**: 5/5

- Custom adapter to handle missing session gracefully
- Magic link authentication via Resend
- 30-day session expiry, 24-hour refresh
- Secure cookie configuration (httpOnly, sameSite, secure)

---

### `lib/dal.ts`
**Purpose**: Data Access Layer - session verification
**Complexity**: Low | **Correctness**: High | **Readability**: 5/5

- Cached session with `cache()` from React
- `verifySession()` throws on unauthenticated
- `getCurrentUserId()` for optional auth

---

### `lib/rate-limit.ts`
**Purpose**: Upstash Redis rate limiting
**Complexity**: Low | **Correctness**: High | **Readability**: 4/5

- 17 rate limiters with appropriate windows
- Graceful degradation if Redis unavailable (allows all)
- `getClientIp()` supports Fly.io headers

---

### `lib/utils/sanitize.ts`
**Purpose**: XSS prevention
**Complexity**: Low | **Correctness**: High | **Readability**: 5/5

- `sanitizeText()` strips all HTML
- `sanitizeRichText()` allows b/i/em/strong/br only
- Uses isomorphic-dompurify for SSR compatibility

---

### `lib/ably.ts`
**Purpose**: Server-side Ably integration
**Complexity**: Medium | **Correctness**: High | **Readability**: 4/5

- Token generation with granular channel capabilities
- Event channel access requires RSVP status
- Channel naming convention documented

---

### `hooks/use-ably.ts`
**Purpose**: Client-side Ably hooks
**Complexity**: High | **Correctness**: Medium | **Readability**: 3/5

- Global singleton client with reconnection
- Message deduplication with ID cache
- Presence ref counting for cleanup
- **Issues**: Async promise executor, stale ref warning

---

### `lib/actions/chat.ts`
**Purpose**: Chat server actions
**Complexity**: High | **Correctness**: High | **Readability**: 4/5

- Full auth + membership + RSVP checks
- Transaction for depth enforcement + message creation
- Optimistic UI support with clientMessageId
- Mention and reply notifications

---

### `lib/actions/community.ts`
**Purpose**: Community CRUD
**Complexity**: Medium | **Correctness**: High | **Readability**: 5/5

- Owner-only update/delete
- Name confirmation for delete
- Transaction for create (community + member + channel)

---

### `lib/actions/membership.ts`
**Purpose**: Join/leave/promote/demote
**Complexity**: Medium | **Correctness**: High | **Readability**: 5/5

- Owner cannot leave
- Remove transfers events to owner
- Self-modification prevented

---

### `lib/actions/post.ts`
**Purpose**: Forum posts
**Complexity**: Medium | **Correctness**: High | **Readability**: 5/5

- Membership required for create/vote
- canModerate for delete/pin
- Slug generation with uniqueness

---

### `lib/db/members.ts`
**Purpose**: Membership queries and permissions
**Complexity**: Low | **Correctness**: High | **Readability**: 5/5

- Clean permission helper functions
- `getMemberPermissions()` for batched checks
- `logModerationAction()` for audit trail

---

### `middleware.ts`
**Purpose**: Edge middleware
**Complexity**: Medium | **Correctness**: High | **Readability**: 4/5

- CSP header generation
- Security headers (X-Frame-Options, HSTS, etc.)
- Auth redirect for /communities/ to /explore/
- Note: Cookie check only, full auth at layout level

---

### `app/api/ably/token/route.ts`
**Purpose**: Ably token generation API
**Complexity**: Medium | **Correctness**: High | **Readability**: 4/5

- Auth required
- Token scoped to user's community memberships
- Event channels only if RSVP'd GOING

---

### `components/chat/chat-room.tsx`
**Purpose**: Main chat UI
**Complexity**: High | **Correctness**: High | **Readability**: 3/5

- Multiple Ably subscriptions (message, delete, reaction, pin)
- Optimistic UI with pending queue
- Retry logic for failed sends
- Near-bottom scroll detection

---

### `lib/validations/chat.ts`
**Purpose**: Chat validation schemas
**Complexity**: Low | **Correctness**: High | **Readability**: 5/5

- Channel name regex validation
- Message content 1-2000 chars
- Proper Zod transforms

---

### `prisma/schema.prisma`
**Purpose**: Database schema
**Complexity**: High | **Correctness**: High | **Readability**: 4/5

- Proper indexes on foreign keys
- Compound indexes for common queries
- Soft delete patterns (deletedAt, deletedById)
- Depth fields for threading enforcement

---

## Files Requiring No Changes

The following categories are clean with no issues found:

- `lib/constants/*` - Static data
- `lib/email/*` - Email templates
- `components/ui/*` - Radix UI wrappers
- `components/skeletons/*` - Loading states
- `types/*` - TypeScript types

---

## Test Coverage Assessment

| Area | Coverage | Priority to Add |
|------|----------|-----------------|
| Server Actions | Partial (3 files) | P1 - Expand coverage |
| Validations | Partial (1 file) | P2 |
| Utilities | Good (sanitize, rate-limit) | OK |
| Components | None | P3 |
| E2E | None | P2 |

---

## Next Steps

1. **Fix P1 test failures** - Update test fixtures for new validation requirements
2. **Add vitest alias for server-only** - Enable membership test suite
3. **Refactor use-ably.ts** - Fix async Promise executor and stale ref
4. **Address PostgreSQL SSL warning** - Set explicit sslmode
5. **Plan middleware migration** - Next.js 16 deprecates middleware pattern
