# Hive Community MVP - Implementation Execution Plan

> **Purpose**: This document provides phase-by-phase implementation instructions for building the Hive Community MVP. Each phase includes a complete prompt that can be given to Claude (or any AI assistant) along with guardrails, success criteria, and quality standards.

> **Prerequisites**: Read `mvp-plan.md` before starting any phase. Each Claude instance should have access to both this plan and the MVP plan.

---

## Code Quality Standards (Apply to ALL Phases)

### Architectural Principles
1. **Server Components First**: Use React Server Components by default, Client Components only when needed
2. **Server Actions for Mutations**: All data mutations through Server Actions, no API routes unless required
3. **Type Safety**: Full TypeScript with no `any` types, strict mode enabled
4. **Error Handling**: All async operations must have try-catch, errors sent to Sentry
5. **Separation of Concerns**: Database logic in `/lib/db`, business logic in `/lib/actions`, UI in `/app`

### File Organization
```
/hive-community
├── /app                    # Next.js App Router
│   ├── /api               # API routes (minimal, only for webhooks)
│   ├── /(auth)            # Auth route group
│   ├── /(app)             # Protected app route group
│   └── layout.tsx         # Root layout
├── /components
│   ├── /ui                # shadcn/ui components
│   └── /features          # Feature-specific components
├── /lib
│   ├── /actions           # Server Actions
│   ├── /db                # Database queries
│   ├── /utils             # Utility functions
│   ├── auth.ts            # Auth.js config
│   ├── prisma.ts          # Prisma client
│   └── dal.ts             # Data Access Layer
├── /prisma
│   ├── schema.prisma
│   ├── seed.ts
│   └── /migrations
└── /public
```

### Code Style Guardrails
- **No TODO comments**: If something isn't implemented, create a GitHub issue
- **No console.log**: Use `console.error` until Sentry is enabled (Phase 7), then Sentry only
- **No inline styles**: Use Tailwind classes only
- **No magic numbers**: Extract to constants
- **DRY Principle**: If code repeats 3+ times, extract to function/component
- **Single Responsibility**: Functions do one thing, components render one concept
- **Naming**: `camelCase` for functions/variables, `PascalCase` for components/types
- **Comments**: Explain "why" not "what", JSDoc for public functions

### Testing Requirements
- Each Server Action must have error handling tested
- Each form must have validation edge cases covered
- Each protected route must have auth checks verified
- Manual testing checklist provided at end of each phase

---

## Phase 1: Project Foundation

### Objective
Initialize Next.js 16 project with Tailwind 4, TypeScript, and development tooling. Establish design system and project structure.

### Prompt for Claude

```
I'm implementing Phase 1 of the Hive Community MVP (see implementation-plan.md and mvp-plan.md).

Create a Next.js 16 project with the following requirements:

1. Initialize Next.js 16.1.0 with TypeScript and App Router
2. Configure Tailwind CSS 4.1.0 with the design system from mvp-plan.md
3. Set up TypeScript strict mode configuration
4. Install all dependencies from mvp-plan.md package.json
5. Create the project folder structure (see Code Quality Standards)
6. Set up environment variable validation with Zod
7. Configure Turbopack for development
8. Create initial globals.css with design tokens
9. Create initial layout.tsx with font configuration

GUARDRAILS:
- Use exact versions specified in mvp-plan.md
- Tailwind 4 uses CSS-based @theme configuration in globals.css (NOT tailwind.config.js)
- DO NOT create a tailwind.config.js or tailwind.config.ts file - all config in CSS
- All environment variables must be validated before app starts
- No placeholder/dummy content - only production-ready code
- TypeScript strict mode must be enabled

SUCCESS CRITERIA:
- `npm run dev --turbopack` starts without errors
- All TypeScript files compile with no errors
- Design tokens are accessible via Tailwind classes
- Environment validation throws clear errors for missing vars
- Project structure matches specified architecture

Provide a testing checklist when complete.
```

### Files Created
- `package.json` - Dependencies with exact versions
- `tsconfig.json` - Strict TypeScript configuration
- `next.config.mjs` - Next.js configuration
- `app/globals.css` - Design tokens and Tailwind imports
- `app/layout.tsx` - Root layout with fonts
- `lib/env.ts` - Zod environment validation
- `.env.example` - Environment variable template
- `.gitignore` - Standard Next.js gitignore
- `README.md` - Project setup instructions

### Success Criteria Checklist
- [ ] Dev server starts with `npm run dev --turbopack`
- [ ] TypeScript compiles with no errors (`tsc --noEmit`)
- [ ] All design token colors accessible (test: `className="bg-primary-500"`)
- [ ] Environment validation rejects missing required vars
- [ ] Folder structure matches specification
- [ ] No warnings in console on dev server start

### Dependencies
None (first phase)

### Estimated Complexity
**Low** - Standard setup with modern tools

---

## Phase 2: Database & Infrastructure

### Objective
Implement Prisma schema, connect to Neon Postgres, create migrations, seed database, and build core database utilities.

### Prompt for Claude

```
I'm implementing Phase 2 of the Hive Community MVP (see implementation-plan.md and mvp-plan.md).

Implement the database layer with these requirements:

1. Create complete Prisma schema from mvp-plan.md (User, Community, Member, Event, RSVP models)
2. Configure Prisma client with Neon connection pooling (prevents connection exhaustion)
3. Run `npx prisma generate` before writing seed script (generates types needed)
4. Create database utility functions in /lib/db for common queries
5. Implement seed script with realistic test data (3 communities, 10 users, 5 events)
6. Create initial migration
7. Build Data Access Layer (DAL) in /lib/dal.ts with session helpers
8. Add database error handling utilities

GUARDRAILS:
- Prisma schema must match mvp-plan.md exactly (ONLY owner and member roles, no admin)
- All relations must be properly defined with referential integrity
- Seed data must be realistic (real names, descriptions, future dates for events)
- No raw SQL - use Prisma only
- All database functions must have TypeScript return types
- Use Neon pooling to avoid connection exhaustion in production
- Include immutability comments on slug fields
- Must run `npx prisma generate` BEFORE writing seed.ts (needed for type imports)

SUCCESS CRITERIA:
- `npx prisma db push` succeeds
- `npm run db:seed` populates database with test data
- Prisma Studio shows all tables and relations correctly
- Database queries are type-safe
- DAL helper functions work correctly
- No console warnings from Prisma

Provide realistic seed data examples and a testing checklist when complete.
```

### Files Created
- `prisma/schema.prisma` - Complete database schema
- `prisma/seed.ts` - Seed script with test data
- `lib/prisma.ts` - Singleton Prisma client
- `lib/dal.ts` - Data Access Layer helpers
- `lib/db/users.ts` - User query functions
- `lib/db/communities.ts` - Community query functions
- `lib/db/events.ts` - Event query functions
- `.env` - Database connection string (local)

### Success Criteria Checklist
- [ ] `npx prisma generate` completes successfully
- [ ] `npx prisma db push` creates all tables
- [ ] `npm run db:seed` populates database without errors
- [ ] Prisma Studio (`npx prisma studio`) shows data correctly
- [ ] All model relations are bidirectional and working
- [ ] Seed creates: 10 users, 3 communities, 5 events, 15+ memberships
- [ ] Type safety: `prisma.user.findUnique()` has proper types
- [ ] No TypeScript errors in any database files

### Dependencies
**Requires**: Phase 1 complete (environment validation needed for DATABASE_URL)

### Estimated Complexity
**Medium** - Schema is complex with multiple relations

---

## Phase 3: Authentication System

### Objective
Implement Auth.js v5 with email magic links, session management, and protected route middleware.

### Prompt for Claude

```
I'm implementing Phase 3 of the Hive Community MVP (see implementation-plan.md and mvp-plan.md).

Build the authentication system with these requirements:

1. Configure Auth.js v5 beta with Prisma adapter
2. Set up email magic link provider using Resend
3. Create email templates for magic link (branded, accessible HTML)
4. Implement session management with secure cookie configuration
5. Create middleware for protected routes
6. Build sign-in page with email form (React Hook Form + Zod)
7. Build email verification success/error pages
8. Add sign-out functionality
9. Implement rate limiting for auth endpoints
10. Add dev-only login bypass (NODE_ENV=development only, skips email)

GUARDRAILS:
- Email templates must be accessible (semantic HTML, plain text fallback)
- Magic links must expire after 24 hours
- Rate limit: 3 auth attempts per 15 minutes per IP
- All auth routes must handle errors gracefully (show user-friendly messages)
- Session cookies must be httpOnly, secure, sameSite
- No passwords stored anywhere
- Must work in development (http://localhost) and production (https)
- Dev login bypass must ONLY work when NODE_ENV === "development" (hard fail in prod)

SUCCESS CRITERIA:
- User can request magic link with email address
- Email arrives within 30 seconds (check spam folder)
- Clicking magic link logs user in and redirects to /communities
- Session persists across page refreshes
- Protected routes redirect to sign-in when unauthenticated
- Sign-out clears session completely
- Rate limiting blocks after 3 attempts
- Email template displays correctly in Gmail, Outlook, Apple Mail

Provide testing checklist and email template preview when complete.
```

### Files Created
- `lib/auth.ts` - Auth.js configuration
- `lib/auth-config.ts` - Auth.js options and callbacks
- `lib/email/templates.tsx` - Email templates
- `lib/rate-limit.ts` - Rate limiting utilities
- `middleware.ts` - Route protection and CSP
- `app/(auth)/sign-in/page.tsx` - Sign-in page
- `app/(auth)/verify-request/page.tsx` - Check email page
- `app/(auth)/error/page.tsx` - Auth error page
- `app/api/auth/[...nextauth]/route.ts` - Auth.js API route
- `components/auth/sign-out-button.tsx` - Sign out component

### Success Criteria Checklist
- [ ] Sign-in form submits successfully
- [ ] Magic link email received (check spam)
- [ ] Email template renders correctly in 3+ email clients
- [ ] Clicking magic link logs user in
- [ ] Session persists after page refresh
- [ ] Accessing /communities while logged out redirects to /sign-in
- [ ] Sign-out button clears session
- [ ] Rate limiting blocks after 3 attempts
- [ ] Auth errors show user-friendly messages
- [ ] No console errors during auth flow

### Dependencies
**Requires**: Phase 2 complete (Prisma schema and client needed)

### Estimated Complexity
**High** - Auth is complex, email delivery can be tricky

---

## Phase 4: Community Features

### Objective
Implement community CRUD operations, member management, role-based permissions, and community discovery.

### Prompt for Claude

```
I'm implementing Phase 4 of the Hive Community MVP (see implementation-plan.md and mvp-plan.md).

Build the community management system with these requirements:

1. Create Server Actions for community operations (create, update, delete, join, leave)
2. Implement role-based authorization (ONLY owner and member - no admin role for MVP)
3. Build community creation form (no image upload for MVP)
4. Build community settings page (edit name, description, type - owner only)
5. Build member management UI (list members, remove members - owner only)
6. Implement community discovery page (all communities, search, filter by type)
7. Build individual community page with member list and events
8. Add authorization checks to all actions (owner-only operations clearly enforced)
9. Implement member removal with event ownership transfer

GUARDRAILS:
- All mutations must go through Server Actions (no API routes except Auth.js)
- Authorization must be checked server-side in every action
- Forms must use React Hook Form + Zod validation
- All user inputs must be sanitized (DOMPurify for descriptions)
- Community slugs are immutable (show error if user tries to change)
- Deleting community must cascade (delete all events, memberships)
- Last owner cannot leave community (must transfer ownership first or delete community)
- Search must be case-insensitive and trim whitespace
- ONLY two roles: owner and member (no admin role to keep MVP simple)

SUCCESS CRITERIA:
- Owner can create community with name, description, type
- Owner can edit community settings
- Owner can delete community (with confirmation)
- Members can join/leave public communities
- Owner can remove members (transfers event ownership)
- Member removal transfers their event ownership to removing user
- Discovery page shows all communities with search/filter
- Unauthorized actions show clear error messages (non-owners cannot edit)
- All forms have proper validation and error states

Provide component structure diagram and testing checklist when complete.
```

### Files Created
- `lib/actions/communities.ts` - Community Server Actions
- `lib/actions/members.ts` - Member management Server Actions
- `lib/db/communities.ts` - Community queries (enhanced)
- `lib/db/members.ts` - Member queries
- `lib/utils/permissions.ts` - Permission checking utilities
- `lib/utils/sanitize.ts` - Input sanitization utilities
- `app/(app)/communities/page.tsx` - Community discovery
- `app/(app)/communities/new/page.tsx` - Create community
- `app/(app)/communities/[slug]/page.tsx` - Community detail
- `app/(app)/communities/[slug]/settings/page.tsx` - Community settings
- `app/(app)/communities/[slug]/members/page.tsx` - Member management
- `components/communities/community-form.tsx` - Community form component
- `components/communities/community-card.tsx` - Community card
- `components/communities/member-list.tsx` - Member list component
- `components/communities/join-button.tsx` - Join/leave button

### Success Criteria Checklist
- [ ] Create community form validates all fields
- [ ] New community appears in discovery page
- [ ] Joining public community adds user to members
- [ ] Owner can access settings page
- [ ] Non-owner cannot access settings (shows 403)
- [ ] Admin can promote member to admin
- [ ] Owner can remove member (events transfer ownership)
- [ ] Search filters communities correctly
- [ ] Type filter (public/private) works
- [ ] Delete community shows confirmation dialog
- [ ] All forms show validation errors inline
- [ ] Success/error toasts appear for all actions

### Dependencies
**Requires**: Phase 3 complete (authentication needed for all operations)

### Estimated Complexity
**High** - Complex authorization logic and multiple related features

---

## Phase 5: Event Features

### Objective
Implement event CRUD operations, RSVP system, event discovery, and organizer management.

### Prompt for Claude

```
I'm implementing Phase 5 of the Hive Community MVP (see implementation-plan.md and mvp-plan.md).

Build the event management system with these requirements:

1. Create Server Actions for event operations (create, update, delete, RSVP, cancel RSVP)
2. Build event creation form with date/time pickers and capacity limits
3. Build event detail page with RSVP list and status
4. Implement RSVP system with capacity tracking (going status only, "full" when at capacity)
5. Build event discovery (all events, filter by date, community, RSVP status)
6. Add co-organizer management (add/remove co-organizers)
7. Implement optimistic UI for RSVP actions (immediate feedback)
8. Add authorization (only organizers can edit/delete events)
9. Build "My Events" page (created, RSVPed, organized)

GUARDRAILS:
- Event dates must be in the future (validation on create/update)
- RSVP capacity: When full, show "Event Full" and block new RSVPs (NO waitlist for MVP)
- Only organizers (creator + co-organizers) can edit/delete events
- Community members only can create events in that community
- Deleting event must cascade (delete all RSVPs)
- RSVPs must prevent duplicates (one per user per event)
- Date/time: Store in UTC, display in user's local timezone
- Date picker must show timezone label: "Enter times in your local timezone ({User's Timezone})"
- Search must work across event title and description
- Optimistic UI: RSVP button updates immediately, reverts on error

SUCCESS CRITERIA:
- Member can create event in their community
- Event form validates dates (must be future), capacity (optional)
- Users can RSVP to events (status: going)
- RSVP list shows user names and status
- Capacity limit shows "Event Full" and blocks new RSVPs
- User can cancel their RSVP
- Event discovery shows upcoming events only
- Filter by community works
- "My Events" shows correct categorization
- Organizers can edit event details
- Non-organizers cannot edit (shows 403)
- RSVP button updates optimistically (immediate visual feedback)
- Timezone label shows in date picker

Provide event state diagram and testing checklist when complete.
```

### Files Created
- `lib/actions/events.ts` - Event Server Actions
- `lib/actions/rsvps.ts` - RSVP Server Actions
- `lib/db/events.ts` - Event queries (enhanced)
- `lib/db/rsvps.ts` - RSVP queries
- `lib/utils/dates.ts` - Date utilities (timezone handling)
- `lib/hooks/use-optimistic-rsvp.ts` - Optimistic RSVP hook
- `app/(app)/events/page.tsx` - Event discovery
- `app/(app)/events/my-events/page.tsx` - My events
- `app/(app)/communities/[slug]/events/new/page.tsx` - Create event
- `app/(app)/events/[id]/page.tsx` - Event detail
- `app/(app)/events/[id]/edit/page.tsx` - Edit event
- `components/events/event-form.tsx` - Event form component
- `components/events/event-card.tsx` - Event card
- `components/events/rsvp-button.tsx` - RSVP button with optimistic updates
- `components/events/rsvp-list.tsx` - RSVP list component
- `components/events/date-picker.tsx` - Date picker with timezone label

### Success Criteria Checklist
- [ ] Create event form validates all fields
- [ ] New event appears in community events
- [ ] User can RSVP to event (status: going)
- [ ] RSVP appears in event detail page
- [ ] User can cancel RSVP
- [ ] Capacity limit shows "Event Full" and blocks new RSVPs
- [ ] RSVP button shows optimistic update (immediate feedback)
- [ ] Event discovery filters work (date, community)
- [ ] "My Events" categorizes correctly
- [ ] Organizer can edit event
- [ ] Non-organizer cannot edit (403)
- [ ] Event deletion shows confirmation
- [ ] Dates display in correct timezone
- [ ] Timezone label visible in date picker
- [ ] Past events don't show in discovery

### Dependencies
**Requires**: Phase 4 complete (community membership needed to create events)

### Estimated Complexity
**High** - Complex RSVP logic, date handling, and authorization

---

## Phase 6: UI & Error Handling

### Objective
Implement shadcn/ui component library, build all remaining UI pages, add error boundaries, and implement toast notifications.

### Prompt for Claude

```
I'm implementing Phase 6 of the Hive Community MVP (see implementation-plan.md and mvp-plan.md).

Polish the UI and error handling with these requirements:

1. Install and configure shadcn/ui components (Button, Form, Input, Card, Dialog, etc.)
2. Build dashboard/home page with recent activity and stats
3. Build user profile page with communities and events
4. Implement error boundaries with reset functionality (router.refresh() + reset())
5. Add toast notifications for all user actions (Sonner)
6. Create loading states for all async operations
7. Build 404 and 500 error pages
8. Add form field errors with proper ARIA labels
9. Add confirmation dialogs for destructive actions
10. Polish all UI for consistency and accessibility

GUARDRAILS:
- All interactive elements must be keyboard accessible
- Error messages must be user-friendly (no stack traces shown to users)
- Loading states must be visible within 100ms of action
- Toasts must auto-dismiss after 3-5 seconds
- Confirmation dialogs required for: delete community, delete event, remove member
- Error boundaries must log to console.error (Sentry comes in Phase 7)
- Error boundary must include Reset button that calls router.refresh() and reset()
- All forms must disable submit button while loading
- Use Suspense boundaries for data fetching

SUCCESS CRITERIA:
- Dashboard shows user stats (communities joined, events created, RSVPs)
- Profile page displays user info and activity
- All buttons use shadcn/ui Button component
- Form validation shows inline errors
- Error boundary catches and displays errors gracefully
- Error boundary Reset button clears error and refreshes router cache
- Toasts appear for all mutations (success and error)
- Loading spinners show during async operations
- 404 page displays for invalid routes
- Keyboard navigation works for all interactive elements
- Confirmation dialogs prevent accidental deletions

Provide accessibility checklist and testing guide when complete.
```

### Files Created
- `components/ui/*` - shadcn/ui components (Button, Form, Input, Card, etc.)
- `app/(app)/page.tsx` - Dashboard/home page
- `app/(app)/profile/page.tsx` - User profile page
- `app/error.tsx` - Global error boundary (with Reset button)
- `app/not-found.tsx` - 404 page
- `components/error-boundary.tsx` - Reusable error boundary (with router.refresh())
- `components/ui/loading-spinner.tsx` - Loading spinner
- `components/ui/confirmation-dialog.tsx` - Confirmation dialog
- `lib/utils/toast.ts` - Toast notification helpers
- `components/layout/header.tsx` - App header with navigation
- `components/layout/footer.tsx` - App footer

### Success Criteria Checklist
- [ ] Dashboard renders without errors
- [ ] Dashboard shows correct user stats
- [ ] Profile page displays user info
- [ ] All buttons styled consistently with shadcn/ui
- [ ] Form errors display inline with red text
- [ ] Error boundary catches errors and shows fallback UI
- [ ] Success toast appears after creating community
- [ ] Error toast appears when action fails
- [ ] Loading spinner shows during form submission
- [ ] 404 page displays for /invalid-route
- [ ] Tab key navigates through interactive elements
- [ ] Enter key submits forms
- [ ] Delete community shows confirmation dialog
- [ ] Optimistic update shows RSVP immediately

### Dependencies
**Requires**: Phases 4-5 complete (needs community and event features to display)

### Estimated Complexity
**Medium** - UI work is straightforward, but comprehensive

---

## Phase 7: Security & Deployment

### Objective
Implement Sentry monitoring, security headers, CSP, rate limiting, and deploy to production.

### Prompt for Claude

```
I'm implementing Phase 7 of the Hive Community MVP (see implementation-plan.md and mvp-plan.md).

Finalize security and deploy with these requirements:

1. Install and configure Sentry for error monitoring (client, server, edge)
2. Implement Content Security Policy with nonces
3. Add security headers to next.config.mjs
4. Implement rate limiting on all auth and mutation endpoints
5. Add input sanitization to all user-generated content
6. Configure production environment variables
7. Set up Fly.io or Railway deployment
8. Create deployment documentation
9. Run security audit (npm audit, check dependencies)
10. Create production readiness checklist

GUARDRAILS:
- Sentry must only run in production (disabled in dev)
- CSP must not break any functionality (test thoroughly)
- Rate limiting must not affect normal usage (10 req/10s general, 3 req/15m auth)
- All secrets must be in environment variables (no hardcoded keys)
- Security headers must include: HSTS, X-Frame-Options, X-Content-Type-Options
- Input sanitization must allow safe HTML only (no script tags)
- Deployment must use Node.js server mode (not static export)
- Database must use connection pooling

SUCCESS CRITERIA:
- Sentry captures errors in production
- CSP blocks inline scripts (nonce required)
- Security headers present in all responses
- Rate limiting blocks excessive requests
- User input sanitized (test with <script>alert(1)</script>)
- App deploys successfully to Fly.io/Railway
- Environment variables configured correctly
- No vulnerabilities in npm audit
- Health check endpoint responds
- Production app loads under 3 seconds

Provide deployment guide and security audit report when complete.
```

### Files Created
- `sentry.client.config.ts` - Sentry client configuration
- `sentry.server.config.ts` - Sentry server configuration
- `sentry.edge.config.ts` - Sentry edge configuration
- `middleware.ts` - CSP and security headers (enhanced)
- `next.config.mjs` - Sentry integration (enhanced)
- `lib/rate-limit.ts` - Rate limiting utilities (enhanced)
- `lib/utils/sanitize.ts` - Input sanitization (enhanced)
- `fly.toml` - Fly.io configuration
- `railway.json` - Railway configuration
- `.env.production.example` - Production env template
- `DEPLOYMENT.md` - Deployment documentation
- `SECURITY.md` - Security documentation

### Success Criteria Checklist
- [ ] Sentry project created and DSN configured
- [ ] Test error appears in Sentry dashboard
- [ ] CSP headers present in production
- [ ] Security headers verified with securityheaders.com
- [ ] Rate limit blocks after threshold
- [ ] XSS attempt sanitized (test: `<script>alert(1)</script>`)
- [ ] App deployed to Fly.io/Railway
- [ ] Production database connected
- [ ] Environment variables set correctly
- [ ] npm audit shows 0 high/critical vulnerabilities
- [ ] Health check returns 200
- [ ] App loads in under 3 seconds
- [ ] SSL certificate valid

### Dependencies
**Requires**: Phases 1-6 complete (full app must be functional)

### Estimated Complexity
**Medium** - Configuration-heavy, but well-documented

---

## Cross-Phase Quality Assurance

### After Each Phase
Run these checks before moving to next phase:

```bash
# TypeScript compilation
npm run build

# Type checking
npx tsc --noEmit

# Linting (if configured)
npm run lint

# Database schema validation
npx prisma validate

# Dependency audit
npm audit
```

### Manual Testing Template
```markdown
## Phase X Testing Results

Date: YYYY-MM-DD
Tester: [Name]

### Functional Tests
- [ ] Test case 1: [Description] - PASS/FAIL
- [ ] Test case 2: [Description] - PASS/FAIL

### Edge Cases
- [ ] Edge case 1: [Description] - PASS/FAIL

### Browser Compatibility
- [ ] Chrome: PASS/FAIL
- [ ] Firefox: PASS/FAIL
- [ ] Safari: PASS/FAIL

### Accessibility
- [ ] Keyboard navigation: PASS/FAIL
- [ ] Screen reader: PASS/FAIL

### Notes
[Any issues or observations]
```

---

## Handoff Documentation

### For Engineering Team

When MVP is complete, provide:

1. **Architecture Document** (`ARCHITECTURE.md`)
   - System overview diagram
   - Data flow diagrams
   - Authentication flow
   - Authorization model
   - Database schema with explanations

2. **Development Guide** (`DEVELOPMENT.md`)
   - Local setup instructions
   - Development workflow
   - Testing strategy
   - Debugging tips
   - Common issues and solutions

3. **API Documentation** (`API.md`)
   - All Server Actions with parameters
   - Response types
   - Error codes
   - Rate limits
   - Example requests

4. **Deployment Guide** (`DEPLOYMENT.md`)
   - Environment setup
   - Deployment steps
   - Rollback procedures
   - Monitoring and alerts
   - Backup/restore procedures

5. **Contributing Guide** (`CONTRIBUTING.md`)
   - Code style guide
   - Branching strategy
   - Pull request process
   - Review checklist

---

## Emergency Rollback Plan

If any phase fails catastrophically:

1. **Identify Last Working Commit**
   ```bash
   git log --oneline
   git checkout <last-working-commit>
   ```

2. **Document What Broke**
   - Create GitHub issue with error details
   - Include steps to reproduce
   - Note environment details

3. **Fix Forward or Revert**
   - If fixable in <1 hour: fix forward
   - If complex: revert and re-plan

4. **Update Implementation Plan**
   - Add learnings to guardrails
   - Update success criteria
   - Note gotchas for future

---

## Success Metrics

### MVP Complete When:
- [ ] All 7 phases complete with passing tests
- [ ] App deployed to production
- [ ] Security audit passed
- [ ] Performance benchmarks met (< 3s load, < 100ms interactions)
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Handoff documentation complete
- [ ] Engineering team trained on codebase

### Performance Benchmarks
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: > 90
- **Database Queries**: < 100ms p95
- **Server Actions**: < 500ms p95

---

## Notes for Claude Instances

When starting a new phase:

1. **Read both documents**: `mvp-plan.md` and `implementation-plan.md`
2. **Verify previous phase**: Check that dependencies are complete
3. **Use the exact prompt**: Copy the prompt from this doc
4. **Follow guardrails strictly**: No shortcuts or workarounds
5. **Test before completing**: Run all success criteria checks
6. **Document deviations**: If you must deviate, explain why in code comments
7. **Update TODO list**: Track sub-tasks within each phase

### Context for Cross-Instance Work
Each prompt is self-contained and references the source documents. A new Claude instance should:
- Have access to `mvp-plan.md` and `implementation-plan.md`
- Read both documents fully before starting
- Ask for clarification if any spec is ambiguous
- Not make assumptions about earlier phases

---

## Revision History

- **v1.0** - 2026-01-19 - Initial implementation plan created
- **v1.1** - 2026-01-19 - Critical improvements based on expert review:
  - **Fixed Server Actions vs API routes conflict**: Updated mvp-plan.md to use Server Actions everywhere (removed API route examples in Security section)
  - **Phase 1**: Added explicit Tailwind v4 anti-hallucination guardrail (no tailwind.config.js)
  - **Phase 2**: Fixed pooling language for long-running server, added `prisma generate` before seed
  - **Phase 3**: Added dev-only login bypass to avoid email wait times during development
  - **Phase 4**: Removed admin role (MVP uses ONLY owner + member roles for simplicity)
  - **Phase 5**: Clarified RSVP logic (no waitlist, just "Event Full"), added timezone labeling, moved optimistic UI here from Phase 6
  - **Phase 6**: Added error boundary reset with router.refresh() + reset() to prevent error loops
  - **Global**: Fixed console.log rule (allow console.error until Sentry in Phase 7)

---

**End of Implementation Plan**

*This plan is a living document. Update it as you learn during implementation.*
