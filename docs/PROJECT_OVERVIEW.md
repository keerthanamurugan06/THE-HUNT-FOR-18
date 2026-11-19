# THE HUNT FOR 18
## The Ultimate Investigation Challenge

### 1. Project Overview

**Event Name:** THE HUNT FOR 18  
**Tagline:** 18 Victims. 1 Killer. 1 Mystery. Are You Ready to Uncover the Truth?  
**Event Date:** 28 November 2026  
**Event Duration:** 120 minutes  
**Expected Participation:** 25 teams / 50 participants  
**Team Size:** 2 participants per team

THE HUNT FOR 18 is an interactive investigation challenge in which teams progress through four connected rounds to uncover an investigation involving 18 victims and identify the killer.

The event combines logical reasoning, observation, decoding, teamwork, communication and problem-solving.

### 2. Event Objectives

- Create an engaging investigation-based technical event.
- Test participants' logical and analytical thinking.
- Encourage communication and teamwork.
- Provide interactive digital gameplay.
- Deliver one continuous storyline across all four rounds.

### 3. Four Rounds

| Round | Name | Core Direction |
|---|---|---|
| 1 | DIGITAL LOGIC TRAP | Solve logic-based puzzles and uncover investigation evidence. |
| 2 | PASSWORD BREAKER | Solve password challenges and discover hidden investigation words. |
| 3 | BLIND CODE | Complete a partner-based challenge connected to the investigation. Gameplay is not finalized. |
| 4 | OPERATION: DEADLOCK | Navigate a digital investigation maze, connect the evidence and identify the killer. |

**Storyline rule:** Rounds 1–3 progressively reveal information about the 18 victims. The final round focuses on connecting the investigation and identifying the killer.

Do not change this storyline structure.

### 4. Event Schedule

The following is the provisional 120-minute schedule. The organizer must be able to modify round durations.

| Activity | Duration |
|---|---:|
| Welcome | 5 minutes |
| Rules and instructions | 5 minutes |
| Round 1 | 20 minutes |
| Transition | 2 minutes |
| Round 2 | 15 minutes |
| Transition | 2 minutes |
| Round 3 | 18 minutes |
| Score verification | 5 minutes |
| Final Round | 38 minutes |
| Winner announcement and closing | 10 minutes |
| **Total** | **120 minutes** |

### 5. Website Overview

Build one integrated web application containing three interfaces:

**A. Public Website**
- Event introduction.
- Public event information.
- Registration request.
- Rules and instructions.
- Event updates.

**B. Admin Dashboard**
- Team management and approval.
- Participant management.
- Round configuration.
- Question and challenge management.
- Timer controls.
- Submission monitoring.
- Score management.
- Qualification management.
- Leaderboard release.
- Final-round unlocking.

**C. Participant Dashboard**
- Team login.
- Team information.
- Four round sections.
- Round instructions.
- Countdown timer.
- Questions and challenges.
- Submission interface.
- Evidence and progress.
- Round results and leaderboard.

Locked rounds may be visible but must remain inaccessible until authorized by the organizer.

### 6. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Build Tool | Vite |
| Programming Language | TypeScript |
| Backend / Database | Supabase |
| Authentication | Supabase Auth |
| Hosting | Vercel |
| Version Control | GitHub |
| Development Environment | VS Code |
| AI Coding Assistant | GitHub Copilot |

Use the selected stack unless a technical limitation is identified and approved by the project owner.

### 7. Important System Decisions

1. One integrated application for the entire event.
2. Organizer-created teams and participant self-registration requests.
3. Self-registration requires organizer approval.
4. Team login uses Team ID and a unique access code.
5. One laptop/device per team.
6. One internal Supabase Auth account per team.
7. Leaderboard is released after each round, not continuously.
8. Round timers are server-authoritative.
9. Round progress must survive refreshes and reconnections.
10. Scoring and answer validation must be protected from participant-side manipulation.
11. The organizer controls round activation and final-round unlocking.

### 8. Security Requirements

- Enable Supabase Row Level Security on exposed tables.
- Participants must access only their own team's protected data.
- Never expose service-role keys in frontend code.
- Keep answer keys and unreleased evidence protected.
- Validate submissions and calculate scores securely.
- Maintain an audit trail for important administrative actions.
- Separate development and production environments.

### 9. Development Priorities

The event takes place on 28 November 2026. Development must prioritize a reliable Minimum Viable Product (MVP).

Priority order:

1. Secure team login and access control.
2. Admin controls for teams, rounds and timers.
3. Participant dashboard.
4. Essential gameplay for all four rounds.
5. Submission and scoring.
6. Qualification and final-round access.
7. Leaderboard.
8. Testing, deployment and event rehearsal.

Advanced animations and optional enhancements must not compromise essential functionality or reliability.

### 10. Documentation and Continuity

The GitHub repository is the permanent source of truth.

All development decisions, completed features, known bugs and pending tasks must be documented.

Maintain:
- `CURRENT_PROGRESS.md`
- `NEXT_STEPS.md`
- `DEVELOPMENT_HISTORY.md`
- `DESIGN_DECISIONS.md`
- `AI_HANDOFF.md`

Any AI assistant continuing this project must read the relevant documentation before modifying the codebase.

### 11. Unresolved Decisions

The following must not be treated as finalized:

- Round 3 gameplay.
- Exact questions, evidence and answers for all rounds.
- Final maze layout and level count.
- Final-round scoring and trap penalties.
- Qualification count.
- Final tie-breaker rules.

The project owner must approve these decisions before implementation.
