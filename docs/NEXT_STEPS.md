# THE HUNT FOR 18 – Next Steps

**Last Updated:** 27 November 2026
**Event Date:** 28 November 2026

## 1. Immediate Objective

Prepare and implement a reliable Minimum Viable Product for the event.

Prioritize essential functionality, security, testing and deployment over optional features.

## 2. Remaining Planning Tasks

### Gameplay decisions
- Round 2 and Round 3 victim counts and non-blocking progression are confirmed; keep exact victim/story content and all mark values uninvented until approved.
- Prepare Round 2's six challenges and Round 1 evidence dependency for owner approval.
- Round 3 challenge programs, I/O examples, supported Python syntax, execution limits, hints, code fragments and final unlock code remain to be specified.
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

1. Complete manual visual review of the hosted-tested Round 2 interface, using existing authorized organizer/team access. No competition content is finalized.
2. Round 3 implementation, including two victim reveals for each of its three challenges.
3. Organizer dashboard, configurable round/challenge marks, server-authoritative timers and scoring, and after-round leaderboards.
4. Optional Round 4; keep it locked unless authorized and support the approved skip/recovery policies.
5. End-to-end testing and deployment after approval.

Do not implement the organizer dashboard or Round 4 as part of Round 2 preparation. Do not invent challenge content or scoring values. Keep hosted work on test project `bfzlszktufjqlfiyknga`; never access production.

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
1. Review Round 2 manually; its migration and hosted integration tests are complete on the approved test project.
2. Record owner feedback and address any approved Round 2 corrections.
3. Do not begin Round 3 until the owner has reviewed Round 2 and approved the next milestone.
4. Continue using only test project `bfzlszktufjqlfiyknga`; do not deploy to production without separate approval.
