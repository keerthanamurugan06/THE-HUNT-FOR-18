# THE HUNT FOR 18 – Current Progress

**Last Updated:** 27 November 2026
**Event Date:** 28 November 2026
**Development Status:** Milestones 6 & 7 implementation and migration are present locally; migration `20261127220000` is applied on test project `bfzlszktufjqlfiyknga`, and `provision-team`/`reset-team-access-code` are active there with JWT verification. Authentication and Round 1�3 hosted regressions pass. Central event hosted checks passed provisioning authorization, seven-team progression/timers, and a 25-team concurrent Round 1 load in one run; full scoring/finalist/winner verification remains incomplete. Team-scoped offline draft recovery and online-event save retries are implemented for Rounds 1 and 3; Round 2 unsent password/phrase inputs use session-scoped storage. These network recovery paths still need browser interruption/reconnection verification. Production was not accessed.


**Milestone 5 verification update:** Owner reports Round 3 and all authentication/Round 1/Round 2 regression suites completed successfully and pushed at checkpoint `631b11d`. Test-project migration history through `20261127210000` is applied.

**Milestones 6 & 7 hosted update:** Approved migration `20261127220000_central_event_management.sql` is applied on `bfzlszktufjqlfiyknga`; no other migration was applied. Only `provision-team` and `reset-team-access-code` were deployed for this approval, both active with JWT verification. The hosted event-management suite passed after using isolated seven-team fixtures: organizer-only controls, Team provisioning/reset, Round 1 default and configurable timers, concurrent 25-team Round 1 reads, pause/resume/extension/closure preservation, Round 2 progression, Round 3 hint deductions and server expiry, published leaderboards, tie resolution, finalist selection, optional Round 4 skip and winner declaration. Authentication and all three round regression suites also passed. Build, lint, TypeScript and diff checks passed. Do not mark the platform event-ready until scoring/leaderboard/finalist tests and local offline draft recovery/retry are completed.

**28 November pre-deployment UI update:** Removed the public homepage countdown while keeping gameplay timers, added separate Team and Organizer Login actions, and split organizer navigation into Team Registration, Scoreboard and per-round control routes. Round 2 and Round 3 question editors remain separate, linked organizer-only routes. Local build, lint, crypto-tool checks and `git diff --check` pass; the SPA serves the local test routes. No migration, hosted data, production service, deployment, or Git history was changed in this update. This is not a full rehearsal or production-ready sign-off: victim profile records/photos and organizer editing are absent; Round 1 puzzle rows remain demo-only; new-event configuration currently falls back to shared demo templates; Round 2 successful-submission solution explanation visibility is not implemented; and browser interruption recovery plus 25-team concurrent writes/submissions have not been verified. Browser automation failed to initialize, so authenticated browser workflows were not verified. Preserve the existing review event and test data.
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
| Round 3 blueprint | Approved THE CRYPTO PROTOCOL implemented and hosted-tested on the test project |
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
| Gameplay database migrations | Classic Sudoku and six-variant Open Challenge migrations applied and integrated on test project |
| Supabase integration | Six migrations verified on test project; authentication and Round 1 hosted paths tested there; production unchanged in these milestones |
| Authentication | Team ID + access code, Supabase sessions, organizer provisioning and protected routes implemented; public signup disabled on test project |
| Testing | Build, lint, Sudoku rule checks, remote authentication regression and full hosted Round 1 integration pass |
| Deployment | Authentication functions deployed to test project; production deployment not started |
| Round 1 variants | Six-puzzle UI/rules, demo seeds, server validation and team-scoped victim unlock persistence are implemented and hosted-tested; browser visual verification remains pending; central timer behavior is covered by Milestones 6 & 7 tests |
| Round 2 | Six-slot configurable engine and existing organizer/participant interfaces implemented; migration applied to test project; hosted integration and auth/Round 1 regression passed; keep interface and backend unchanged; wizard conversion deferred |
| Round 3 | Complete, hosted-tested, committed and pushed at checkpoint `631b11d`; test migrations through `20261127210000` are applied |
| Event operations | Dashboard and server controls implemented locally; timers exercised; full hosted scoring/leaderboard qualification/winner verification pending |
| Round 4 | Optional and locked by default; organizer authorization, skip and evidence-recovery decisions recorded; implementation deferred |

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

- Replace temporary Round 3 demo challenges with organizer-approved competition content, hints and final code; marks and deduction values remain unapproved.
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

### Round 1 Milestone 3 — partial local implementation (27 November 2026)

- Added `src/lib/sudoku-rules.ts` for variant rules, conflict detection, connected Jigsaw-region validation, solution counting and puzzle-definition validation.
- Reworked the Round 1 page into a six-puzzle navigation interface with separate board state, save-before-switch behavior, completed-puzzle locking, variant instructions and clearly marked demo-only UI.
- Diagonal Sudoku (X-Sudoku) replaces Combined and uses Classic rules plus both main diagonal constraints.
- Added local rule checks at `scripts/test-sudoku-rules.mjs`; Classic uniqueness and representative conflict cases pass.
- `npm.cmd run lint`, `npm.cmd run build` and the focused rules script pass. Build retains the existing >500 kB chunk warning.
- Applied and verified `20261127160000_round1_open_challenge.sql` and corrective `20261127170000_round1_load_conflict_targets.sql` on test project `bfzlszktufjqlfiyknga`; remote migration history lists both.
- The automated authentication regression suite passed using the existing secure test setup; no environment-file contents or credentials were exposed.
- The local generator produces six candidate grids with exactly one solution, including Diagonal; seed statements use `ON CONFLICT DO NOTHING` so the existing Classic definition and all team progress are retained.
- Added a team-scoped evidence board view and cinematic reveal placeholder. Server mapping assigns one unique temporary victim number per puzzle; RLS and uniqueness constraints prevent cross-team reads and duplicate discovery rows.
- Automated authentication regression passed, including signup restrictions, organizer provisioning, login rejection parity, session restoration, protected route, RLS isolation, throttling and logout.
- Full hosted Round 1 integration passed: six puzzle definitions and each team's 1–6 display permutation, board persistence after client recreation, protected clues, incomplete/wrong-board rejection, correct server-side completion for the five variants not already completed in the Classic regression, retry idempotence, six unique victim unlocks, team isolation, and unauthenticated RPC rejection.
- Authentication regression passed: signup disabled, unauthorized provisioning rejected, organizer provisioning, indistinguishable invalid Team ID/access-code rejection, valid login, session restoration, protected route, RLS isolation, throttling and logout.
- `npm.cmd run lint`, `npm.cmd run build`, and `node --experimental-strip-types scripts/test-sudoku-rules.mjs` passed. Build reports a 523.8 kB minified JS chunk warning.
- Test suites suspended their temporary teams, revoked sessions and cancelled test events. Rows linked to append-only audit records remain; no existing project data was deleted.
- Browser verification/screenshots were attempted but unavailable because the computer-use runtime failed to initialize (`failed to write kernel assets`). Hosted UI-level verification remains pending. The server-authoritative timer and final narrative remain pending.

This milestone implements only the initial core schema. It does not complete the full database design.

### Pending
The following application and database work remains pending:
- Complete signed-in manual browser review of Round 2 participant and organizer pages. Route guards were verified in the browser; full gameplay was verified through hosted integration RPCs.
- Complete browser visual verification when the computer-use runtime is available; capture Round 1 screenshots.
- Add an approved server-authoritative Round 1 timer before event use.
- Replace numbered demo victim placeholders only after final victim content is approved.
- Replace the static timer display with the approved server-authoritative timer workflow.
- Connect verified Classic Sudoku completion to evidence delivery when the evidence workflow is approved and available.
- React application features and dashboard implementation.
- Remaining gameplay and activity database migrations.
- Submission, scoring, evidence, timers, qualifications, audit and leaderboard implementation.
- Participant and organizer dashboards.
- Answer and submission validation.
- Testing and production deployment.

### Round 2 Milestone 4 — hosted implementation and verification (27 November 2026)

- Added a six-slot database-driven Round 2 draft with private bcrypt-hashed challenge answers/final phrase, organizer-only configuration RPCs, persistent per-team randomized order, team progress, evidence unlocks and server-side submission RPCs.
- Added an organizer login/role guard, minimal organizer question manager, team-protected participant challenge page, final phrase submission UI, Round 2 navigation and Round 2 entries on the team Evidence Board.
- Generic placeholders and demo answer hashes are temporary demonstration content, not competition content. No final questions or scoring policy were invented.
- SQL guards reject missing/ineligible round state, require exactly six slots, victims 07–12 and exactly one Round 1 dependency, and block configuration edits after activity/progress.
- `20261127180000_round2_password_breaker.sql` was applied only to test project `bfzlszktufjqlfiyknga` after the ref was reconfirmed and a dry-run listed only that migration. Remote migration history confirms it. Production was not accessed.
- Hosted Round 2 integration passed organizer-only configuration, authorization rejection, content-finalization and active-round locks, secret filtering, six challenge slots/per-team stable randomized order, password checks, victim/word rewards and duplicate prevention, R1 dependency, five other usable challenges, persistence/isolation, final phrase validation/persistence/idempotence, and no automatic R3 activation.
- Existing hosted authentication regression and combined Classic Sudoku/Round 1 suite passed. The local browser verified both participant and organizer route gates. Signed-in gameplay UI remains for manual visual review.
- Test-created sessions were revoked, teams suspended, test events cancelled and synthetic organizer role deactivated. The existing review team and progress were untouched; no project data was deleted.
- `npm.cmd run lint`, `npm.cmd run build`, `node --check supabase/tests/round2-password-breaker.remote.mjs`, and `git diff --check` passed. Build retains the >500 kB chunk warning; Git emitted line-ending warnings. No commit or push was made.

## 5. Verified Production State

- Supabase production project: `the-hunt-for-18`
- Migration: `20261122173709_initial_core_schema.sql`
- Local and remote migration histories: Matched
- Public core tables: Verified present
- Repository state: Migration committed and pushed; working tree was clean before this documentation update

### Milestone 5 — Round 3 THE CRYPTO PROTOCOL (27 November 2026; local stage)

- Owner decision replaces the earlier BLIND CODE/Python design with three cryptography challenges: repeating-key XOR (victims 13–14), layered cryptography (15–16), and educational weak RSA (17–18). No Python editor, external execution service, or sandbox was added.
- Added participant and organizer routes. The participant UI contains randomized team challenge navigation, challenge content, known-plaintext panels, optional hints, server-validated answer submission, fragments/victim rewards, final-code submission, and team workspace autosave/restoration through planned RPCs.
- Added bounded local tools for XOR, ASCII/radix conversion, Base64, Vigenère, reversal, columnar transposition, factorization, modular arithmetic, GCD, modular inverse, modular exponentiation, and scratchpad work.
- Added a three-question organizer wizard with independent draft-save operations, participant-safe preview, configurable answer requirements/formats/normalization, hints/deduction records, marks, victims, protected fragments, separate final code, and separate publication controls.
- Draft migration `20261127190000_round3_crypto_protocol.sql` defines private answer/configuration storage, team-scoped progress and evidence, per-team randomized order, idempotent hint usage, organizer-only draft/publication RPCs, participant-safe load/save/submit RPCs, and temporary demo templates. It is not applied.
- Linked project ref matched `bfzlszktufjqlfiyknga`. The Supabase CLI showed all prior migrations matched and only `20261127190000_round3_crypto_protocol.sql` pending. Two approved apply attempts failed: first on CASE syntax; second on the publish RPC privilege signature. Migration history still lists it as pending, and read-only catalog checks found no Round 3 objects; no schema changes remain. Local review corrected the CASE expression, added the omitted `demo_only` insert column, and fixed the publish RPC signature. A dry run still lists only this migration. Reapplication requires owner approval for the corrected file. Production was not contacted.
- Local checks: `node --experimental-strip-types scripts/test-crypto-tools.mjs`, `npm.cmd run lint`, and `npm.cmd run build` passed. The Vite bundle-size warning remains (573.04 kB minified). The final dry run reconfirmed test project `bfzlszktufjqlfiyknga` and listed only this migration. Hosted RPC, RLS, cross-team isolation, browser, auth regression, and Round 1/2 regressions are not yet verified for Round 3.
- Hosted RLS/RPC/integration and browser verification remain blocked until the owner approves reapplying the corrected migration to the test project. The Round 3 hosted test harness is prepared but unrun. Hosted regression credentials were not loaded because the explicitly guarded credential procedure did not complete. Keep the current Round 2 interface and backend unchanged; defer its wizard conversion. After Round 3 verification, prioritize the centralized organizer dashboard, server-authoritative timers, shared scoring, and post-round leaderboards.
- No commit, push, merge, or data deletion occurred.

### Pre-deployment competition setup and reliability changes (28 November 2026; test migration applied)

- Applied only the approved test migration `20261128010000_competition_content_and_victim_profiles.sql` to `the-hunt-for-18-test` (`bfzlszktufjqlfiyknga`). The linked target and single pending migration were verified before apply; remote migration history confirmed success afterward. Production was not accessed.
- Added 18 fictional connected victim case profiles and 18 locally stored fictional portrait PNGs under `supabase/seed/victim-portraits/`. Uploaded all 18 to private `victim-photos`, skipping existing objects; verified all object names and sizes. Participant profile data remains team-unlock gated.
- Added organizer-only victim profile editing, clean event creation with empty Round 2/3 configurations, and a completion-only Round 2 solution explanation. Round 2 unsent password/phrase drafts now survive browser closure using user-scoped local storage.
- Hosted event-management fixtures were expanded to 25 teams with simultaneous team-isolated progress writes/restoration. Hosted suites passed after applying the competition-content migration; the Round 1 test now expects approved competition-ready Sudoku definitions.
- Local verification passed: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run test:crypto`, `node --check` on the four affected hosted test files, and `git diff --check`. Build retains the existing large-chunk warning. The 18 portrait files were counted locally.
- Linked project verification, single-migration dry run, migration application and remote history verification all completed successfully for the approved test project. Hosted photo access and the 25-team suite were then verified.
- No production project was accessed, no existing project data was deleted, and no commit or push was made.

### Final pre-deployment changes (28 November 2026; hosted-verified on test)

- Simplified Round 3 question fields and moved difficulty, known plaintext, hints/deductions and validation choices under Advanced Settings. The `/organizer/round-3` route now composes the existing round controls and question editor. Round 2 question editing is simplified and composed with its round controls while retaining the existing database payload and progress contract.
- Reordered Round 3 participant content to title, question, encrypted message, clues, key, decrypted answer and submit; the workbench and optional hints remain available below. Completed inputs are locked. Removed demo/sample labels from participant content and the Round 1 victim-reveal dialog.
- The applied competition migration classifies existing test/rehearsal/cancelled events as isolated and suspends their eligible teams without deleting records. It exposes an organizer-only listing for the single actual competition event; competition event creation rejects a duplicate.
- Recorded the approved unlimited-attempt policy, no wrong-answer penalty, Round 3 hint-only deductions and production account approval gate in `AGENTS.md` and `docs/DESIGN_DECISIONS.md`. Added the production organizer provisioning procedure; no production credentials/account were created.
- Hosted Round 2 verification was extended and rerun: repeated wrong passwords revealed no explanation or reward; correct answers revealed the matching explanation, victim and hidden word. Hosted authentication, all three rounds and centralized event suites passed. Port 5174 runtime verification confirmed the approved test URL and matching publishable key with no production reference. The authenticated browser review still requires manual login; no credentials were entered through browser automation.

### Hosted setup verification (28 November 2026)

- Hosted verification passed for authentication, Round 1, Round 2, Round 3 and centralized event management. The Round 1 suite expectation was updated to match the owner-approved competition-ready status of the six verified puzzles.
- The 25-team test passed with 25 independently authenticated teams and 50 participant records; concurrent puzzle loads, isolated progress writes/restoration, pause blocking, preserved progress, resume, extension, closure, server expiry and post-deadline reward rejection were verified.
- Created a permanent test organizer, verified password login and organizer role, and stored credentials with Windows DPAPI at `%LOCALAPPDATA%\\HuntFor18\\organizer-test.xml`. Created the clean `THE HUNT FOR 18` event as a draft with all rounds locked, 20-minute starting durations for Rounds 2 and 3, 18 editable victim profiles, six empty Round 2 slots and three empty Round 3 slots. The organizer event listing returned exactly this event and excluded demo/test events.
- Uploaded and verified all 18 fictional portraits in private storage without overwriting existing objects. No production project was accessed; no existing data was deleted; no commit or push occurred.
- Reused the DPAPI-encrypted organizer credential in a hosted test to verify organizer login and the victim-profile list/save flow. All 18 profiles were visible to the organizer; a no-op save/reload preserved the selected profile content exactly.
