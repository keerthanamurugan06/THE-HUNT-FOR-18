# THE HUNT FOR 18 – Development History

This file records the project's planning and implementation history.

Every meaningful milestone, decision, bug, correction and implementation change must be recorded.

## Project Initialization

**Date:** 19 November 2026

### Milestone 1 – Repository Setup
- Created private GitHub repository: THE-HUNT-FOR-18.
- Cloned repository into VS Code.
- Opened the repository on the main branch.

### Milestone 2 – Documentation Foundation
Created the following documentation structure:

- `.github/copilot-instructions.md`
- `docs/PROJECT_OVERVIEW.md`
- `docs/EVENT_STORYLINE.md`
- `docs/ROUND_1.md`
- `docs/ROUND_2.md`
- `docs/ROUND_3.md`
- `docs/FINAL_ROUND.md`
- `docs/TECHNICAL_ARCHITECTURE.md`
- `docs/DATABASE_DESIGN.md`
- `docs/DESIGN_DECISIONS.md`
- `docs/DEVELOPMENT_HISTORY.md`
- `docs/CURRENT_PROGRESS.md`
- `docs/NEXT_STEPS.md`
- `docs/AI_HANDOFF.md`

### Milestone 3 – Project Instructions
Created permanent GitHub Copilot instructions covering:
- Selected technology stack.
- Development workflow.
- Security requirements.
- Coding practices.
- Documentation maintenance.
- Project continuity.
- Event deadline and MVP priorities.

### Milestone 4 – Project Planning Documentation
Prepared:
- Project overview.
- Investigation storyline.
- Four round blueprints.
- Technical architecture.
- Proposed database design.
- Confirmed design decisions register.

### Development Status
- Planning and documentation: In progress.
- Application foundation: React + Vite + TypeScript initialized; application features not started.
- Initial core database migration: Completed and applied to production.
- Gameplay database migrations: Not started.
- Supabase connection: Production core schema verified.
- Authentication: Not started.
- Frontend implementation: Not started.
- Testing: Not started.
- Deployment: Not started.

## Initial Core Database Milestone

**Date:** 23 November 2026

**Phase:** Backend foundation

**Feature / Task:** Initial core Supabase PostgreSQL migration

**Files Created:** `supabase/migrations/20261122173709_initial_core_schema.sql`

**Files Modified:** Project status documentation

**Implementation Summary:**
- Created the initial core schema migration for `events`, `rounds`, `round_config`, `teams`, `team_members`, and `organizer_roles`.
- Included UUID keys, constraints, indexes, triggers, RLS policies, privileged helper functions, and explicit column privileges.
- Applied the migration successfully to the production Supabase project `the-hunt-for-18`.
- Verified that local and remote Supabase migration histories match.
- Verified all six public-schema tables exist.
- Verified the migration is committed and pushed to GitHub.
- Verified the Git working tree was clean before the status-documentation update.

**Tests Performed:** Supabase migration history and production public-schema table verification.

**Test Results:** Passed for the initial core migration scope.

**Bugs Identified:** Migration syntax and privilege corrections were made before successful production application.

**Corrections Made:** Corrected the freeze function syntax and hardened hash, freeze, and privilege definitions.

**Git Commit:** Production migration commit reference was verified in repository history; the exact hash was not supplied for this documentation entry.

**Remaining Work:**
- Implement trusted Auth and team provisioning.
- Implement remaining gameplay, submissions, scoring, evidence, timers, qualification and leaderboard tables and operations.
- Implement application interfaces.
- Complete authentication, testing and deployment.

### Copilot Usage Baseline
**Recorded:** 19 November 2026

- Initial usage status: 0%.
- Available AI credits: Unknown.
- Next reported reset: 1 December 2026.

Record actual credit usage after each development session when available.

## Team Authentication Milestone 1

**Date:** 27 November 2026

**Phase:** Participant authentication backend and frontend

**Implementation Summary:**
- Confirmed migrations `20261122173709`, `20261123213000`, and `20261126150000` applied to the separate test project `bfzlszktufjqlfiyknga`.
- Applied `20261127120000_team_login_throttling.sql` and deployed `team-login` and `provision-team` to that project only.
- Added organizer-authorized provisioning of internal Auth identities, stored bcrypt access-code verification, generic login failures, HMAC-fingerprinted attempt throttling, participant Supabase sessions, session restoration/logout and route guards.
- Added a remote test harness that refuses to create fixtures unless hosted signup is disabled; test teams are suspended because append-only audit rows prevent deleting team records. The synthetic organizer's role is removed after the test, while its Auth row must remain because the audit actor foreign key restricts deletion.
- Disabled and verified hosted Auth public signup on the test project (`disable_signup=true`).
- Fixed the `bcryptjs` default-export imports after runtime logs exposed boot failures; deployed both corrected functions and reran the remote tests.
- Remote tests passed for Auth restriction, authorized/unauthorized provisioning, valid/invalid sign-in, session persistence/restoration, protected routes, team-row/hash isolation, rate limiting and logout.
- The test harness suspended both teams, cancelled its test event, revoked temporary sessions, and removed temporary non-organizer users and the organizer role. Team-linked Auth identities and the synthetic audit actor remain due existing foreign-key and append-only audit constraints.
- Production project `wmzgcfnsgqtznueqbfzi` was not contacted or modified. No changes were committed or pushed.

**Files Created or Modified:** Authentication frontend/context, login and provisioning Edge Functions, shared function helpers, throttling/provisioning migration, remote test harness, Supabase function config, and project progress documentation.

**Tests Performed:** `npm.cmd run build` passed; `npm.cmd run lint` passed; `git diff --check` passed with Git line-ending notices. Build reports one output chunk just over 500 kB.

**Test Results:** Remote authentication fixture suite passed. Build, lint and syntax checks passed. Build reports a JavaScript chunk just over 500 kB.

**Remaining Work:** Integrate Classic Sudoku save/restore and server-side completion in the app; complete broader event-flow tests.

## Classic Sudoku Integration Milestone

**Date:** 27 November 2026

**Phase:** Round 1 Classic Sudoku persistence and completion validation

**Implementation Summary:**
- Replaced the frontend's hard-coded board/solution with the existing `load_classic_sudoku()` RPC. The client receives only public givens and the current team's board.
- Added debounced board persistence through the RLS-protected `team_sudoku_progress` table, save progress/error/retry states, restoration after client recreation, and a leave-page warning while changes are unsaved.
- Puzzle completion now calls `complete_classic_sudoku()`. The client reports success only after the RPC verifies the saved board; completed rows cannot be edited through participant RLS.
- No migration or function deployment was required. The existing Classic Sudoku progress migration was already applied to the test project.
- The remote Classic Sudoku fixture suite passed for signup configuration, organizer provisioning, initialized puzzle load, progress save/restore, clue protection, incomplete/correct completion, completed progress locking, unauthenticated completion rejection and two-team isolation.
- The suite created no deletions. It revoked temporary sessions, suspended test teams and cancelled its test event. Fixture records remain; the synthetic organizer account was banned and its organizer role row remains.
- Production was not accessed. No commit or push was made.

**Files Created:** `supabase/tests/classic-sudoku.remote.mjs`, `supabase/tests/lock-classic-test-organizers.remote.mjs`.

**Files Modified:** `src/pages/Round1Page.tsx`, `src/pages/Round1Page.css`, `docs/ROUND_1.md`, `docs/CURRENT_PROGRESS.md`, `docs/NEXT_STEPS.md`, `docs/AI_HANDOFF.md`, `docs/DATABASE_DESIGN.md`, `docs/DEVELOPMENT_HISTORY.md`.

**Tests Performed:** `npm.cmd run build`, `npm.cmd run lint`, `node --check` for the remote fixture scripts, `git diff --check`, and the test-project remote Classic Sudoku suite.

**Test Results:** All passed. The build retains a JavaScript chunk-size warning above 500 kB.

**Remaining Work:** Server-authoritative timer and evidence integration; remaining Sudoku variants require their approved rules and puzzle content. No other rounds were implemented.

### Round 1 Milestone 3 — partial local implementation

**Date:** 27 November 2026

**Feature / Task:** Shared Sudoku variant logic and open-challenge frontend.

**Files Created:** `src/lib/sudoku-rules.ts`, `scripts/test-sudoku-rules.mjs`, `scripts/generate-round1-demo.mjs` (local generator), `supabase/migrations/20261127160000_round1_open_challenge.sql` (finalized locally; dry-run only).

**Files Modified:** `src/pages/Round1Page.tsx`, `src/pages/Round1Page.css`, `src/pages/TeamHomePage.tsx`, `src/components/EvidenceBoard.tsx`, `src/App.css`, `supabase/tests/classic-sudoku.remote.mjs`, `AGENTS.md`, and Round 1/handoff/progress/roadmap documentation.

**Implementation Summary:** Added rules/conflict/uniqueness helpers and a six-entry, per-puzzle progress interface. Switching flushes the current board before changing puzzles. Owner replaced Combined with Diagonal Sudoku (Classic + both main diagonals). Each server-validated completion now returns one fixed demo victim placeholder and inserts an idempotent team-scoped unlock record. The participant Evidence Board restores and seals discoveries per team.

**Tests Performed:** six-seed local exact-one-solution/rule checks; `node --check supabase/tests/classic-sudoku.remote.mjs`; `npm.cmd run lint`; `npm.cmd run build`; `git diff --check`; `npm.cmd exec --yes --package=supabase -- supabase db push --dry-run --linked`.

**Test Results:** All six migration seed definitions passed unique-solution checks; Diagonal and variant conflict checks passed; lint/build/syntax/diff checks passed. Supabase dry run listed only migration `20261127160000_round1_open_challenge.sql` against test project `bfzlszktufjqlfiyknga`, with no changes applied. Build retains the >500 kB chunk warning. Remote integration and browser tests await migration approval/application.

**Bugs Identified / Corrections:** Fixed a tab-switch debounce race by flushing the current puzzle before changing tabs. Replaced the misleading static 20:00 display with “NOT ACTIVE.”

**Database Changes:** No remote changes. Drafted an additive migration with multi-variant schema, per-team order, secure generic load/completion RPCs and per-puzzle evidence-unlock records. It is not applied.

**Remaining Work:** Obtain approval to apply the reviewed migration to the test project; run automated remote/browser tests; verify all six puzzles and victim discovery through the hosted flow; server timer and final narrative evidence remain pending.

**Git Commit:** None; no commit or push performed.

### Round 1 Milestone 3 — hosted verification update

**Date:** 27 November 2026

**Database Changes:** Applied the owner-approved `20261127160000_round1_open_challenge.sql` and `20261127170000_round1_load_conflict_targets.sql` migrations only to test project `bfzlszktufjqlfiyknga`. The CLI verified the linked project ref immediately before each remote operation, and remote migration history confirms both migrations alongside the prior test migrations. Production was not accessed.

**Tests Performed:** Hosted team-authentication regression and full hosted Round 1 integration; `npm.cmd run lint`; `npm.cmd run build`; `node --experimental-strip-types scripts/test-sudoku-rules.mjs`; syntax checks for both remote test scripts; `git diff --check`.

**Test Results:** All listed checks passed. Hosted Round 1 verified Classic regression; all six variants loaded with a per-team 1–6 puzzle order; saved boards restored after client recreation; clues resisted edits; incomplete and incorrect boards were rejected; server validation completed each of five variants that were not already completed in the Classic regression; retries returned the same victim; six distinct unlocks persisted and were isolated from the second team; unauthenticated Round 1 RPCs were rejected. Authentication regression verified disabled public signup, organizer-only provisioning, generic invalid-credential rejection, valid sessions and restoration, participant route protection, RLS isolation, throttling and logout. Build reports a 523.8 kB minified JS chunk warning.

**Fixture Handling:** Both suites revoked temporary sessions, suspended their own temporary teams and cancelled test events. Existing data was not deleted; append-only audit-linked records remain.

**Browser Verification:** Attempted, but the computer-use runtime failed to initialize because the required kernel asset path was unavailable. No screenshots were captured; browser visual verification remains pending.

**Remaining Work:** Coordinator review of Round 1, browser verification when available, and the server-authoritative timer. Do not begin Round 2 without owner approval.

**Git Commit:** None; no commit or push performed.

### Development History Entry Template

For every future milestone, record:

**Date:**

**Phase:**

**Feature / Task:**

**Files Created:**

**Files Modified:**

**Implementation Summary:**

**Tests Performed:**

**Test Results:**

**Bugs Identified:**

**Corrections Made:**

**Copilot Credits Before:**

**Copilot Credits After:**

**Credits Consumed:**

**Git Commit:**

**Remaining Work:**

Do not claim a feature is complete unless it has been implemented and verified.
