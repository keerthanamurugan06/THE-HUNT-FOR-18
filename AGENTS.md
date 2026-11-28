# THE HUNT FOR 18 — Project Instructions

## 1. Project Identity

THE HUNT FOR 18 is a browser-based investigation competition platform.

Event date: 28 November 2026

Event structure:
- 25 teams
- 2 participants per team
- 4 connected investigation rounds
- Approximately 120 minutes

The project includes:
- Public event website
- Team authentication and participant interface
- Organizer authentication and dashboard
- Four interactive investigation rounds
- Evidence management
- Timers, scoring and leaderboard

## 2. Technology Stack

Use the existing stack:
- React 19
- Vite
- TypeScript
- Supabase PostgreSQL and Auth
- Supabase JavaScript client
- React Router
- Tailwind CSS
- Lucide React
- Vercel
- GitHub

Do not replace technologies or introduce unnecessary dependencies without project-owner approval.

## 3. Source of Truth

Before implementing a feature:
1. Inspect the relevant source files.
2. Read the relevant documentation in `docs/`.
3. Check the existing database migrations.
4. Check the current Git status.
5. Identify the latest approved gameplay decisions.

Use this priority when documentation conflicts:
1. Latest explicit project-owner decision.
2. `docs/PROJECT_HANDOVER.md`.
3. `docs/DESIGN_DECISIONS.md`.
4. Relevant round documentation.
5. Older development notes.

Do not silently resolve conflicting requirements. Report the conflict and ask the project owner when necessary.

## 4. Confirmed Gameplay

### Round 1 — DIGITAL LOGIC TRAP

Six Sudoku variations:
1. Classic
2. Jigsaw
3. Windoku
4. Anti-Knight
5. Anti-King
6. Diagonal Sudoku (X-Sudoku)

Diagonal Sudoku uses standard Classic rules and requires each of the two long diagonals to contain 1–9 exactly once. It replaces Combined Sudoku for both the demonstration and final event (owner decision, 27 November 2026). Each verified Round 1 completion independently reveals one of the 18 event-scoped victim case files; unrevealed participant files remain sealed and discoveries are team-scoped.

All six puzzles are available simultaneously. Teams may solve them in any order and switch between puzzles without losing progress.

Each completed puzzle unlocks its associated evidence immediately.

Each team receives an independently randomized display order.

Solutions must be validated securely on the server. Never expose protected solutions in frontend code.

Teams may make unlimited Sudoku solution attempts while Round 1 is running and before its server-authoritative deadline. Incorrect submissions carry no mark penalty; a completed puzzle is locked and rewards cannot be duplicated.

### Round 2 — PASSWORD BREAKER

- Six separate password/code-breaking challenges.
- All challenges available immediately.
- Teams choose their solving order.
- Challenge display order is randomized per team.
- One challenge depends on Round 1 evidence.
- Each correct challenge reveals one hidden word.
- Each completed challenge also reveals one victim; Round 2 can reveal six victims total.
- Six words form a final investigation-related phrase.
- Final phrase attempts are unlimited, with no penalty for incorrect attempts. Round 2 completion does not gate Round 3 participation.

Exact challenge content, hidden words, scoring and evidence dependency remain subject to project-owner approval.

### Round 3 — THE CRYPTO PROTOCOL

Three cryptography challenges: repeating-key XOR, layered cryptography, and educational weak RSA. Teams use the bounded in-app workbench; do not add Python execution or arbitrary code execution.

- Each completed challenge reveals two victims and one protected code fragment, after server-side validation.
- Team workspaces and hint use are team-scoped and server-persisted.
- Expected keys/plaintexts, hint content, fragments, and the final unlock code remain protected server-side.
- Organizers configure answer formats, case sensitivity, whitespace normalization, required key/plaintext fields, hints, and deductions.
- Hint usage and configured deductions are recorded server-side and applied to the associated challenge score by the shared scoring system. Incorrect attempts have no penalty.
- Publication is separate from round activation. Competition configuration freezes once the round starts.
- Successful final-code submission never activates Round 4.
- Teams may make unlimited key/plaintext and final-code attempts while Round 3 is running and before its deadline. Incorrect submissions carry no mark penalty. Only requested hints may apply configured mark deductions; completed challenges stay locked.
- Milestone 5 is complete, hosted-tested, committed and pushed at checkpoint `631b11d`. Round 3 migrations `20261127190000`, `20261127200000` and `20261127210000` are applied on test project `bfzlszktufjqlfiyknga`; hosted Round 3 integration and security tests passed.

Actual competition content and any scoring/deduction values remain unfinalized.

### Event progression and operations

- All teams may participate in Rounds 1, 2 and 3. Incomplete work in one preliminary round never blocks participation in a later preliminary round.
- The organizer controls access to each round.
- The top six teams qualify using cumulative scores from Rounds 1–3.
- Round durations and individual challenge marks must be organizer-configurable without code changes or redeployment.
- Organizer controls start, pause, resume, extend and end actions. Timers and scoring are server-authoritative.
- Scoring changes apply equally to every team and are audited. Leaderboards are released after each round and are not live.
- Round 4 remains locked by default and requires organizer authorization. If event time is insufficient, the organizer may skip it and declare winners by cumulative Rounds 1–3 scores.
- If Round 4 runs, finalists missing essential clues receive evidence-recovery checkpoints. Recovered evidence gives no retroactive marks.
- Rounds 1, 2 and 3 reveal six, six and six victims respectively. All 18 discoveries persist on the same team-scoped Evidence Board.

### Round 4 — OPERATION: DEADLOCK

A 2D pixel-art investigation maze.

Teams connect information and evidence from Rounds 1–3 to identify the killer.

Confirmed direction:
- Complete maze map visible.
- Difficult routes.
- Linear investigation progression.
- Wrong routes may contain mini-challenges.
- Same maze/challenge structure for qualified teams.
- Individual team progress.

Exact maze layout, checkpoints, penalties, scoring and final answer format still require approval.

## 5. Development Workflow

Implement one core application feature at a time.

For every feature:

1. Explain the goal and expected behavior.
2. Inspect the relevant existing implementation.
3. Identify files to create or modify.
4. Present a short implementation plan.
5. Make the smallest safe changes.
6. Run relevant tests and checks.
7. Inspect the results and fix failures.
8. Explain what changed and what remains.
9. Update relevant documentation after verification.

Do not begin the next major feature until the current feature has been verified or its incomplete status has been clearly recorded.

### Current milestone order

1. Milestone 5 Round 3 is complete and hosted-tested on the approved test project.
2. Implement Milestones 6 & 7: centralized organizer dashboard, server-authoritative timers, shared scoring, and post-round leaderboard release.
3. Keep the existing Round 2 backend and participant progress intact. Its organizer form may be simplified without changing the database contract.
4. Keep Round 4 deferred and locked by default.

## 6. Security Requirements

- Never expose Supabase service-role keys or private credentials in frontend code.
- Never read, print, copy or request `.env.local` contents.
- Never place puzzle solutions, answer keys, hidden words or protected evidence in client-accessible source.
- Use Supabase Row Level Security for exposed tables.
- Validate important submissions and scoring through trusted server-side database functions.
- Restrict team data to the authenticated team.
- Restrict organizer operations to authorized organizer accounts.
- Prevent duplicate completion rewards and duplicate scoring.
- Treat client-side values as untrusted.
- Handle authentication, authorization and database errors safely.

## 7. Database and Production Safety

The production Supabase project already contains core schema migrations and test records.

The Classic Sudoku progress migration `20261126150000_classic_sudoku_progress.sql` is tracked and applied to the approved test project. Preserve the migration history. Round 1 migrations `20261127160000_round1_open_challenge.sql` and `20261127170000_round1_load_conflict_targets.sql` are also applied to test project `bfzlszktufjqlfiyknga`; no Round 1 migration has been applied to production.

Never:
- Apply migrations to production without explicit approval.
- Run `supabase db push` against production without explicit approval.
- Modify or delete production records without explicit approval.
- Reset or wipe any database.
- Change production authentication settings without approval.
- Assume a migration is safe merely because it compiles.

Use a separate Supabase cloud test project for development and verification.

Do not request passwords, service-role keys or other secrets from the project owner.

## 8. Git and File Safety

Before editing, inspect `git status`.

Never perform any of the following without explicit project-owner approval:
- Commit
- Push
- Merge
- Rebase
- Switch branches
- Reset
- Clean
- Delete files or folders
- Remove backups
- Rewrite Git history

Preserve all untracked files, especially pending migrations.

Do not modify the nested `THE-HUNT-FOR-18/.git` directory.

Do not overwrite existing documentation without inspecting it first.

## 9. Code Quality

- Use TypeScript types appropriately.
- Prefer reusable components and small functions.
- Follow the existing project structure and naming conventions.
- Keep interfaces responsive.
- Include loading, success, empty and error states.
- Avoid unnecessary redesigns.
- Preserve the existing cinematic investigation visual style.
- Do not introduce emoji decorations into the project interface.
- Do not claim that a feature works unless it has been tested.

## 10. Verification

After relevant code changes, run:
- `npm run lint`
- `npm run build`

Also perform feature-specific checks where applicable.

Report:
- Commands executed.
- Actual test results.
- Errors found.
- Errors fixed.
- Remaining limitations.

Never fabricate test results or claim that a remote database operation succeeded without verification.

## 11. Documentation

After a verified milestone, update the relevant documentation:

- `docs/CURRENT_PROGRESS.md`
- `docs/DEVELOPMENT_HISTORY.md`
- `docs/NEXT_STEPS.md`
- `docs/AI_HANDOFF.md`

Update `docs/DESIGN_DECISIONS.md` when an approved design decision changes.

Do not record incomplete work as completed.

## 12. Project Owner Authority

The project owner makes all final decisions.

Ask before:
- Changing approved gameplay.
- Making assumptions about unfinished mechanics.
- Changing the database architecture.
- Applying production migrations.
- Creating or modifying a production organizer account.
- Performing Git operations.
- Deleting or replacing existing work.
- Making significant visual redesigns.

Suggest improvements with reasons, but do not silently implement them.

## 13. Working Principle

One feature at a time.
Small changes.
Secure implementation.
Verified results.
Accurate documentation.
No destructive surprises.

