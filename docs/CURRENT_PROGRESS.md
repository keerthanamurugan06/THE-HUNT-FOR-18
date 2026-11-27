# THE HUNT FOR 18 – Current Progress

**Last Updated:** 27 November 2026
**Event Date:** 28 November 2026
**Development Status:** Team authentication and Classic Sudoku save/restore/completion are implemented and remotely verified on the test project; the other Round 1 variants and event features remain pending

## 1. Overall Status

| Area | Status |
|---|---|
| GitHub repository | Created and cloned |
| VS Code setup | Completed |
| Copilot instructions | Prepared |
| Project overview | Prepared |
| Investigation storyline | Prepared |
| Round 1 blueprint | Prepared |
| Round 2 blueprint | Prepared |
| Round 3 blueprint | Prepared; gameplay design finalized; implementation pending |
| Final round blueprint | Prepared; detailed mechanics pending |
| Design decisions register | Prepared |
| Technical architecture | Prepared |
| Database design | Core six-table migration implemented and applied |
| Initial Supabase core migration | Completed and verified in production |
| Development history | Prepared and updated |
| Current progress tracker | Updated |
| Next steps tracker | Updated |
| AI handoff document | Updated |
| Application foundation | React + Vite + TypeScript initialized; homepage and Classic Sudoku frontend prototype implemented |
| Gameplay database migrations | Classic Sudoku progress migration applied and integrated on test project; remaining variants pending |
| Supabase integration | Four migrations verified on test project; authentication and Classic Sudoku paths tested there; production unchanged in these milestones |
| Authentication | Team ID + access code, Supabase sessions, organizer provisioning and protected routes implemented; public signup disabled on test project |
| Testing | Build, lint, remote authentication suite and remote Classic Sudoku suite pass; broader event testing remains pending |
| Deployment | Authentication functions deployed to test project; production deployment not started |

## 2. Completed Planning Work

- Established the private GitHub repository.
- Cloned the repository into VS Code.
- Created the documentation structure.
- Added permanent Copilot instructions.
- Documented the event overview.
- Documented the continuous investigation storyline.
- Recorded the four round blueprints.
- Created the design decisions register.
- Prepared the technical architecture.
- Prepared the proposed database design.
- Created the development history.

## 3. Pending Planning Work

- Finalize Round 3 challenge programs, examples, hints, point deductions, scoring and final unlock code.
- Finalize exact questions and evidence.
- Finalize scoring and qualification rules.
- Finalize final-round mechanics.
- Review database design against the MVP.

## 4. Implementation Status

### Completed

- Created and committed the initial core Supabase PostgreSQL migration.
- Applied migration `20261122173709_initial_core_schema.sql` to the production Supabase project `the-hunt-for-18`.
- Verified that local and remote migration histories match.
- Verified the six public-schema core tables:
  - `events`
  - `rounds`
  - `round_config`
  - `teams`
  - `team_members`
  - `organizer_roles`
- Verified the migration is committed and pushed to GitHub.
- Confirmed the migration verification found the Git working tree clean before this documentation update.

### Authentication Milestone 1 — implementation status

- Migrations `20261122173709_initial_core_schema.sql`, `20261123213000_team_auth_foundation.sql`, and `20261126150000_classic_sudoku_progress.sql` were confirmed applied to separate test project `bfzlszktufjqlfiyknga`.
- Applied `20261127120000_team_login_throttling.sql` to that test project only. It adds private rate-limit buckets and service-role-only rate limiting and atomic team provisioning functions.
- Deployed `team-login` and `provision-team` Edge Functions to the same test project. Login checks stored bcrypt hashes, approved/active team status and rate limits; provisioning verifies the organizer session and role before creating a mapped Auth identity and team.
- Added participant login, Supabase session restoration/logout and protected routes to the React app. Team reads use the existing RLS identity mapping.
- `npm.cmd run build` and `npm.cmd run lint` pass. Build reports a JavaScript chunk slightly over 500 kB.
- Hosted Auth settings were checked after the dashboard change: public signup is disabled (`disable_signup=true`).
- Remote tests passed for hosted signup restriction, valid login/session creation, invalid access code and Team ID with identical rejections, unauthorized provisioning, session restoration from persisted storage, protected route rendering, two-team RLS isolation, hash unreadability, throttling, logout and fixture cleanup.
- Fixture teams are suspended, the test event is cancelled, temporary sessions are revoked, non-organizer test users are removed, and the synthetic organizer's role is removed. Team-linked Auth rows and the synthetic audit actor remain because existing foreign keys and append-only audit records prevent their deletion.
- Production was not accessed during this authentication work. The earlier initial-core production application remains documented above.

### Classic Sudoku Integration Milestone

- Replaced the client-side puzzle and solution constants with the `load_classic_sudoku()` RPC; the client receives only the initial givens and the team's saved board.
- Added debounced progress writes to `team_sudoku_progress`, save status/error/retry states, restore-on-load and a warning before leaving with unsaved progress.
- Completion now calls `complete_classic_sudoku()` and updates the UI only after the server confirms the saved board. The answer is not checked in frontend code.
- No new migration was required. The existing Classic Sudoku migration was already applied to the test project.
- The remote Classic Sudoku suite passed for initialization, saved-board restoration, clue protection, incomplete/correct completion, completed-progress lock, unauthenticated rejection and two-team RLS isolation.
- Test fixtures were retained (no data deleted): the fixture event was cancelled, teams were suspended, temporary sessions revoked, and the synthetic organizer account was banned. Its organizer-role row, audit-linked rows and team progress rows remain in the test project.
- Production was not accessed. Changes remain uncommitted and unpushed.

This milestone implements only the initial core schema. It does not complete the full database design.

### Pending
The following application and database work remains pending:
- Integrate the remaining five Sudoku variants only after their detailed puzzle rules and data are approved.
- Replace the static timer display with the approved server-authoritative timer workflow.
- Connect verified Classic Sudoku completion to evidence delivery when the evidence workflow is approved and available.
- React application features and dashboard implementation.
- Remaining gameplay and activity database migrations.
- Submission, scoring, evidence, timers, qualifications, audit and leaderboard implementation.
- Participant and organizer dashboards.
- Answer and submission validation.
- Testing and production deployment.

## 5. Verified Production State

- Supabase production project: `the-hunt-for-18`
- Migration: `20261122173709_initial_core_schema.sql`
- Local and remote migration histories: Matched
- Public core tables: Verified present
- Repository state: Migration committed and pushed; working tree was clean before this documentation update
