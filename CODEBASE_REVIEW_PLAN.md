# Codebase Review and Optimization Plan

This plan is designed to assess every part of the codebase for correctness, cohesion, readability, maintainability, and performance. It is scoped to the current repository structure (Next.js app, Prisma, NextAuth, Sentry, Ably, Tailwind, Vitest) and is intended to be executed end-to-end.

## 1) Review Goals
- Validate how components, pages, APIs, and data layers work together as a system.
- Identify correctness, consistency, and readability issues across all files.
- Surface performance, security, and reliability risks.
- Produce prioritized, actionable refactors with clear owners and risks.

## 1.5) Fix Policy (Hybrid Approach)

This review uses a hybrid approach: fix critical issues immediately, document the rest.

### When to Fix Immediately
- **P0 issues**: Security vulnerabilities, data loss risks, correctness bugs that affect users
- **Small obvious fixes**: < 20 lines, isolated to one file, no cascading changes, clear intent
- **While context is loaded**: If you're reading a file and the fix is obvious, do it

### When to Document Only
- Fix touches 3+ files or requires architectural thinking
- Behavior is ambiguous (might be intentional)
- Fix requires discussion or has multiple valid approaches
- Would take more than 15 minutes

### Recording Fixes
- Commit each fix atomically with a clear message referencing the review
- Note fixed issues in `docs/file-review.md` with status "Fixed" and commit hash
- Still document what was wrong so there's a record for future reviewers

## 2) Inventory and System Map
Create a complete system inventory and dependency map before detailed review.

### 2.1 Inventory
- Enumerate all source files excluding `node_modules`.
- Group files into domains: app routes, components, lib, hooks, contexts, prisma, configs, tests, public.
- Identify external services and integrations.

### 2.2 System Map
- Document entry points, routing structure, and layout hierarchy.
- Map data flow: UI -> actions -> DAL -> database/API -> UI.
- Map auth flow (NextAuth) and protected routes.
- Map real-time flow (Ably) and rate limiting.

#### Additional Flows to Document:
- **Optimistic UI flow**: clientMessageId reconciliation in chat
- **Presence system**: CommunityPresenceProvider → Ably presence channels → member tracking
- **Message threading**: threadRootId + depth enforcement + replyCount caching
- **Event reminder flow**: EventReminderSent idempotency tracking
- **File upload flow**: Client → presigned URL → B2/S3 → database reference

Deliverables:
- `docs/system-map.md` with a diagram or structured outline.
- `docs/inventory.csv` (optional) listing file, domain, primary responsibility.

## 3) Baseline Health Checks
Run a baseline to capture the current quality and identify quick wins.

- Build and lint: `npm run lint`, `npm run build`
- Tests: `npm run test`
- Type checks: ensure `tsconfig.json` strictness and errors.
- Prisma: validate migrations and schema structure.

#### Additional Baseline Checks:
- Sentry: Review error volume and unhandled exceptions
- Ably: Check for rate limit errors in logs/Sentry
- Database: Run EXPLAIN on heavy queries identified in lib/db/
- Bundle analysis: `npm run build` and review .next/analyze (if configured)

Deliverables:
- `docs/baseline-results.md` with command outputs summarized and key failures.

## 4) File-by-File Review Workflow
Review every file in the repo (excluding generated artifacts) using a consistent checklist. Use the file inventory from step 2.

### 4.1 Checklist (apply to every file)
- Purpose and ownership clear at top-level?
- Naming consistent and descriptive?
- Input/output contracts documented or inferable?
- Error handling and edge cases covered?
- Side effects obvious and isolated?
- Dependencies minimal and appropriate?
- Readability and structure clean?
- Tests present or justified missing?
- Testability: Can this be unit tested? (hard-to-mock dependencies, tight coupling, logic mixed with UI?)

### 4.2 Scoring and Flags
For each file, record:
- Complexity risk (low/med/high)
- Correctness risk (low/med/high)
- Readability score (1-5)
- Test coverage (none/partial/good)
- Action needed (none/refactor/bug/perf/security)
- Fixed during review? (yes/no/partial — if yes, include commit hash)

Deliverables:
- `docs/file-review.md` (table or list with per-file notes)

## 5) Layered Deep Review
After file-level review, perform deep reviews by layer to ensure cross-cutting correctness.

### 5.1 App Router and Pages (`app/`)
- Validate layout nesting, loading/error/not-found usage, and boundary placement.
- Confirm route segments align with permissions and auth requirements.
- Check for consistent data fetching, caching, and revalidation strategies.

### 5.2 Components (`components/`)
- Review UI component contracts, prop naming, and shared state usage.
- Check for duplicated UI logic or inconsistent UI patterns.
- Ensure accessibility and consistent styling patterns.

### 5.3 Data and Actions (`lib/`, `lib/actions`, `lib/db`, `lib/dal`)
- Verify DAL separation and consistent error handling.
- Identify raw SQL or unsafe queries.
- Validate transactions, indexes, and query performance.

### 5.4 Auth, Security, and Permissions
- Trace auth/session usage through server components and routes.
- Validate access control in actions and API routes.
- Check secrets usage, env validation, and token handling.

#### Codebase-Specific Security Checks:
- Review verifySession() usage consistency across all server actions
- Validate isMember() and canModerate() authorization checks
- Audit logModerationAction() coverage for sensitive operations
- Review sanitizeText() and DOMPurify usage for all user content
- Check rate limit configuration per action type (lib/rate-limit.ts)
- Validate file upload restrictions (size, type, destination)
- Review B2/S3 presigned URL expiration and access controls

### 5.5 Real-time and Background (Ably, events, notifications)
- Validate channel naming and auth for real-time updates.
- Review rate limit logic.
- Check for event ordering, retries, and idempotency.

#### Ably-Specific Patterns to Review:
- **Message throttling**: 50ms batching in useAblyChannel - is this sufficient?
- **Deduplication**: 500 message ID cache - potential memory/correctness issues?
- **Presence ref counting**: Verify no leaks in rapid mount/unmount scenarios
- **Token security**: Validate granular capability assignments per channel type
- **Rate limit handling**: Confirm graceful degradation under load
- **Connection state management**: Review reconnection logic and timeout values

### 5.6 Email/Notifications
- Validate templates and input sanitization.
- Ensure delivery is gated by permissions and opt-in logic.

### 5.7 Infrastructure and Config
- `next.config.mjs`, `middleware.ts`, `sentry.*`, `Dockerfile`, `fly.toml`.
- Confirm deployment paths, environment variables, and build assumptions.

#### Edge Runtime Constraints:
- Identify what runs in Edge vs Node runtime (middleware, specific routes)
- Check for Node.js API usage in Edge contexts (fs, crypto, Buffer limitations)
- Validate package compatibility with Edge runtime (some npm packages fail silently)
- Review `runtime: 'edge'` declarations and their implications
- Test middleware behavior matches Node behavior for auth/redirects

#### Configuration Drift:
- Audit env var definitions across: `.env*`, `fly.toml`, `next.config.mjs`, `sentry.*.config.ts`
- Verify required env vars are documented and validated at startup
- Check for hardcoded values that should be environment-specific
- Ensure Sentry environment/release tags match deployment context
- Validate secrets are not duplicated or inconsistent across configs

### 5.8 Rich Text Editor (TipTap)
- Review TipTap configuration and enabled extensions (tables, code blocks, images, links)
- Validate HTML output sanitization before storage and rendering
- Check for XSS vectors in user-generated rich content
- Review image upload handling within the editor
- Validate link handling and potential open redirect issues

### 5.9 Optimistic UI Patterns
- Review clientMessageId generation and uniqueness guarantees
- Validate optimistic message insertion and server reconciliation
- Check error handling when optimistic updates fail
- Review race conditions between local state and Ably broadcasts
- Verify notification deduplication doesn't suppress valid notifications

### 5.10 Data Consistency and Caching
- Map all state sources: server actions, client React state, Ably real-time updates, any SWR/React Query caches
- Identify potential staleness windows between database writes and UI updates
- Review cache invalidation strategies after mutations (revalidatePath, revalidateTag usage)
- Check for "double update" bugs (server action returns data + Ably broadcasts same change)
- Validate ordering guarantees when multiple state sources update simultaneously
- Review error recovery: what happens when one layer succeeds but another fails?
- Audit places where client state can diverge from server truth

Deliverables:
- `docs/layer-review.md` with findings and cross-cutting issues.

## 6) Database and Prisma Review
- Validate schema design, relations, constraints, and indexes.
- Audit migrations for safety and reversibility.
- Review seed data and local dev workflow.
- Check for N+1 issues or heavy queries.

#### Migration Safety (Production Data):
- Identify large tables where ALTER operations may lock for extended periods
- Review migrations for: adding NOT NULL without defaults, adding indexes on large tables
- Check for migrations that require backfills (strategy: batched? background job?)
- Validate rollback safety: can each migration be reversed without data loss?
- Flag any migrations that should be split into deploy-time vs post-deploy phases
- Review foreign key additions on populated tables (lock implications)

#### Schema-Specific Review Points:
- **Depth fields**: Validate race-safe enforcement for Message.depth and Comment.depth
- **Vote caching**: Review PostVote/CommentVote aggregation and voteScore consistency
- **Thread counts**: Validate replyCount cache invalidation logic
- **Cascade deletes**: Audit all onDelete: Cascade for unintended data loss
- **Index coverage**: Check compound indexes for common query patterns (community + createdAt, userId + isRead)
- **Unique constraints**: Validate all uniqueness assumptions (slugs, reactions, votes)

Deliverables:
- `docs/db-review.md` with schema notes and migration risks.

## 7) Testing Strategy Review
- Map tests to features and critical flows.
- Identify gaps: auth, permissions, data integrity, forms, and API routes.
- Recommend test additions with priority order.

Deliverables:
- `docs/test-gaps.md` with prioritized gaps.

## 8) Performance and Observability
- Identify render waterfalls and large client bundles.
- Review caching behavior and server actions usage.
- Validate Sentry instrumentation and logging.

#### React 19 / Next.js 16 Specific:
- Review Server Component vs Client Component boundaries
- Validate useTransition usage in form submissions (useFormSubmit hook)
- Check for unnecessary client-side JavaScript in server-renderable components
- Review Suspense boundary placement and loading states
- Audit "use client" directive usage - minimize client bundle

Deliverables:
- `docs/perf-observability.md` with hot spots and proposals.

## 9) Refactor and Optimization Plan
Convert findings into a prioritized, staged plan.

### 9.1 Prioritization
- P0: correctness/security/data loss
- P1: reliability/performance/bad UX
- P2: maintainability/readability
- P3: nice-to-have cleanup

### 9.2 Effort and Risk
- Provide rough estimates and rollout strategy.
- Identify changes that need feature flags or migrations.

Deliverables:
- `docs/refactor-plan.md`

## 10) Execution Cadence
- Review in passes: quick scan -> deep review (fixing P0s and small issues as found)
- Commit fixes atomically as you go; don't batch unrelated fixes
- Daily output: file review notes + risk list + list of commits made
- Weekly output: consolidated refactor plan for remaining issues

## 11) Definition of Done
- Every file reviewed with checklist and notes.
- All P0 issues fixed (or explicitly deferred with justification).
- Critical issues identified and prioritized.
- Architecture map documented.
- Refactor plan for remaining issues approved and tracked.

---

## Appendix A: Suggested Review Commands
- File inventory: `rg --files -g '!node_modules/**'`
- Lint: `npm run lint`
- Build: `npm run build`
- Tests: `npm run test`
- Server actions inventory: `rg "use server" lib/actions/`
- Rate limit configs: `rg "Ratelimit" lib/`
- Ably channel patterns: `rg "publishToChannel|subscribe" lib/ hooks/`
- Auth checks: `rg "verifySession|isMember|canModerate" lib/`
- Sanitization: `rg "sanitize|DOMPurify" lib/ components/`

## Appendix B: Per-File Review Template
Use this template for each file in `docs/file-review.md`.

```
File:
Purpose:
Key dependencies:
Risks:
Notes:
Actions:
Fixed: (none | commit hash + description)
```

## Appendix C: Layer Map Template
```
UI (app/, components/)
  -> actions (lib/actions)
    -> DAL (lib/dal, lib/db)
      -> Prisma (prisma/schema.prisma)
```

## Appendix D: Critical Files Quick Reference

| Area | Key Files |
|------|-----------|
| Auth | `lib/auth.ts`, `middleware.ts` |
| Real-time | `lib/ably.ts`, `lib/ably-client.ts`, `hooks/use-ably.ts` |
| Server Actions | `lib/actions/*.ts` |
| Database Queries | `lib/db/*.ts` |
| Validation | `lib/validations/*.ts` |
| Security Utils | `lib/utils/sanitize.ts`, `lib/rate-limit.ts` |
| Presence | `contexts/presence-context.tsx` |
| Chat UI | `components/chat/*.tsx` |
| Schema | `prisma/schema.prisma` |
