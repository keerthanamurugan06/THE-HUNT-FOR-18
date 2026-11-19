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
| D015 | Participants can submit self-registration requests. | CONFIRMED |
| D016 | Self-registration requests require organizer approval. | CONFIRMED |
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

## 6. Round