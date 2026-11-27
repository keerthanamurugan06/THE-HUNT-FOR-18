# FINAL ROUND – OPERATION: DEADLOCK

## Overview
An interactive 2D pixel-art investigation maze.

**Duration:** Organizer-configurable; no fixed value approved.
**Status:** Optional and locked by default; detailed mechanics pending. The organizer alone authorizes Round 4 or skips it when event time is insufficient. If skipped, winners are determined by cumulative Round 1–3 scores.

## Objective
Connect the information and evidence collected from Rounds 1–3 and identify the killer.

The final round must continue the existing investigation storyline.

It is not an unrelated game or a new victim-discovery round.

## Confirmed Gameplay Direction
- 2D pixel-art visual style.
- Complete maze map visible.
- Maze routes are difficult to solve.
- Linear progression through the investigation.
- Wrong routes may contain mini-challenges before returning.
- All qualified teams use the same maze and challenge structure.
- Team progress is stored separately.
- Finalists missing essential clues receive evidence-recovery checkpoints; recovered evidence awards no retroactive marks.

## Proposed Game Elements
Candidate tile types:
- Wall.
- Floor.
- Door.
- Terminal.
- Evidence.
- Exit.
- Trap.

These are implementation suggestions and require detailed design approval.

## Proposed Story Flow
1. Entry gate.
2. Investigation zones.
3. Evidence-related checkpoints.
4. Security and misleading routes.
5. Final vault.

The number and arrangement of zones are not finalized.

## Suggested Technical Approach
- React and TypeScript.
- HTML Canvas for maze rendering.
- Tile-based maze data.
- Keyboard movement using arrow keys or WASD, subject to approval.
- Supabase persistence for team progress.
- Server-side validation of important objectives.

## Required Participant Features
- Visible maze map.
- Player position.
- Movement controls.
- Game status and timer.
- Challenge panels.
- Evidence/progress display.
- Final investigation submission.

## Required Organizer Features
- Manage final-round access.
- Unlock the final round for qualified teams.
- Monitor progress.
- Manage time.
- Validate final submissions.
- Record results.

## Pending Decisions
- Exact level count.
- Maze layout.
- Checkpoints.
- Mini-challenge count and types.
- Trap mechanics and penalties.
- Movement controls.
- Scoring and tie-breakers.
- Final vault answer format.
- Exact use of evidence from earlier rounds.
