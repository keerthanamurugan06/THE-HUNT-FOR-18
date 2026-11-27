# THE HUNT FOR 18 – Design Decisions Register

This document records approved project decisions. Do not change an approved decision without explicit approval from the project owner.

## 1. Event and Application

| ID | Decision | Status |
|---|---|---|
| D001 | Event date is 28 November 2026. | CONFIRMED |
| D002 | Event duration is 120 minutes. | CONFIRMED |
| D003 | Expected participation is 25 teams / 50 participants. | CONFIRMED |
| D004 | Each team has two participants. | CONFIRMED |
| D005 | All four rounds follow one continuous investigation storyline. | CONFIRMED |
| D006 | One integrated web application will serve the event. | CONFIRMED |

## 2. Technology Decisions

| ID | Decision | Status |
|---|---|---|
| D007 | React is the frontend framework. | CONFIRMED |
| D008 | Vite is the build tool. | CONFIRMED |
| D009 | TypeScript is the programming language. | CONFIRMED |
| D010 | Supabase is the backend and database platform. | CONFIRMED |
| D011 | Vercel is the hosting platform. | CONFIRMED |
| D012 | GitHub is the source-control and project-continuity platform. | CONFIRMED |
| D013 | VS Code and GitHub Copilot are the primary development tools. | CONFIRMED |

## 3. Registration and Authentication

| ID | Decision | Status |
|---|---|---|
| D014 | Organizers can create teams. | CONFIRMED |
| D015 | Participant self-registration is disabled; organizers provision team identities. | CONFIRMED |
| D016 | Public Supabase Auth signup is disabled; participant identities are created only by trusted organizer provisioning. | CONFIRMED |
| D017 | Team login uses Team ID and a unique access code. | CONFIRMED |
| D018 | Each team has one internal Supabase Auth account. | CONFIRMED |
| D019 | One laptop/device is used per team during gameplay. | CONFIRMED |

## 4. Event Management

| ID | Decision | Status |
|---|---|---|
| D020 | The organizer controls round activation. | CONFIRMED |
| D021 | The organizer controls round timers. | CONFIRMED |
| D022 | Round timers use server-authoritative timing. | CONFIRMED |
| D023 | Leaderboards are released after each round, not live. | CONFIRMED |
| D024 | Locked rounds can be visible but inaccessible. | CONFIRMED |
| D025 | The final round remains locked until organizer authorization. | CONFIRMED |

## 5. Storyline Decisions

| ID | Decision | Status |
|---|---|---|
| D026 | Rounds 1–3 progressively reveal information about 18 victims. | CONFIRMED |
| D027 | The final round connects the investigation evidence and identifies the killer. | CONFIRMED |
| D028 | The final round must not become a separate unrelated game. | CONFIRMED |

## 6. Round Decisions
### Round 1 - DIGITAL LOGIC TRAP

| ID | Decision | Status |
|---|---|---|
| D029 | Round 1 contains six Sudoku variations: Classic, Jigsaw, Windoku, Anti-Knight, Anti-King and Diagonal Sudoku (X-Sudoku). | CONFIRMED |
| D030 | All six Sudoku variations are available simultaneously in Open Challenge Mode. | CONFIRMED |
| D031 | Teams may solve puzzles in any order and switch between puzzles while retaining individual progress. | CONFIRMED |
| D032 | Puzzle display order is randomized independently for each team. | CONFIRMED |
| D033 | Each completed Sudoku puzzle independently unlocks its associated evidence. | CONFIRMED |
| D034 | Conflict highlighting identifies rule violations without revealing correct answers. | CONFIRMED |
| D050 | Diagonal Sudoku (X-Sudoku) replaces Combined Sudoku for the demonstration and final event; it uses Classic rules plus both long diagonal constraints. | CONFIRMED (27 Nov 2026) |
| D051 | Six temporary demo-only Round 1 puzzles are approved, each requiring a unique solution; no unapproved story evidence, scoring or penalties. | CONFIRMED (27 Nov 2026) |
| D052 | Each Round 1 puzzle independently reveals one of six victim files; demo reveals use placeholders, are team-scoped, persistent and idempotent. | CONFIRMED (27 Nov 2026) |

### Round 2 - PASSWORD BREAKER

| ID | Decision | Status |
|---|---|---|
| D035 | Round 2 contains six separate password and code-breaking challenges. | CONFIRMED |
| D036 | All six challenges are available immediately, and teams may solve them in any order. | CONFIRMED |
| D037 | Challenge display order is randomized independently for each team. | CONFIRMED |
| D038 | One challenge depends on evidence obtained from Round 1. | CONFIRMED |
| D039 | Each correctly solved challenge reveals one hidden word; all six words form the final key phrase. | CONFIRMED |
| D040 | Final phrase attempts are unlimited, with no penalty for incorrect attempts; a correct phrase unlocks the next stage. | CONFIRMED |

### Round 3 - BLIND CODE

| ID | Decision | Status |
|---|---|---|
| D041 | Round 3 uses black-box reverse engineering through input-output experimentation. | CONFIRMED |
| D042 | Round 3 contains three progressively harder black-box challenges. | CONFIRMED |
| D043 | Participants recreate hidden program behaviour using an actual Python code editor. | CONFIRMED |
| D044 | Teams may request optional hints, which deduct points. | CONFIRMED |
| D045 | Each completed challenge reveals one code fragment; all three fragments form the final unlock code. | CONFIRMED |
| D046 | Solutions are checked against hidden test cases using restricted and secure server-side validation. | CONFIRMED |

### Round 4 - OPERATION: DEADLOCK

| ID | Decision | Status |
|---|---|---|
| D047 | Round 4 uses a 2D pixel-art investigation maze. | CONFIRMED |
| D048 | The complete maze map is visible to participants, with progression through the investigation. | CONFIRMED |
| D049 | Qualified teams use the same maze and challenge structure, while progress is tracked separately for each team. | CONFIRMED |
