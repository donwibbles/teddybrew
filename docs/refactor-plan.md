# Refactor and Optimization Plan

**Generated**: 2026-01-30
**Priority Levels**:
- **P0**: Security/correctness/data loss - Fix immediately
- **P1**: Reliability/performance/bad UX - Fix this sprint
- **P2**: Maintainability/readability - Plan for next sprint
- **P3**: Nice-to-have cleanup - Backlog

---

## Executive Summary

The codebase is well-architected with consistent security patterns. Key findings:

| Category | Count | Status |
|----------|-------|--------|
| P0 Critical | 1 | Fixed |
| P1 High | 8 | 1 Fixed (tests), 7 Documented |
| P2 Medium | 15 | Documented |
| P3 Low | 10+ | Documented |
| Test Failures | 9 | **All Fixed** (107/107 passing) |
| Build | Passing | 1 deprecation warning |

---

## P0 Items (Fixed)

### 1. Variable Declaration Order - moderation-log.tsx
**Status**: Fixed
**Issue**: `loadLogs()` called before declaration
**Fix**: Moved function above useEffect

---

## P1 Items (Fix This Sprint)

### 1. Test Suite Failures (9 tests)
**Status**: ✅ Fixed

| Suite | Failures | Root Cause | Fix Applied |
|-------|----------|------------|-------------|
| `post.test.ts` | 4 | Schema requires `issueTagIds` | Added to test fixtures |
| `community.test.ts` | 5 | Schema requires `isVirtual: true` | Added to test fixtures |
| `membership.test.ts` | Suite fails | `server-only` not resolved + missing mock | Added vitest alias + `community.update` mock |

**Files Modified**:
- `vitest.config.ts` - Added `server-only` alias
- `vitest.server-only-stub.ts` - Created stub file
- `lib/validations/__tests__/post.test.ts` - Added `issueTagIds`
- `lib/actions/__tests__/community.test.ts` - Added `isVirtual: true`
- `lib/actions/__tests__/membership.test.ts` - Added `community.update` mock

---

### 2. PostgreSQL SSL Warning

**Issue**: Warning about SSL mode semantics changing in pg v9
```
SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca'
are treated as aliases for 'verify-full'.
```

**Fix**: Set explicit SSL mode in connection string
```
DATABASE_URL="...?sslmode=verify-full"
```

**Effort**: 15 minutes

---

### 3. Async Promise Executor - use-ably.ts:25

**Issue**: Anti-pattern that can mask errors
```typescript
connectionPromise = new Promise(async (resolve, reject) => {
  // async executor
});
```

**Fix**: Refactor to async function returning Promise
```typescript
async function createConnection(): Promise<Ably.Realtime> {
  const response = await fetch("/api/ably/token");
  // ...
  return new Promise((resolve, reject) => {
    ablyClient.connection.on("connected", () => resolve(ablyClient!));
    ablyClient.connection.on("failed", reject);
  });
}
```

**Effort**: 30 minutes

---

### 4. Stale Ref in Cleanup - use-ably.ts:218

**Issue**: Ref value may change by cleanup time
```typescript
return () => {
  if (messageQueueRef.current.timeout) { // Stale ref
    clearTimeout(messageQueueRef.current.timeout);
  }
};
```

**Fix**: Capture ref value in effect body
```typescript
useEffect(() => {
  const queue = messageQueueRef.current;
  // ...
  return () => {
    if (queue.timeout) clearTimeout(queue.timeout);
  };
}, [...]);
```

**Effort**: 15 minutes

---

### 5. Unknown JSX Properties - markdown-renderer.tsx:190

**Issue**: ESLint error for styled-jsx properties
```typescript
<style jsx global>{proseStyles}</style>
```

**Fix Options**:
1. Add ESLint ignore for styled-jsx
2. Migrate to CSS modules or Tailwind `@apply`

**Effort**: 30 minutes

---

### 6. Comment Depth Race Condition

**Issue**: No transaction around depth check in createComment
**File**: `lib/actions/comment.ts`

**Fix**: Wrap in transaction like sendChatMessage
```typescript
await prisma.$transaction(async (tx) => {
  const parent = await tx.comment.findUnique({...});
  if (parent.depth >= 4) throw new Error("Maximum depth");
  await tx.comment.create({...});
  await tx.post.update({...}); // commentCount
});
```

**Effort**: 30 minutes

---

### 7. Rate Limit Monitoring

**Issue**: If Redis unavailable, all requests are allowed (intentional graceful degradation)
**Risk**: Abuse possible if Redis goes down

**Fix**: Add monitoring/alerting for Redis connection failures

**Effort**: 1 hour

---

### 8. Middleware Deprecation Warning
**Status**: ✅ Fixed

**Issue**: Next.js 16 deprecates middleware.ts pattern

**Fix Applied**:
- Ran `npx @next/codemod@latest middleware-to-proxy`
- File renamed: `middleware.ts` → `proxy.ts`
- Function renamed: `middleware()` → `proxy()`
- Updated comments for consistency

---

## P2 Items (Next Sprint)

### 1. React Compiler Compatibility

**Files affected**: 10+ components with setState in useEffect

**Options**:
1. Accept React Compiler skipping these components
2. Refactor to use `useSyncExternalStore` or data libraries
3. Extract data fetching to parent RSCs

**Effort**: 4-8 hours per pattern

---

### 2. React Hook Form Compatibility

**Files**: 3 form components using `watch()`

**Status**: Known limitation - Compiler skips these components
**Action**: Monitor React Hook Form updates for Compiler support

---

### 3. Image Optimization

**Files**: 6 instances of `<img>` instead of `<Image />`

**Fix**: Replace with next/image
```typescript
import Image from "next/image";
<Image src={...} alt={...} width={...} height={...} />
```

**Effort**: 1 hour

---

### 4. Test Coverage Expansion

| Area | Current | Target | Priority |
|------|---------|--------|----------|
| Server Actions | 3 files | All critical paths | P2 |
| Validations | 1 file | All schemas | P2 |
| Components | 0 | Key interactions | P3 |
| E2E | 0 | Happy paths | P2 |

**Effort**: 8-16 hours

---

### 5. Hot Sort Performance

**Current**: Fetches 100 posts, sorts in memory
**Concern**: May not scale with large communities

**Options**:
1. Add `hotScore` column updated by cron
2. Use Redis sorted set for hot rankings

**Effort**: 4 hours

---

## P3 Items (Backlog)

### 1. Test File Type Annotations

**Issue**: 11 `@typescript-eslint/no-explicit-any` in test files
**Fix**: Add proper types to test fixtures

---

### 2. Full-Text Search

**Current**: `contains` with `mode: insensitive`
**Improvement**: PostgreSQL tsvector for better search

---

### 3. Unread Count Query Optimization

**Current**: N parallel queries for N channels
**Improvement**: Single aggregation query

---

### 4. Code Deduplication

Review for shared patterns in:
- Form components
- List pagination logic
- Permission checks

---

## Implementation Order

### Week 1
1. [x] Fix test failures (P1 #1) - Done
2. [ ] PostgreSQL SSL mode (P1 #2) - 15 min
3. [ ] use-ably.ts refactor (P1 #3, #4) - 45 min
4. [ ] markdown-renderer.tsx lint fix (P1 #5) - 30 min

### Week 2
5. [ ] Comment depth transaction (P1 #6) - 30 min
6. [ ] Rate limit monitoring (P1 #7) - 1 hour
7. [ ] Image optimization (P2 #3) - 1 hour
8. [x] Migrate middleware to proxy (P1 #8) - Done

### Week 3+
9. [ ] React Compiler patterns (P2 #1)
10. [ ] Test coverage expansion (P2 #4)
11. [ ] Hot sort optimization if needed (P2 #5)

---

## Risks and Dependencies

| Risk | Mitigation |
|------|------------|
| Middleware migration may require API changes | Research Next.js 16 proxy pattern first |
| React Compiler patterns may need significant refactoring | Accept gradual migration |
| Hot sort may need infra (Redis) | Monitor performance first |

---

## Metrics to Track

- [ ] Test pass rate (target: 100%)
- [ ] Build warnings (target: 0)
- [ ] Lint errors (target: 0)
- [ ] Sentry error rate
- [ ] P95 response times for getPosts, getChatMessages

---

## Completed During Review

| Item | Status |
|------|--------|
| moderation-log.tsx variable order | Fixed |
| docs/baseline-results.md | Created |
| docs/system-map.md | Created |
| docs/file-review.md | Created |
| docs/db-review.md | Created |
| docs/refactor-plan.md | Created |
| Test suite failures (9 tests) | Fixed - 107/107 passing |
| middleware.ts → proxy.ts migration | Fixed |
