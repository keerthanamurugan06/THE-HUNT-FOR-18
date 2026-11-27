# THE HUNT FOR 18 — Development Roadmap

**Last updated:** 27 November 2026
**Event date:** 28 November 2026
**Overall status:** Development in progress

---

## Development Strategy

Develop the platform incrementally.

Each phase must have:
- A clear objective.
- Defined implementation tasks.
- Dependencies.
- Verification criteria.
- Updated documentation.

Do not begin several major features simultaneously.

Do not mark a phase complete until its verification criteria have been met.

---

## Phase 1 — Project Preparation

**Objective:** Establish reliable project instructions and documentation.

Tasks:
- [x] Inspect the repository and existing source code.
- [x] Create root `AGENTS.md`.
- [x] Create `docs/PROJECT_HANDOVER.md`.
- [ ] Create this development roadmap.
- [ ] Review outdated documentation.
- [ ] Reconcile conflicting gameplay descriptions.
- [ ] Verify project instructions and handover against the repository.

Completion criteria:
- Codex has clear project instructions.
- Current implementation status is documented.
- Confirmed gameplay decisions are recorded accurately.
- Pending decisions are not presented as finalized.

---

## Phase 2 — Supabase Test Environment

**Objective:** Separate development and testing from production.

Tasks:
- [ ] Create a separate Supabase cloud test project.
- [ ] Configure local development environment variables.
- [ ] Verify frontend connection to the test project.
- [ ] Inspect the existing migration history.
- [ ] Preserve the untracked Classic Sudoku migration.
- [ ] Validate the pending migration in the test environment.
- [ ] Verify database permissions and Row Level Security.

Completion criteria:
- Development can use the test project independently.
- Production remains unchanged.
- Migration behavior and security have been verified.

---

## Phase 3 — Round 1 Database Integration

**Objective:** Replace the frontend-only Classic Sudoku prototype with a persistent, securely validated implementation.

Tasks:
- [ ] Review the Classic Sudoku migration.
- [ ] Create or verify the protected puzzle definition.
- [ ] Implement loading and saving team progress.
- [ ] Implement server-side completion validation.
- [ ] Prevent modification of original puzzle clues.
- [ ] Prevent duplicate completion rewards.
- [ ] Connect the frontend to Supabase.
- [ ] Handle loading, error and completion states.

Completion criteria:
- Team progress survives refresh and re-login.
- Teams cannot access other teams' progress.
- Solutions are not exposed to participants.
- Incorrect solutions cannot unlock evidence.
- Correct completion is recorded securely.

---

## Phase 4 — Six Sudoku Variations

**Objective:** Complete the entire Round 1 puzzle experience.

Variations:
1. Classic
2. Jigsaw
3. Windoku
4. Anti-Knight
5. Anti-King
6. Diagonal Sudoku (X-Sudoku)

Tasks:
- [x] Implement Jigsaw Sudoku.
- [x] Implement Windoku Sudoku.
- [x] Implement Anti-Knight Sudoku.
- [x] Implement Anti-King Sudoku.
- [x] Implement Diagonal Sudoku (X-Sudoku) using Classic rules and both main diagonals.
- [x] Verify each demo puzzle has exactly one valid solution.
- [x] Implement puzzle switching and independent autosave/restoration.
- [x] Randomize and persist each team's puzzle display order.
- [x] Unlock the corresponding temporary victim placeholder after server-side completion validation.

Completion criteria:
- [x] Hosted integration verifies all six puzzle types and server-side completion.
- [x] Validation respects each puzzle's rules and rejects incorrect completion.
- [x] Team progress is independent and survives client recreation/session restoration.
- [x] Switching puzzles does not lose saved progress.
- [x] Team-scoped evidence unlocks only after verified completion and cannot duplicate.
- [ ] Browser visual verification/screenshots (computer-use runtime unavailable in latest run).
- [ ] Server-authoritative timer.

---

## Phase 5 — Authentication and Organizer Controls

**Objective:** Provide secure access for teams and organizers.

Tasks:
- [x] Implement team login.
- [x] Connect team identities to Supabase Auth.
- [x] Enforce team-specific data access.
- [x] Implement organizer authentication.
- [x] Implement organizer authorization.
- [ ] Build essential organizer controls.
- [ ] Configure event and round activation.
- [ ] Configure team access and progress monitoring.

Completion criteria:
- Teams can access only their own authorized data.
- Unauthorized users cannot access organizer functions.
- Organizer actions are protected and verified.

---

## Phase 6 — Rounds 2 and 3

**Objective:** Implement approved gameplay for Rounds 2 and 3. All teams participate in each preliminary round; completion in an earlier round is not an access gate. Round access remains organizer-controlled.

### Round 2 — PASSWORD BREAKER

Tasks:
- [ ] Finalize challenge content with project-owner approval.
- [ ] Implement six independent challenges.
- [ ] Implement randomized display order.
- [ ] Connect the Round 1 evidence dependency.
- [ ] Implement secure answer validation.
- [ ] Reveal the associated hidden word and one victim after successful validation.
- [ ] Implement final phrase validation.
- [ ] Do not use Round 2 completion or phrase entry to gate Round 3 participation.
- [ ] Preserve progress.

### Round 3 — BLIND CODE: The Black Box

Tasks:
- [ ] Finalize three black-box challenge programs and their difficulty progression.
- [ ] Prepare initial input-output examples for each challenge.
- [ ] Define additional input experimentation rules and limits.
- [ ] Implement the actual Python code editor interface.
- [ ] Implement restricted and secure Python execution.
- [ ] Keep hidden logic and test cases server-side.
- [ ] Implement hidden test-case validation.
- [ ] Define optional hints and their point deductions.
- [ ] Reveal one code fragment and two victims after each successful challenge.
- [ ] Implement final unlock-code validation using all three fragments.
- [ ] Do not gate Round 3 participation on earlier round completion.
- [ ] Preserve team progress and hint usage.
- [ ] Test execution limits, invalid submissions and security boundaries.
Completion criteria:
- Each round follows the approved design.
- Progress is stored reliably.
- Protected answers remain server-side.
- The rounds connect to the central investigation.

---

## Phase 7 — Organizer Controls, Timers, Scoring and Leaderboards

**Objective:** Integrate the shared event systems.

Tasks:
- [ ] Implement server-authoritative timers.
- [ ] Implement round activation and locking.
- [ ] Implement scoring and score adjustments.
- [ ] Prevent duplicate scoring.
- [ ] Integrate evidence unlocking.
- [ ] Implement qualification rules.
- [ ] Implement leaderboard.
- [ ] Record important organizer actions.
- [ ] Configure round durations and individual challenge marks without code changes or redeployment.
- [ ] Support start, pause, resume, extend and end actions.
- [ ] Apply scoring changes equally to all teams and audit each change.
- [ ] Release leaderboards after each round, not live.

Completion criteria:
- Scores are consistent and server-validated.
- Timers cannot be manipulated through the browser.
- Evidence unlocks follow approved requirements.
- Leaderboard results match stored scores.

---

## Phase 8 — Optional Round 4: OPERATION: DEADLOCK

Round 4 remains locked by default and requires organizer authorization. If event time is insufficient, the organizer may skip it and declare winners using cumulative Round 1–3 scores.

If Round 4 runs, implement evidence-recovery checkpoints for finalists missing essential clues. Recovered evidence does not award retroactive marks.

Tasks:
- [ ] Finalize maze layout and progression.
- [ ] Finalize checkpoint and mini-challenge mechanics.
- [ ] Implement the 2D pixel-art maze and team progress.
- [ ] Integrate evidence from earlier rounds.
- [ ] Implement secure final-answer validation.

---

## Phase 9 — End-to-End Event Testing

**Objective:** Verify reliability for the intended event size.

Tasks:
- [ ] Test team registration and login.
- [ ] Test 25 independent team accounts.
- [ ] Test simultaneous gameplay.
- [ ] Test puzzle progress persistence.
- [ ] Test evidence unlocking.
- [ ] Test scoring and timers.
- [ ] Test organizer controls.
- [ ] Test mobile and desktop layouts.
- [ ] Test refresh, reconnect and network failure.
- [ ] Test unauthorized access and team isolation.
- [ ] Verify recovery and operational fallback procedures.

Completion criteria:
- All essential event workflows pass.
- No team can access another team's restricted data.
- No critical data-loss or scoring issue remains.
- Organizers can operate the event reliably.

---

## Phase 10 — Deployment and Rehearsal

**Objective:** Prepare the verified platform for the live event.

Tasks:
- [ ] Review production configuration.
- [ ] Verify production environment variables without exposing secrets.
- [ ] Review and approve production migrations.
- [ ] Deploy the approved application.
- [ ] Verify production authentication and database connectivity.
- [ ] Conduct a complete rehearsal.
- [ ] Prepare organizer instructions.
- [ ] Prepare manual fallback procedures.
- [ ] Freeze unnecessary feature changes before the event.

Completion criteria:
- Production deployment is verified.
- Critical workflows work in production.
- Organizers understand the operating procedure.
- A fallback plan is ready.

---

## Priority and Scope Management

The event deadline is 28 November 2026.

Prioritize in this order if development time becomes limited:

1. Secure team access and reliable team identification.
2. A working, persistent and server-validated Round 1.
3. Essential organizer controls.
4. Reliable timers and scoring.
5. Other rounds according to approved MVP scope.
6. Visual enhancements and optional features.

Do not sacrifice security, data integrity or operational reliability to add unfinished features.

If a round cannot be fully implemented and tested in time, report that clearly and prepare a project-owner-approved manual fallback.

---

## Milestone Reporting Template

For each completed feature, record:

- Phase:
- Feature:
- Files created:
- Files modified:
- Implementation summary:
- Tests executed:
- Actual test results:
- Known issues:
- Remaining work:
- Project-owner approval required:

Never claim successful implementation without verification.

---

## Development Principle

Plan carefully.
Implement one core feature at a time.
Verify before proceeding.
Protect production.
Preserve approved gameplay.
Document the actual state.

