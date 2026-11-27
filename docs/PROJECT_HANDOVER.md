# THE HUNT FOR 18 — Project Handover

**Last updated:** 27 November 2026  
**Project status:** Development in progress  
**Event date:** 28 November 2026

---

## 1. Project Overview

THE HUNT FOR 18 is a browser-based investigation competition platform.

Participants work in teams of two to investigate a connected mystery involving 18 victims and one hidden killer.

The event consists of four connected rounds and is designed for:
- 25 teams
- 50 participants
- Approximately 120 minutes

The final objective is to connect the information discovered throughout the rounds and identify the killer.

## 2. Technology Stack

The existing project uses:

| Component | Technology |
|---|---|
| Frontend | React 19 |
| Build tool | Vite |
| Language | TypeScript |
| Routing | React Router |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Backend client | Supabase JavaScript |
| Styling | Tailwind CSS and existing CSS |
| Icons | Lucide React |
| Hosting | Vercel |
| Version control | GitHub |

Do not replace the existing stack without project-owner approval.

## 3. Repository Information

**Repository:** `keerthanamurugan06/THE-HUNT-FOR-18`  
**Main branch:** `main`

Local project directory:

`C:\Users\acer\Desktop\Hunt for 18\THE-HUNT-FOR-18`

Important directories:

- `src/` — Application source code.
- `src/components/` — Reusable components.
- `src/pages/` — Application pages.
- `src/lib/` — Shared libraries and Supabase client.
- `docs/` — Project and gameplay documentation.
- `supabase/migrations/` — Database migration history.

A separate feature backup exists:

`C:\Users\acer\Desktop\Hunt for 18\THE-HUNT-FOR-18-feature-round-3-backup`

Preserve this backup.

## 4. Existing Application

The following files have been inspected:

### `src/App.tsx`

Contains:
- Public homepage.
- Event countdown.
- Event information.
- Four round cards.
- Investigation evidence board integration.
- Team login placeholder.
- Organizer login placeholder.
- Round 1 route.

### `src/pages/Round1Page.tsx`

Contains an initial Classic Sudoku frontend prototype:
- 9x9 Sudoku board.
- Fixed initial puzzle.
- Frontend solution array.
- Number input controls.
- Undo and clear controls.
- Conflict highlighting.
- Progress calculation.
- Evidence locked/completed display.

This is a prototype, not a complete Round 1 implementation.

### `src/components/EvidenceBoard.tsx`

Displays 18 unidentified victim positions in a visual investigation board.

The current component is a visual display, not a database-backed evidence management system.

### `src/lib/supabase.ts`

Initializes the Supabase client using:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never expose private keys or credentials in frontend code.

## 5. Confirmed Gameplay

### Round 1 — DIGITAL LOGIC TRAP

Six Sudoku variations:

1. Classic
2. Jigsaw
3. Windoku
4. Anti-Knight
5. Anti-King
6. Diagonal Sudoku (X-Sudoku)

Rules:
- All six puzzles are available simultaneously.
- Teams may solve them in any order.
- Teams may switch between puzzles.
- Progress must be retained independently for each puzzle.
- Each team receives a randomized puzzle display order.
- Each completed puzzle unlocks its corresponding evidence immediately.
- Puzzle validation must be secure and server-side.

The Round 1 frontend and hosted backend support six variant boards, variant conflict rules, per-puzzle progress and team-scoped temporary victim unlocks. Migrations `20261127160000_round1_open_challenge.sql` and `20261127170000_round1_load_conflict_targets.sql` are applied and verified on test project `bfzlszktufjqlfiyknga` only. Authentication and full hosted Round 1 integration suites pass. Browser verification is pending because the computer-use runtime did not initialize; the server-authoritative timer is not implemented.

### Round 2 — PASSWORD BREAKER

- Six separate password and code-breaking challenges.
- All six are available immediately.
- Teams choose their solving order.
- Display order is randomized per team.
- One challenge depends on Round 1 evidence.
- Each correct challenge reveals one hidden word.
- Six hidden words form an investigation-related key phrase.
- Correct phrase submission unlocks the next investigation stage.
- Final phrase attempts are unlimited.
- Incorrect final phrase attempts have no penalty.

Exact challenge contents, hidden words, scoring and evidence dependency remain pending approval.

### Round 3 — BLIND CODE

**Title:** BLIND CODE — The Black Box: Decode the Unknown

Teams reverse-engineer three hidden programs by experimenting with inputs and outputs, identifying the underlying logic, and reproducing the behaviour using an actual Python code editor.

Confirmed gameplay:
- Three progressively harder black-box challenges.
- Initial input-output examples.
- Additional input experimentation.
- Actual Python code editor.
- Optional hints with point deductions.
- Hidden test-case validation.
- One code fragment revealed per completed challenge.
- Three fragments combine into the final unlock code.

Technical direction:
- React and TypeScript editor interface.
- Restricted Python execution environment.
- No arbitrary unrestricted code execution.
- Hidden formulas and test cases protected from participants.
- Server-side validation and score calculation.
- Team progress and hint usage persisted through the backend.

Exact challenge programs, supported syntax, hints, penalties, scoring and final unlock code remain to be prepared.
### Round 4 — OPERATION: DEADLOCK

A 2D pixel-art investigation maze.

Objective:
Connect information and evidence from Rounds 1–3 and identify the killer.

Confirmed direction:
- Complete maze map visible.
- Difficult routes.
- Linear investigation progression.
- Wrong routes may contain mini-challenges.
- Same maze and challenge structure for qualified teams.
- Individual team progress.

The exact maze layout, checkpoints, penalties, scoring and final answer format remain pending approval.

## 6. Database Status

The existing production Supabase project contains the initial core database foundation.

The initial core schema migration is:

`20261122173709_initial_core_schema.sql`

A team authentication foundation migration is:

`20261123213000_team_auth_foundation.sql`

Both migrations were previously applied to production and verified.

A local Classic Sudoku migration exists:

`20261126150000_classic_sudoku_progress.sql`

Important:
- The migration has been applied to the approved test project.
- It has not been applied to production.
- Preserve the file.
- Do not push it to production without explicit approval.
- Validate it in a separate Supabase cloud test project first.

The production project already contains test records. Do not modify or delete them without explicit approval.

## 7. Current Implementation Status

| Feature | Status |
|---|---|
| Public homepage | Implemented |
| Event countdown display | Implemented |
| 18-victim visual board | Implemented |
| Classic Sudoku prototype | Implemented |
| Sudoku database persistence | Pending |
| Secure Sudoku validation | Pending |
| Remaining five Sudoku variations | Pending |
| Evidence unlocking integration | Pending |
| Team authentication | Pending |
| Organizer authentication | Pending |
| Organizer dashboard | Pending |
| Round 2 | Pending |
| Round 3 BLIND CODE | Design finalized; implementation pending |
| Round 4 maze | Pending |
| Scoring system | Pending |
| Server-authoritative event timers | Pending |
| Leaderboard | Pending |
| Full event testing | Pending |
| Deployment verification | Pending |

## 8. Important Known Issues

1. The Classic Sudoku solution is currently present in frontend source code.
2. Sudoku progress is stored only in component state.
3. The server-authoritative Round 1 timer is not implemented.
4. Victim discovery currently uses approved numbered demo placeholders.
5. Browser verification of the participant flow remains pending.
6. The homepage Round 3 description may still need updating to reflect the finalized Black Box Python challenge.
7. Some older documentation conflicts with finalized gameplay decisions.

These issues must be addressed through planned, verified changes.

## 9. Development Roadmap

Current sequence:

1. Review the verified Round 1 demonstration; wait for explicit approval before beginning Round 2.
2. Repeat browser verification and capture screenshots when the computer-use runtime is available.
3. Implement the approved server-authoritative timer and replace demo victim placeholders only after final content is approved.
4. Continue remaining rounds after Round 1 review and approval.
5. Perform event rehearsal and production deployment only after explicit approval.

Implement one core feature at a time.

## 10. Development and Safety Rules

- Read `AGENTS.md` before making changes.
- Inspect existing code before editing.
- Preserve existing working functionality.
- Do not invent gameplay requirements.
- Keep protected answers and solutions server-side.
- Apply appropriate Supabase RLS policies.
- Never request or expose private credentials.
- Do not display `.env.local` contents.
- Do not modify production database records without approval.
- Do not apply production migrations without approval.
- Do not commit, push, merge or reset Git without approval.
- Preserve untracked files and backups.
- Run relevant tests after every implementation milestone.
- Record actual test results.
- Update project documentation after verified milestones.

## 11. Immediate Next Steps

The next tasks are:

1. Review the verified Round 1 demonstration; do not begin Round 2 until approved.
2. Repeat browser visual verification when the computer-use runtime is available.
3. Implement the server-authoritative timer before event use.
4. Replace demo victim placeholders only after final victim information is approved.

Do not skip directly to production deployment.

## 12. Working Principle

The project must be developed incrementally.

One feature at a time.  
Small and safe changes.  
Secure backend validation.  
Verified functionality.  
Accurate documentation.  
Project-owner approval for important decisions.




