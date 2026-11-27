# THE HUNT FOR 18 – Next Steps

**Last Updated:** 27 November 2026
**Event Date:** 28 November 2026

## 1. Immediate Objective

Prepare and implement a reliable Minimum Viable Product for the event.

Prioritize essential functionality, security, testing and deployment over optional features.

## 2. Remaining Planning Tasks

### Gameplay decisions
- Finalize Round 3 challenge programs, input-output examples, supported Python syntax, execution limits, hint content, point deductions, scoring and final unlock code.
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

## 3. Immediate Development Priorities

1. Reconcile project documentation with the current repository implementation.
2. Create a separate Supabase cloud test project.
3. Inspect and validate the pending Classic Sudoku progress migration in the test project.
4. Complete and verify essential Round 1 backend integration.
5. Implement only essential participant and organizer workflows.
6. Test the complete event flow, including team access, timers, answer validation and error recovery.
7. Deploy only after the tested build and production configuration are verified.

Do not apply pending migrations to production or modify production event data without explicit approval. Reduce scope rather than compromise security or reliability.
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

**Target date:** 27 November 2026 or next implementation session

First tasks:
1. Continue implementation of the existing React + Vite + TypeScript application.
2. Create a separate Supabase cloud test project.
3. Validate the pending Classic Sudoku progress migration in the test environment.
4. Complete essential Round 1 backend integration.
5. Implement essential participant and organizer workflows.
6. Test the complete event flow and verify the production build before deployment.
