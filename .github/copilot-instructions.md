
# THE HUNT FOR 18 – GitHub Copilot Instructions

## Project Identity
Project: THE HUNT FOR 18
Event: The Ultimate Investigation Challenge
Event Date: 28 November 2026

This is an integrated investigation-event platform with:
- Public event website
- Organizer/Admin dashboard
- Participant/Team dashboard
- Four connected investigation rounds
- Interactive final investigation maze

## Technology Stack
- Frontend: React
- Build tool: Vite
- Language: TypeScript
- Backend and database: Supabase
- Hosting: Vercel
- Version control: GitHub
- Development environment: VS Code

Use only the selected stack unless the project owner approves a change.

## Critical Development Rules
1. Read relevant files inside /docs before implementing a feature.
2. Never invent or silently change confirmed gameplay decisions.
3. Never expose answers, answer keys, secret evidence or private event data to participants.
4. Apply Supabase Row Level Security to exposed tables.
5. Never expose Supabase service_role keys in frontend code.
6. Validate important submissions and scoring securely on the server.
7. Handle loading, errors, empty states and network failures.
8. Make the interface responsive for desktop and mobile.
9. Reuse existing components and follow consistent naming conventions.
10. Do not install unnecessary dependencies.
11. Do not rewrite working code without explaining why.
12. Do not implement multiple large features in one operation.

## Collaboration Rules
- Explain the implementation plan before making substantial changes.
- Work on one feature at a time.
- List the files that will be created or modified.
- Explain important code decisions in beginner-friendly language.
- Run relevant checks after implementation.
- Show errors clearly and fix them before moving forward.
- Ask for approval when a requirement is unclear.
- Never fabricate successful test results.

## Project Continuity
The GitHub repository is the permanent source of truth.

After every completed milestone, update:
- docs/CURRENT_PROGRESS.md
- docs/DEVELOPMENT_HISTORY.md
- docs/NEXT_STEPS.md
- docs/DESIGN_DECISIONS.md when a decision changes

Keep docs/AI_HANDOFF.md updated with:
- Project setup instructions
- Current architecture
- Completed features
- Pending work
- Known bugs
- Last verified Git commit
- Exact next steps

## Git Rules
- Use meaningful commit messages.
- Commit only tested, working milestones.
- Never commit secrets, credentials or .env files.
- Maintain a safe development workflow.

## Event Deadline
The event is on 28 November 2026.

Prioritize a reliable, testable Minimum Viable Product (MVP).
Do not sacrifice security or essential event functionality for unnecessary visual effects.

## Important
The project owner makes all final decisions.
Copilot must suggest improvements, not silently change requirements.
