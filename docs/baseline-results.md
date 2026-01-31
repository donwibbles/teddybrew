# Baseline Health Check Results

**Date**: 2026-01-30
**Next.js Version**: 16.1.0 (Turbopack)
**Node Version**: See environment

---

## Build Status: ✅ SUCCESS

```
✓ Compiled successfully in 3.9min
✓ Completed runAfterProductionCompile in 7251ms
✓ Generating static pages (26/26) in 51s
```

### Warnings

1. **Middleware Deprecation**
   ```
   ⚠ The "middleware" file convention is deprecated.
   Please use "proxy" instead.
   ```
   - Action: Plan migration to proxy pattern (P2)

2. **PostgreSQL SSL Warning**
   ```
   SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca'
   are treated as aliases for 'verify-full'.
   ```
   - Action: Explicitly set `sslmode=verify-full` in connection string (P1)

---

## Lint Status: ❌ 52 PROBLEMS (36 errors, 16 warnings)

### Critical Errors (P0/P1)

| File | Issue | Priority |
|------|-------|----------|
| `components/community/moderation-log.tsx:59` | Variable `loadLogs` accessed before declaration | P0 - Bug |
| `hooks/use-ably.ts:25` | Async Promise executor (anti-pattern) | P1 |
| `components/forum/markdown-renderer.tsx:190` | Unknown JSX properties `jsx`, `global` | P1 |

### React Compiler / Hooks Violations (P2)

| File | Issue |
|------|-------|
| `components/activity/activity-feed.tsx:48` | setState in useEffect |
| `components/community/invitations-section.tsx:32` | setState in useEffect |
| `components/event/create-event-form.tsx:63` | setState in useEffect |
| `components/event/edit-event-form.tsx:122` | setState in useEffect |
| `components/forum/global-post-list.tsx:62,92` | setState in useEffect |
| `components/forum/post-list.tsx:57,88` | setState in useEffect |
| `components/layout/mobile-nav.tsx:53,73` | setState in useEffect |
| `components/forum/create-post-form.tsx:114` | Ref accessed during render |
| `components/forum/edit-post-form.tsx:135` | Ref accessed during render |
| `hooks/use-ably.ts:218` | Stale ref in cleanup |

### React Hook Form Incompatibility Warnings (P3)

- `components/community/create-community-form.tsx:45`
- `components/community/edit-community-form.tsx:80`
- `components/profile/profile-edit-form.tsx:92`

### Image Optimization Warnings (P3)

- `app/(app)/communities/[slug]/events/[eventId]/page.tsx` (3 instances)
- `components/community/member-list.tsx:41`
- `components/community/member-management-list.tsx:127`
- `components/event/event-card.tsx:240`

### Test File Type Issues (P3)

- `lib/actions/__tests__/community.test.ts` - 11 `@typescript-eslint/no-explicit-any`

---

## Test Status: ❌ 9 FAILED / 83 PASSED

### Test Suite Errors

1. **`lib/actions/__tests__/membership.test.ts`** - Suite failed to load
   - Error: `Failed to resolve import "server-only"`
   - Root cause: Vitest can't resolve `server-only` package
   - Action: Add vitest alias for server-only (P1)

### Failing Tests

#### Post Validation Tests (4 failures)
- Schema changed but tests not updated
- Tests expect old validation behavior
- Action: Update tests to match current schema (P1)

#### Community Action Tests (5 failures)
- Validation order changed: state check now runs before slug uniqueness
- Tests expect different error message order
- Action: Update test assertions (P1)

---

## TypeScript Status: ✅ PASS

No TypeScript errors during build.

---

## Prisma Status: ✅ SCHEMA VALID

- 4 migrations applied
- Schema compiles successfully

---

## Summary of Immediate Actions

### P0 (Fix Now)
- [ ] `moderation-log.tsx` - Fix variable declaration order

### P1 (Fix This Week)
- [ ] Update failing tests to match current validation schema
- [ ] Add vitest config for `server-only` mock
- [ ] Fix async Promise executor in `use-ably.ts`
- [ ] Fix unknown JSX properties in `markdown-renderer.tsx`
- [ ] Update PostgreSQL connection string for explicit SSL mode

### P2 (Plan Migration)
- [ ] Migrate middleware.ts to proxy pattern
- [ ] Refactor setState-in-useEffect patterns for React Compiler

### P3 (Low Priority)
- [ ] Replace `<img>` with `<Image />` in listed files
- [ ] Add proper types to test files
- [ ] Address React Hook Form watch() compatibility
