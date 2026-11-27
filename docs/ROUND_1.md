# ROUND 1 – DIGITAL LOGIC TRAP

## Overview
Participants solve 9×9 Sudoku variants to uncover investigation evidence.

**Provisional duration:** 20 minutes  
**Status:** Six-variation Open Challenge Mode, server-side completion validation, and team-scoped demo victim unlocks pass hosted integration on test project `bfzlszktufjqlfiyknga`. Authentication regression, lint, build and local Sudoku rule checks pass. Both Round 1 migrations are applied. Browser visual verification and screenshots were unavailable because the computer-use runtime failed to initialize. The server-authoritative timer is not implemented.

**Diagonal Sudoku (X-Sudoku) rules (owner approved 27 November 2026):** Classic rows/columns/3×3 boxes plus both long diagonals, each containing 1–9 exactly once. This replaces Combined Sudoku for the demonstration and final event.

**Demo content:** Six temporary demonstration puzzles are approved and marked demo-only. Each candidate was checked to have exactly one valid solution. The five earlier generated candidates had not been persisted, so their exact givens were unrecoverable; regenerated candidates are in the migration. Conflict-safe inserts preserve the existing Classic definition and all team progress. Victim reveals use temporary numbered placeholders; no storyline content, scoring or penalties are introduced.

### Current Classic Sudoku Implementation
- Starting givens and saved progress load through `load_classic_sudoku()`.
- Board edits autosave to the authenticated team's progress row; refresh restoration is verified.
- Original clues are enforced by a database trigger.
- Completion is accepted only after `complete_classic_sudoku()` verifies the saved board server-side.
- The solution is not included in frontend source. Evidence delivery and the server-authoritative round timer are not integrated yet.
- This implementation covers Classic only. It does not implement the other five variants or complete Round 1.

## Gameplay
- Six Sudoku variations are included: Classic, Jigsaw, Windoku, Anti-Knight, Anti-King and Diagonal Sudoku (X-Sudoku).
- All six variations are available simultaneously in Open Challenge Mode.
- Teams may solve puzzles in any order and switch between puzzles freely.
- Individual puzzle progress is retained when teams switch between puzzles.
- Puzzle display order is randomized independently for each team.
- Every correctly solved puzzle independently unlocks its associated evidence immediately.
- Evidence is associated with the original puzzle ID, not its display position.

## Participant Interface
- Interactive 9×9 grid.
- Keyboard and on-screen number input.
- Clear and undo controls.
- Puzzle navigation.
- Rules and instructions.
- Countdown timer.
- Autosave.
- Conflict highlighting without revealing correct digits.
- Evidence section.

## Conflict Detection
Highlight conflicting cells, including violations of applicable special rules.

Never reveal the correct digit through conflict highlighting.

## Organizer Interface
- Add, edit, delete and duplicate puzzles.
- Select variant and difficulty.
- Enter puzzle givens and solution.
- Configure Jigsaw region maps.
- Associate evidence with puzzles.
- Configure points.
- Validate rules and solution uniqueness.
- Preview puzzles.
- Freeze configuration when the round starts.

## Timer
Organizer controls:
- Set duration before starting.
- Start, pause and resume.
- Extend or reduce remaining time.
- Manually end the round.

Timer must be server-authoritative and shared by all teams.

Expiry must preserve accepted submissions, scores and unlocked evidence.

## Security and Validation
- Store answer keys securely.
- Validate complete solutions on the server.
- Ensure every puzzle has exactly one valid solution.
- Prevent duplicate scoring for the same puzzle.
- Preserve progress across refreshes and reconnects.

## Pending Decisions
- Difficulty distribution across the six variations.
- Points per puzzle.
- Attempt limits and penalties.
- Evidence content and format.
- Final puzzle collection.
