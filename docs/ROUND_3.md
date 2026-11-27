# ROUND 3 - BLIND CODE

## Overview

**Title:** BLIND CODE - The Black Box: Decode the Unknown

**Status:** Gameplay and implementation approach finalized.

**Provisional duration:** 18 minutes (subject to final event schedule).

Round 3 is a black-box reverse-engineering challenge. Teams investigate the behaviour of hidden programs by providing inputs, observing outputs, identifying the underlying logic, and recreating that logic using Python.

## Story Purpose

Teams discover a mysterious black-box device recovered during the investigation of the 18 victims.

The device contains hidden computational logic. Participants must investigate its behaviour and reconstruct the programs to unlock information needed to continue the investigation.

The round must contribute meaningfully to the continuous storyline established in the earlier rounds.

## Confirmed Gameplay

1. Each team receives three progressively challenging black-box puzzles.
2. Each puzzle initially displays a set of input-output examples.
3. Teams can enter additional test inputs and observe the corresponding outputs.
4. Teams analyse the observed patterns and deduce the hidden program logic.
5. Teams recreate the logic using an actual Python code editor.
6. Teams can run their programs against available examples.
7. Submitted programs are checked against hidden test cases.
8. Successfully completing a challenge reveals one code fragment.
9. All three code fragments must be combined to produce the final unlock code.

## Challenge Progression

| Challenge | Difficulty | Intended concepts |
|---|---|---|
| Black Box 01 | Easy | Basic arithmetic operations |
| Black Box 02 | Medium | Multiple operations and expressions |
| Black Box 03 | Hard | Conditions and logical operations |

Exact puzzle programs and test cases will be prepared separately.

## Hint System

- Teams may request optional hints.
- Hints reveal additional examples or clues about the hidden logic.
- Requesting hints deducts points from the team's score.
- Hint penalties and scoring values must be finalized before implementation.

## Python Editor

- Participants use an actual Python code editor.
- The editor supports the programming constructs required by the three challenges.
- Participants must reproduce the hidden program's behaviour, not merely match the displayed examples.
- Solutions must pass server-controlled hidden test cases.
- Arbitrary unrestricted code execution must not be exposed to participants.
- Use a restricted and securely isolated execution environment with appropriate execution-time and input limits.

## Team and Device Rules

- Two participants per team.
- One laptop/device per team.
- Both participants should be able to collaborate on testing, reasoning and writing the solution.

## Technical Implementation

**Frontend:** React and TypeScript.

**Code editor:** Python editing interface.

**Execution:** Restricted Python execution environment.

**Backend:** Existing Supabase application infrastructure, with server-side validation and protected challenge definitions.

**Progress tracking:** Store challenge completion, hint usage, attempts, revealed fragments and final completion against the relevant team.

**Organizer controls:** Follow the existing organizer-controlled round activation and server-authoritative timer decisions.

## Security and Validation

- Hidden formulas and expected outputs must not be exposed in frontend code.
- Hidden test cases must remain server-side.
- Validate submitted solutions against hidden test cases.
- Prevent teams from accessing another team's progress.
- Apply hint penalties and completion rewards through trusted server-side logic.
- Do not execute arbitrary participant code directly inside the Supabase database or unrestricted application server.

## Pending Content Decisions

The gameplay and editor approach are finalized. The following content and technical details remain to be prepared:

- Exact three Python challenge programs.
- Initial input-output examples for each challenge.
- Supported Python syntax and execution restrictions.
- Hidden test cases.
- Hint content and point deductions.
- Challenge scoring and completion rewards.
- Three code fragments and the final unlock code.
- Final duration and scoring configuration.

## Implementation Rule

Build and verify one feature at a time.

Recommended implementation order:

1. Prepare and verify the three challenge specifications.
2. Design the Python editor interface.
3. Implement restricted code execution.
4. Implement input-output experimentation.
5. Implement hidden test-case validation.
6. Implement hints and score deductions.
7. Implement code-fragment reveals and final unlock.
8. Integrate team progress, organizer controls and event testing.

Do not replace this approved gameplay with the previous blindfold communication concept or the Visual Code Builder.
