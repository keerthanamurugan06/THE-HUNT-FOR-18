# ROUND 1 – DIGITAL LOGIC TRAP

## Overview
Participants solve 9×9 Sudoku variants to uncover investigation evidence.

**Provisional duration:** 20 minutes  
**Status:** Six-variation Open Challenge Mode confirmed; detailed puzzle configuration pending.

## Gameplay
- Six Sudoku variations are included: Classic, Jigsaw, Windoku, Anti-Knight, Anti-King and Combined.
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
