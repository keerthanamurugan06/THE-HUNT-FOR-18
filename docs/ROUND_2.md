# ROUND 2 — PASSWORD BREAKER

**Status (27 November 2026):** Migration `20261127180000_round2_password_breaker.sql` is applied to the approved test project `bfzlszktufjqlfiyknga`. Hosted Round 2 integration, authentication regression and Round 1 regression passed. Browser verification confirmed the participant and organizer route gates; signed-in gameplay UI was not browser-tested. No production operation was performed.

## Confirmed Gameplay

- Exactly six organizer-configurable challenge slots; actual competition content is not finalized or hardcoded.
- Each slot configures title, question, puzzle/message content, built-in clue, protected password, solution explanation, difficulty, hidden word, victim 07–12, and maximum marks.
- The organizer configures the final six-word phrase. Phrase attempts are unlimited and have no penalty.
- All six challenges are shared by the event, shown in a persistent randomized order per team, and can be completed in any order.
- Each correct server-validated password reveals one victim and hidden word. Completion and rewards are team-scoped, persistent and idempotent.
- One slot requires a specific Round 1 victim file; the other five remain solvable when that evidence is missing. Round 2 does not require Round 1 completion.
- The final phrase does not activate Round 3. Round access stays organizer-controlled.
- No optional hints, penalties, fixed duration or permanent scoring policy are introduced here.

## Security and Configuration

- Supabase Auth sessions and the existing `organizer_roles` identity map authorize configuration RPCs server-side.
- Participant routes require the existing team session. Participant challenge loading and answer/phrase validation use database RPCs; participant payloads exclude passwords, hashes, solution explanations and unrevealed words.
- Answers and final phrase are stored as bcrypt hashes in the private schema. Participant-facing tables deny direct access except RLS-scoped victim unlock reads.
- Configuration writes validate six slots, victim assignments and exactly one evidence dependency. Changes are blocked while the round is active/paused/ended or participant progress exists.
- Six generic temporary demo placeholders are seeded as demonstration-only content. They are not competition questions or approved scoring.
- Maximum marks are editable per question in preparation for future shared scoring; this milestone does not award scores or establish a scoring policy.

## Verified Results

- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed; Vite reported the JavaScript bundle exceeds 500 kB.
- `git diff --check`: passed (line-ending warnings only).
- Organizer manual-login follow-up: port 5174 serves the test project URL and matching publishable key, with no production project reference. The current DPAPI-stored account is confirmed and unbanned; exact Supabase JS password sign-in returns a session, `is_organizer()` returns true, the organizer event list is readable, and the Round 2 configuration RPC returns six slots. Participant login regression also passes.
- The earlier browser message could not be reproduced using the current encrypted credential file. The old frontend hid all Auth failures behind one generic message, so the exact historical invalid input is unavailable; manual email/password copy mismatch or use of a stale credential artifact is the remaining likely explanation. Organizer login now trims email whitespace, preserves password bytes, and displays safe Auth error categories without exposing sensitive details.
- Runtime-target incident (27 November 2026): the owner supplied a browser Network capture showing an organizer token request was sent to production. Three repository Vite processes were stopped. A new Vite `serve` guard now reads only `VITE_SUPABASE_URL` and refuses startup unless it resolves to the approved test project. Starting with no explicit test URL is verified to fail closed; `.env.local` was not opened or printed. A clean server on port 5180 was started with the test URL and matching test publishable key supplied by process environment; the served module matches both and contains no production reference. Old ports 5173/5174 have no listeners. The fresh browser origin rendered the organizer login without submitting credentials.
- Before applying, the linked ref was rechecked as `bfzlszktufjqlfiyknga`; the dry-run listed only `20261127180000_round2_password_breaker.sql` for `the-hunt-for-18-test`. The migration then applied successfully and appears in remote migration history.
- Hosted Round 2 suite passed organizer-only configuration, non-organizer/anonymous rejection, demo-finalization guard, active-round configuration lock, Round 1 dependency behavior, six participant-safe challenge payloads, stable per-team 1–6 order, incorrect-answer rejection, correct validation, victim 07–12 and hidden-word rewards, idempotent retries, five available challenges without required evidence, progress restoration, cross-team reward isolation, wrong/correct/repeated phrase submissions, phrase persistence and Round 3 remaining locked.
- Hosted authentication regression passed: signup disabled, non-organizer provisioning rejected, organizer provisioning, generic invalid credentials, valid login/session restoration, route protection, RLS/hash isolation, throttling and logout.
- Hosted Classic Sudoku/Round 1 regression passed: puzzle load, save/restore, given protection, correct completion, completion lock, RLS isolation, all six variants and order, invalid/correct solutions, six distinct discoveries, retry idempotence and anonymous rejection.
- Browser check on the local Vite app verified `/round-2` redirects to Team Login and `/organizer/round-2` redirects to Organizer Login. No signed-in gameplay browser session or screenshot was captured.
- Test fixtures created by these runs were signed out, teams suspended, test events cancelled and synthetic organizer role deactivated. The existing manual review team and its progress were not accessed or changed. No project data was deleted.
- `npm.cmd run lint`, `npm.cmd run build`, `node --check supabase/tests/round2-password-breaker.remote.mjs`, and `git diff --check` passed. Vite reports a bundle above 500 kB; Git reported line-ending conversion warnings.

## Next Steps

1. Manually review the Round 2 demo interface and configuration through authorized team and organizer sessions.
2. Address any review feedback without changing approved gameplay or revealing final content.
3. Await approval before beginning Round 3.

No Round 3 or Round 4 work has begun.
