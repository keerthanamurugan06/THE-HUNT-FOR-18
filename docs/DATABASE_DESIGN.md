# THE HUNT FOR 18 – Database Design

## 1. Database Overview

Database: PostgreSQL through Supabase.

The database is the authoritative source for event information, team progress, round configuration, submissions, scores and timer state.

Use relational tables, foreign keys, constraints and Row Level Security.

## 2. Proposed Database Tables

### A. Event Management

**events**
- id (UUID, primary key)
- name
- event_date
- duration_minutes
- status
- created_at
- updated_at

**rounds**
- id (UUID, primary key)
- event_id (foreign key)
- round_number
- round_name
- duration_minutes
- status
- display_order
- created_at
- updated_at

**round_config**
- id (UUID, primary key)
- round_id (foreign key)
- configuration (JSONB)
- version
- is_frozen
- updated_at

### B. Teams and Authentication

**teams**
- id (UUID, primary key)
- team_code (unique)
- team_name
- auth_user_id (unique, references Supabase Auth user)
- status
- created_at
- updated_at

**team_members**
- id (UUID, primary key)
- team_id (foreign key)
- participant_name
- participant_email
- created_at

Enforce a maximum of two members per team through a secure database operation or trigger.

**organizer_roles**
- id (UUID, primary key)
- user_id (references Supabase Auth user)
- role
- created_at

Do not store team access codes in plaintext. Authentication credentials must be managed securely.

### C. Registration

**registration_requests**
- id (UUID, primary key)
- team_name
- participant_details (JSONB)
- status (pending, approved, rejected)
- reviewed_by
- reviewed_at
- created_at

Approval must be handled by an authorized organizer operation.

### D. Questions and Challenges

**questions**
- id (UUID, primary key)
- round_id (foreign key)
- question_type
- question_content
- points
- difficulty
- display_order
- status
- created_at
- updated_at

**answer_keys**
- id (UUID, primary key)
- question_id (foreign key, unique)
- protected_answer
- validation_config
- created_at
- updated_at

Answer keys must never be accessible to participant queries.

### E. Submissions and Results

**submissions**
- id (UUID, primary key)
- team_id (foreign key)
- round_id (foreign key)
- question_id (foreign key, nullable where appropriate)
- submission_value
- idempotency_key
- submitted_at
- status

**submission_results**
- id (UUID, primary key)
- submission_id (foreign key, unique)
- is_correct
- points_awarded
- validated_at
- validation_details

Only trusted server-side logic may create authoritative validation results.

### F. Scores and Leaderboard

**team_scores**
- id (UUID, primary key)
- team_id (foreign key)
- round_id (foreign key)
- total_points
- updated_at

Use appropriate unique constraints to prevent duplicate team-round score records.

**leaderboard_releases**
- id (UUID, primary key)
- round_id (foreign key)
- released_by
- released_at
- status

Leaderboard results must only become visible after organizer release.

### G. Timers

**timers**
- id (UUID, primary key)
- round_id (foreign key)
- status
- started_at
- ends_at
- paused_at
- accumulated_paused_seconds
- updated_at

Timer changes must be performed through authorized server-side operations and recorded in the audit log.

### H. Investigation Evidence

**evidence**
- id (UUID, primary key)
- round_id (foreign key)
- source_question_id (nullable foreign key)
- title
- protected_content
- evidence_type
- display_order
- created_at

**team_evidence**
- id (UUID, primary key)
- team_id (foreign key)
- evidence_id (foreign key)
- unlocked_at

Enforce one unlock per team per evidence item.

### I. Qualification and Progress

**qualifications**
- id (UUID, primary key)
- team_id (foreign key)
- round_id (foreign key)
- qualified
- decided_by
- decided_at
- notes

**team_round_progress**
- id (UUID, primary key)
- team_id (foreign key)
- round_id (foreign key)
- progress_data (JSONB)
- status
- updated_at

### J. Audit History

**event_audit_logs**
- id (UUID, primary key)
- actor_user_id
- action
- entity_type
- entity_id
- old_values (JSONB)
- new_values (JSONB)
- created_at

Record important administrative operations, including:
- Timer changes.
- Question and answer configuration changes.
- Submission corrections.
- Score recalculations.
- Qualification decisions.
- Final-round unlocking.
- Leaderboard releases.

Audit records must not be editable by ordinary participants.

## 3. Important Relationships

- One event contains multiple rounds.
- One team has one internal authentication account.
- One team can have up to two participants.
- One round contains multiple questions.
- One question can have one protected answer key.
- One team can submit multiple answers.
- One submission can have one authoritative result.
- One team can unlock multiple evidence items.
- One round has one authoritative timer record.
- One team can have a score record for each round.
- Qualification records control access to the final round.

## 4. Security Requirements

Enable Supabase Row Level Security on exposed tables.

Participant access:
- View only their own team information.
- View only their own progress and submissions.
- View evidence unlocked for their team.
- View only released leaderboard results.
- Never read answer keys or protected unreleased evidence.

Organizer access:
- Manage authorized event configuration.
- Manage teams and registration.
- Control rounds and timers.
- Review submissions and scores.
- Approve qualification and final-round access.

Use secure database functions or Edge Functions for privileged operations.

Never expose service_role credentials in frontend code.

## 5. Data Integrity

- Use UUID primary keys.
- Use foreign keys.
- Add unique constraints where needed.
- Validate required fields.
- Prevent duplicate evidence unlocks.
- Prevent duplicate scoring.
- Use transactions for operations that update multiple related records.
- Store timestamps consistently in UTC.
- Preserve accepted submissions after round expiry.
- Maintain audit history for important changes.

## 6. Database Implementation Rules

Before implementing:
1. Review this design.
2. Check every table against the actual MVP requirements.
3. Identify unnecessary tables or fields.
4. Finalize the schema with the project owner.
5. Create version-controlled Supabase migrations.
6. Implement RLS policies.
7. Test access with organizer and participant accounts.

Do not blindly create every proposed table if the MVP does not require it.

## 7. Pending Decisions

- Exact registration fields.
- Final team and participant information requirements.
- Detailed question and evidence structures.
- Final scoring schema.
- Leaderboard ranking and tie-breaker rules.
- Exact qualification logic.
- Final-round progress representation.
- Data retention and event cleanup policy.

This document is a proposed logical design, not an executed database migration.
