# ROUND 1 – DIGITAL LOGIC TRAP

## Overview
Participants solve 9×9 Sudoku variants to uncover investigation evidence.

**Provisional duration:** 20 minutes  
**Status:** Gameplay blueprint confirmed; detailed configuration pending.

## Gameplay
- Use Classic Sudoku, Jigsaw Sudoku, Windoku/Hyper Sudoku and Anti-Knight/Anti-King variants.
- Combined variants may be considered after fairness and feasibility testing.
- All teams receive the same puzzle collection.
- Puzzle display order is randomized separately for each team.
- Teams can navigate between available puzzles.
- Every correctly solved puzzle unlocks its associated evidence.
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
- Exact puzzle count.
- Difficulty distribution.
- Points per puzzle.
- Attempt limits and penalties.
- Evidence content and format.
- Final puzzle collection.
