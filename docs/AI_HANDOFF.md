# THE HUNT FOR 18 – AI Handoff Guide

## Milestone 5 Round 3 current handoff (27 November 2026)

- Approved Round 3 design is THE CRYPTO PROTOCOL, replacing the older BLIND CODE/Python concept. See `docs/ROUND_3.md` and `docs/DESIGN_DECISIONS.md`.
- Local participant and organizer routes, bounded crypto workbench, team workspace autosave UI, and three-question organizer draft wizard are implemented. Local math tests, lint, and build pass; build retains the >500 kB warning.
- Migration `supabase/migrations/20261127190000_round3_crypto_protocol.sql` remains unapplied after two failed attempts. Remote history lists it as pending and read-only catalog checks found no Round 3 objects. Local fixes address CASE syntax, the secret insert column list, and the publish-function privilege signature; obtain approval before retrying.
- A hosted Round 3 integration harness is prepared at `supabase/tests/round3-crypto-protocol.remote.mjs`, but it has not run. The test credential procedure did not finish; do not print credentials or bypass automatic review.
- After migration success, run Round 3 hosted security/integration, auth/R1/R2 regressions, and browser verification. Then prioritize the centralized organizer dashboard, timers, shared scoring, and post-round leaderboards. Keep the existing Round 2 organizer interface/backend unchanged; its wizard conversion is deferred.
- No production operation, data deletion, commit, or push occurred. Round 4 has not started. Do not access production.

## Round 2 Milestone 4 archived handoff (27 November 2026)

- Local participant and minimal organizer interfaces are implemented for database-driven Round 2 configuration and play. See `docs/ROUND_2.md` and migration draft `supabase/migrations/20261127180000_round2_password_breaker.sql`.
- Migration `20261127180000_round2_password_breaker.sql` is applied and verified in history only on project `bfzlszktufjqlfiyknga` (`the-hunt-for-18-test`). Pre-apply ref verification and dry-run confirmed exactly one pending migration.
- Hosted Round 2 integration, team-auth regression, and Classic/Round 1 regression all passed. Checks covered organizer authorization, configuration lock, participant secret filtering, order/progress persistence, answers/rewards/phrase, R1 dependency, cross-team isolation and unchanged Round 3 lock.
- Browser verified unauthenticated participant and organizer route gates. Signed-in participant gameplay and organizer configuration screens still need manual visual review.
- Lint, build, test-script syntax and diff checks passed. Build retains the >500 kB bundle warning; Git reports line-ending warnings.
- Test-created sessions were revoked, teams suspended, test events cancelled and temporary organizer role deactivated. The existing review team/progress remains untouched. No data was deleted; no production operation, commit or push occurred. Round 4 remains deferred.

**Last Updated:** 27 November 2026
**Event Date:** 28 November 2026

## Round 1 Milestone 3 handoff (27 November 2026)

- The local frontend calls `load_round1_sudokus` and `complete_round1_sudoku`; migration `20261127160000_round1_open_challenge.sql` was applied and confirmed on test project `bfzlszktufjqlfiyknga`.
- `src/lib/sudoku-rules.ts` includes rule conflict detection, Jigsaw region-map validation, solution counting and puzzle definition validation.
- Owner decision replaced Combined with Diagonal Sudoku (X-Sudoku): Classic rows/columns/3×3 boxes plus both main diagonals.
- Six demo-only unique-solution puzzles are approved. The generator completed and validated all six variants locally; the SQL seeds preserve existing Classic data with `ON CONFLICT DO NOTHING`.
- The earlier five puzzle candidates were only transient generator output and had not been persisted in source or the database; exact givens could not be recovered. The migration now contains regenerated, uniquely validated demo candidates. The existing Classic database definition remains conflict-protected and is not overwritten.
- Each puzzle completion maps server-side to a distinct temporary victim placeholder. Completion inserts one team-scoped unlock row; RLS limits reads, and the participant Evidence Board restores unlocked placeholders after login/refresh.
- Migrations `20261127160000_round1_open_challenge.sql` and `20261127170000_round1_load_conflict_targets.sql` are applied and confirmed in remote history for `bfzlszktufjqlfiyknga` only. Migration history also confirms the three earlier test migrations and auth migration.
- Hosted authentication regression passed: public signup restriction, organizer-only provisioning, invalid Team ID/access code rejection parity, valid login, session restoration, route protection, RLS, throttling and logout.
- Hosted Round 1 integration passed: Classic regression, all six variants, team-specific 1–6 puzzle order, saved progress restoration, clue protection, incorrect/incomplete completion rejection, server validation of the five variants not previously complete, retry idempotence, six unique victim unlocks, unauthenticated rejection and cross-team isolation.
- Local checks passed: `node --experimental-strip-types scripts/test-sudoku-rules.mjs`, `npm.cmd run lint`, and `npm.cmd run build`; build reports a 523.8 kB minified JS chunk warning.
- Both remote suites automatically revoked temporary sessions, suspended their test teams and cancelled test events. Append-only audit-linked records remain; no existing project data was deleted.
- Browser verification and screenshots remain pending because the computer-use runtime failed to initialize. The server-authoritative timer is not implemented. Do not start Round 2 before owner approval.

## 1. Purpose

This document allows another AI assistant or developer to continue THE HUNT FOR 18 without losing project decisions, implementation history or pending tasks.

The GitHub repository and its documentation are the project's source of truth.

Do not depend only on previous chat conversations.

## 2. Project Overview

**Event:** THE HUNT FOR 18 – The Ultimate Investigation Challenge

**Tagline:** 18 Victims. 1 Killer. 1 Mystery. Are You Ready to Uncover the Truth?

**Event duration:** 120 minutes.

**Expected participation:** 25 teams, 50 participants.

**Rounds:**
1. DIGITAL LOGIC TRAP
2. PASSWORD BREAKER
3. THE CRYPTO PROTOCOL
4. OPERATION: DEADLOCK

Participants progressively discover information about 18 victims through Rounds 1–3. The final round connects the evidence and identifies the killer.

Do not change this continuous investigation storyline.

## 3. Read These Files First

Before making changes, read:

1. `.github/copilot-instructions.md`
2. `README.md`
3. `docs/PROJECT_OVERVIEW.md`
4. `docs/DESIGN_DECISIONS.md`
5. `docs/EVENT_STORYLINE.md`
6. `docs/ROUND_1.md`
7. `docs/ROUND_2.md`
8. `docs/ROUND_3.md`
9. `docs/FINAL_ROUND.md`
10. `docs/TECHNICAL_ARCHITECTURE.md`
11. `docs/DATABASE_DESIGN.md`
12. `docs/DEVELOPMENT_HISTORY.md`
13. `docs/CURRENT_PROGRESS.md`
14. `docs/NEXT_STEPS.md`

## 4. Current Technical Stack

- Frontend: React + Vite + TypeScript.
- Backend: Supabase.
- Database: Supabase PostgreSQL.
- Hosting: Vercel.
- Version control: GitHub.
- Development environment: VS Code.
- AI coding assistant: GitHub Copilot.

Do not introduce unnecessary technologies without explaining their benefits and obtaining approval.

## 5. Current Project Stage

**Stage:** Core schema, test authentication and Classic Sudoku save/restore/server verification are implemented and tested; remaining Round 1 variants and event features remain pending.

The repository, planning documents, and initial core database migration have been created.

At the time of this handoff:

- React + Vite + TypeScript application exists, including a public homepage and a Classic Sudoku frontend prototype.
- The production Supabase project `the-hunt-for-18` has the initial core migration applied, as recorded in the initial milestone. It was not accessed during the current authentication work.
- Local and remote migration histories match.
- The public schema contains `events`, `rounds`, `round_config`, `teams`, `team_members`, and `organizer_roles`.
- The migration is committed and pushed to GitHub.
- The Git working tree was clean before the status-documentation update.
- Test project `bfzlszktufjqlfiyknga` has migrations `20261122173709`, `20261123213000`, `20261126150000`, and `20261127120000` applied.
- `team-login` and `provision-team` are deployed to the test project. The React app includes Team ID + access code sign-in, Supabase session restoration/logout and participant route guards.
- Hosted Auth public signup is disabled on the test project. The remote authentication suite passed for login, provisioning authorization, throttling, session restoration/logout, protected routes and team isolation.
- The test event is cancelled, teams are suspended and temporary sessions are revoked. Team-linked Auth rows and the audit actor identity remain because foreign keys and append-only audit records prevent deleting them; the organizer role was removed.
- Classic Sudoku uses the existing progress table and `load_classic_sudoku()` / `complete_classic_sudoku()` RPCs. Remote tests passed for save/restore, clue protection, completion validation, completed-row protection and team isolation.
- Remote Classic Sudoku test fixtures were retained without deleting rows: the event is cancelled, teams are suspended, sessions revoked and synthetic organizer account banned. Its organizer-role row, team progress and audit-linked rows remain in the test project.
- Participant and organizer dashboards remain incomplete.
- End-to-end application testing and production deployment remain pending.

Do not interpret the initial core migration as completion of the full database schema.

Check `CURRENT_PROGRESS.md` before assuming anything has changed.

## 6. Important Confirmed Decisions

- Four-round continuous investigation experience.
- One integrated web application.
- Organizer-authorized team provisioning; no public participant registration. Participants sign in with Team ID + access code and use a mapped Supabase Auth identity.
- One laptop/device per team.
- Team ID + unique access code for participant login.
- Supabase as backend.
- Server-authoritative timers.
- Server-side answer validation and scoring.
- Protected answer keys and evidence.
- Participant access restricted to their own team.
- Round 1 contains six simultaneous Sudoku variations in Open Challenge Mode.
- Round 2 contains six independent password/code challenges.
- Round 3 uses three interactive cryptography challenges: repeating-key XOR, layered cryptography, and educational weak RSA. No Python editor or code execution is used.
- Final round uses a 2D pixel-art maze.
- Full maze map is visible but difficult to solve.
- Wrong routes may contain mini-challenges before returning.
- All qualified teams use the same maze and challenge structure.

Consult `DESIGN_DECISIONS.md` for the complete decision register. Pending decisions must not be treated as confirmed.

## 7. Important Unresolved Decisions

- Competition Round 3 content, hint content, marks, deduction values and final unlock code.
- Exact challenge content and answers.
- Evidence distribution and extraction rules.
- Scoring and penalties.
- Qualification criteria and number of finalist teams.
- Detailed maze layout and mechanics.
- Remaining gameplay database tables and server-side operations.

Discuss unresolved decisions with the project owner before implementing them.

## 8. Development Rules

- Work on one feature at a time.
- Explain the implementation plan before major changes.
- Preserve confirmed gameplay and architecture decisions.
- Never expose Supabase service-role credentials in frontend code.
- Apply Row Level Security to exposed database tables.
- Validate answers and calculate scores securely on the server.
- Include loading, error, empty and reconnect states.
- Test each feature before marking it complete.
- Keep documentation synchronized with code.
- Never commit secrets or real participant credentials.

## 9. Continuity and Progress Tracking

After every major milestone, update:

- `DEVELOPMENT_HISTORY.md`
- `CURRENT_PROGRESS.md`
- `NEXT_STEPS.md`
- `DESIGN_DECISIONS.md` when a decision changes.

Record:
- What was implemented.
- Files created or modified.
- Commands executed.
- Tests performed and their results.
- Bugs encountered and corrections.
- Git commit reference.
- Copilot usage before and after, when available.
- Remaining tasks.

## 10. Copilot Usage Baseline

- Baseline date: 19 November 2026.
- Usage status: 0%.
- Available AI credits: Unknown.
- Next reported reset: 1 December 2026.
- Temporary event sprint allocation: 60% implementation, 30% debugging/testing, 10% emergency reserve.

Verify actual usage through GitHub settings instead of assuming an allowance.

## 11. Immediate Next Action

Continue according to `NEXT_STEPS.md`.

The next implementation session should:
1. Obtain approval to retry the corrected Round 3 migration on the approved test project only.
2. After successful application, run hosted Round 3 integration/security, authentication, Round 1 and Round 2 regressions, and browser verification.
3. Once Milestone 5 is verified, implement the centralized organizer dashboard, server-authoritative timers, shared scoring, and post-round leaderboard release.
4. Leave the Round 2 organizer interface/backend unchanged; its wizard conversion is deferred.

The event is scheduled for 28 November 2026. Prioritize a working, tested MVP over optional features.

## 12. Final Instruction to the Next AI

Act as a collaborative technical mentor and development partner.

Guide the project owner step by step. Explain commands and important technical decisions in beginner-friendly language.

Do not silently change decisions, invent completed work, or assume that proposed designs are implemented.

Always inspect the repository and read the documentation before continuing.
