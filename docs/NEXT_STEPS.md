# THE HUNT FOR 18 – Next Steps

**Last Updated:** 23 November 2026
**Event Date:** 28 November 2026

## 1. Immediate Objective

Prepare and implement a reliable Minimum Viable Product for the event.

Prioritize essential functionality, security, testing and deployment over optional features.

## 2. Remaining Planning Tasks

### Gameplay decisions
- Finalize Round 3 mechanics.
- Confirm victim information distribution.
- Finalize challenge content and evidence.
- Define scoring and penalties.
- Confirm qualification criteria.
- Finalize maze structure and final objective.

### Technical decisions
- Expand the verified core schema into the remaining gameplay-specific MVP tables.
- Define and implement trusted team and organizer provisioning.
- Finalize submission and protected-answer operations.
- Define submission and timer expiry behavior.
- Establish development and production environments.

## 2A. Completed Backend Foundation

- Initial core migration `20261122173709_initial_core_schema.sql` created.
- Migration successfully applied to production project `the-hunt-for-18`.
- Local and remote migration histories match.
- `events`, `rounds`, `round_config`, `teams`, `team_members`, and `organizer_roles` exist in the public schema.
- Migration is committed and pushed; the Git working tree was clean before this documentation update.

This is only the core foundation. The full database design and gameplay schema are still pending.

## 3. Development Roadmap

| Target date | Phase | Main deliverable |
|---|---|---|
| Nov 20 | Foundation | React, Vite, TypeScript and project setup |
| Nov 21 | Backend | Supabase, database, authentication and security |
| Nov 22 | Admin | Essential organizer dashboard |
| Nov 23 | Participant | Team dashboard and protected access |
| Nov 24 | Rounds 1 and 2 | Working core challenges |
| Nov 25 | Rounds 3 and 4 | Approved Round 3 and playable final MVP |
| Nov 26 | Integration | Scoring, timers, leaderboard and testing |
| Nov 27 | Deployment | Production deployment and rehearsal |
| Nov 28 | Event | Run THE HUNT FOR 18 |

This is an aggressive target, not a guarantee. Reduce scope when necessary to preserve reliability.

## 4. Development Workflow

For every feature:

1. Read relevant project documentation.
2. Confirm requirements.
3. Plan the implementation.
4. Identify files to create or modify.
5. Implement one feature.
6. Run relevant checks.
7. Fix identified bugs.
8. Verify the feature.
9. Update project documentation.
10. Commit verified work.

## 5. Copilot Credit Management

Temporary event-sprint allocation:

- 60% implementation.
- 30% debugging and testing.
- 10% emergency reserve.

Record actual usage whenever available.

Do not invent AI credit consumption figures.

## 6. Completion Criteria

A feature is complete only when:
- Its requirements are implemented.
- Expected behavior is verified.
- Critical errors are resolved.
- Security requirements are checked.
- Relevant documentation is updated.
- The working change is committed.

## 7. Next Development Session

**Target date:** 23 November 2026 or next implementation session

First tasks:
1. Continue implementation of the existing React + Vite + TypeScript application foundation.
2. Connect the frontend to the verified Supabase project.
3. Implement trusted team and organizer provisioning.
4. Implement authentication and protected route boundaries.
5. Add remaining MVP database migrations only after unresolved gameplay decisions are finalized.
6. Implement one core application feature at a time and verify it.
