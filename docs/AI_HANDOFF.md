# THE HUNT FOR 18 – AI Handoff Guide

**Last Updated:** 27 November 2026
**Event Date:** 28 November 2026

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
3. BLIND CODE
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

**Stage:** Core database foundation completed; homepage and Classic Sudoku frontend prototype exist; broader application and backend implementation remain pending.

The repository, planning documents, and initial core database migration have been created.

At the time of this handoff:

- React + Vite + TypeScript application exists, including a public homepage and a Classic Sudoku frontend prototype.
- The production Supabase project `the-hunt-for-18` has the initial core migration applied.
- Local and remote migration histories match.
- The public schema contains `events`, `rounds`, `round_config`, `teams`, `team_members`, and `organizer_roles`.
- The migration is committed and pushed to GitHub.
- The Git working tree was clean before the status-documentation update.
- The Classic Sudoku progress migration has been drafted but is not yet validated; other gameplay migrations remain pending.
- Authentication has not been implemented.
- Participant and organizer dashboards remain incomplete.
- End-to-end application testing and production deployment remain pending.

Do not interpret the initial core migration as completion of the full database schema.

Check `CURRENT_PROGRESS.md` before assuming anything has changed.

## 6. Important Confirmed Decisions

- Four-round continuous investigation experience.
- One integrated web application.
- Organizer-created teams and participant self-registration with approval.
- One laptop/device per team.
- Team ID + unique access code for participant login.
- Supabase as backend.
- Server-authoritative timers.
- Server-side answer validation and scoring.
- Protected answer keys and evidence.
- Participant access restricted to their own team.
- Round 1 contains six simultaneous Sudoku variations in Open Challenge Mode.
- Round 2 contains six independent password/code challenges.
- Round 3 uses three progressive black-box reverse-engineering challenges with an actual Python code editor, hidden test validation and code fragments.
- Final round uses a 2D pixel-art maze.
- Full maze map is visible but difficult to solve.
- Wrong routes may contain mini-challenges before returning.
- All qualified teams use the same maze and challenge structure.

Consult `DESIGN_DECISIONS.md` for the complete decision register. Pending decisions must not be treated as confirmed.

## 7. Important Unresolved Decisions

- Round 3 challenge programs, input-output examples, Python execution limits, hint content, point deductions, scoring and final unlock code.
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
1. Inspect the existing repository and planning documents.
2. Continue implementation of the existing React + Vite + TypeScript foundation.
3. Create a separate Supabase cloud test project and validate pending database migrations there.
4. Implement trusted team and organizer provisioning.
5. Implement authentication and protected route boundaries.
6. Add and validate remaining database migrations in the test environment after reviewing approved gameplay decisions.

The event is scheduled for 28 November 2026. Prioritize a working, tested MVP over optional features.

## 12. Final Instruction to the Next AI

Act as a collaborative technical mentor and development partner.

Guide the project owner step by step. Explain commands and important technical decisions in beginner-friendly language.

Do not silently change decisions, invent completed work, or assume that proposed designs are implemented.

Always inspect the repository and read the documentation before continuing.
