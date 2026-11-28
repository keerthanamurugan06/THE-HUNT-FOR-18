# THE HUNT FOR 18 – Next Steps

**Last Updated:** 27 November 2026
**Event Date:** 28 November 2026

## 1. Immediate Objective

Finish Milestones 6 & 7 verification and mandatory network-reliability work before declaring event readiness. The approved migration is applied only on test project `bfzlszktufjqlfiyknga`; authentication and Round 1–3 hosted regression suites pass.

## 2. Remaining Planning Tasks

### Gameplay decisions
- Round 2 and Round 3 victim counts and non-blocking progression are confirmed; keep exact victim/story content and all mark values uninvented until approved.
- Prepare Round 2's six challenges and Round 1 evidence dependency for owner approval.
- Round 3 approved crypto design replaces the earlier Python proposal. Test migrations through `20261127210000` have been applied and hosted-tested; actual competition questions and scoring/deduction values remain organizer-configurable.
- Round 4 is optional; its maze and checkpoint content remain pending.

### Technical decisions
- Organizer-authorized team provisioning and Team ID + access code login are implemented and remotely verified on the test project; hosted public signup is disabled there.
- Classic Sudoku save, restoration and server-side completion validation are implemented and remotely tested on the test project.
- Expand the verified core schema into remaining gameplay-specific MVP tables as needed.
- Finalize submission and protected-answer operations.
- Define submission and timer expiry behavior.
- Establish development and production environments.

## 2A. Completed Backend Foundation

- Initial core migration `20261122173709_initial_core_schema.sql` created.
- Migration successfully applied to production project `the-hunt-for-18`.
- Local and remote migration histories match.
- `events`, `rounds`, `round_config`, `teams`, `team_members`, and `organizer_roles` exist in the public schema.
- Migrations `20261122173709`, `20261123213000`, and `20261126150000` were confirmed applied to test project `bfzlszktufjqlfiyknga`; the initial core migration was previously applied to production as documented above.
- Migration `20261127120000` is applied to the test project only; `team-login` and `provision-team` are deployed there.
- Authentication frontend and participant route guards are implemented. Hosted Auth public signup is disabled on the test project, and the remote authentication suite passed. Test teams are suspended, temporary sessions revoked and the test event cancelled; team-linked and audit-actor Auth rows remain because existing foreign keys and append-only audit records prevent their deletion.
- Migration is committed and pushed; the Git working tree was clean before this documentation update.

This is only the core foundation. The full database design and gameplay schema are still pending.

## 3. Immediate Development Priorities

1. Verify participant draft recovery and reconnect retry in browser interruption tests.
2. Verify local unsaved-progress restoration and automatic retry after reconnection across participant rounds.
3. Verify pause, resume and round closure preserve saved progress; complete end-to-end readiness checks.
4. Keep the Round 2 organizer interface unchanged and the Round 4 maze deferred.

Use only test project `bfzlszktufjqlfiyknga`; never access production. Do not commit/push without approval.

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
1. Exercise offline draft restoration/retry in the browser and load-test simultaneous participant writes.
2. Verify durable local drafts and automatic reconnect retry in browser interruption tests.
3. Run final regression and reliability tests.
4. Preserve the Round 2 interface and keep Round 4 maze deferred.
5. Use only the approved test project; no production operations.
