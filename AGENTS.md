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
6. Combined

All six puzzles are available simultaneously. Teams may solve them in any order and switch between puzzles without losing progress.

Each completed puzzle unlocks its associated evidence immediately.

Each team receives an independently randomized display order.

Solutions must be validated securely on the server. Never expose protected solutions in frontend code.

### Round 2 — PASSWORD BREAKER

- Six separate password/code-breaking challenges.
- All challenges available immediately.
- Teams choose their solving order.
- Challenge display order is randomized per team.
- One challenge depends on Round 1 evidence.
- Each correct challenge reveals one hidden word.
- Six words form a final investigation-related phrase.
- Final phrase attempts are unlimited, with no penalty for incorrect attempts.

Exact challenge content, hidden words, scoring and evidence dependency remain subject to project-owner approval.

### Round 3 — BLIND CODE: The Black Box

A black-box reverse-engineering challenge using an actual Python code editor.

Confirmed direction:
- Three progressively harder black-box challenges.
- Teams receive input-output examples.
- Teams experiment with additional inputs and observe outputs.
- Teams infer the hidden program logic.
- Teams write Python code in an actual code editor to reproduce the behaviour.
- Solutions are validated against hidden test cases.
- Optional hints provide additional clues or examples with point deductions.
- Each completed challenge reveals one code fragment.
- All three fragments combine into a final unlock code.
- Python execution must use a restricted, secure environment.
- Hidden formulas and test cases must remain server-side.

Do not replace this with a blindfolded communication challenge or a visual code builder.
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

The migration `20261126150000_classic_sudoku_progress.sql` is currently an untracked local migration and must be preserved.

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

