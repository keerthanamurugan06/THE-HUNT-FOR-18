# THE HUNT FOR 18 – Technical Architecture

## 1. Architecture Overview

THE HUNT FOR 18 will use one integrated web application with three interfaces:

1. Public event website.
2. Organizer/Admin dashboard.
3. Participant/Team dashboard.

The application will use a React frontend connected to Supabase services.

## 2. Technology Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React | User interface |
| Build tool | Vite | Development and production builds |
| Language | TypeScript | Type safety |
| Routing | React Router | Navigation and protected routes |
| Styling | Tailwind CSS | Responsive interface |
| Backend | Supabase | Backend services |
| Database | PostgreSQL through Supabase | Persistent application data |
| Authentication | Supabase Auth | Team and organizer authentication |
| Server functions | Supabase Edge Functions / secure database functions | Protected operations |
| Hosting | Vercel | Frontend deployment |
| Version control | GitHub | Source code and history |

Dependencies must be installed only when needed and approved by the project owner.

## 3. Application Structure

### Public Website
- Event introduction.
- Rules and event information.
- Registration request.
- Public updates.

### Admin Dashboard
- Organizer authentication.
- Team management.
- Registration approval.
- Round management.
- Question and challenge configuration.
- Timer management.
- Submission monitoring.
- Scoring and corrections.
- Qualification management.
- Leaderboard release.
- Final-round unlocking.
- Audit history.

### Participant Dashboard
- Team authentication.
- Team details.
- Four round sections.
- Round instructions.
- Timer and progress.
- Interactive challenges.
- Submission controls.
- Evidence display.
- Results and released leaderboard.

## 4. Authentication and Authorization

### Team Authentication
- Each team has a unique Team ID and access code.
- Each team uses one internal Supabase Auth account.
- Access codes must not be stored in plaintext in application tables.
- Organizers can reset or regenerate access codes.
- Participants must only access their own team's authorized information.

### Organizer Authentication
- Organizers must authenticate securely.
- Admin permissions must be verified server-side.
- Do not rely only on hiding admin pages in the frontend.

### Registration
- Organizers can create teams directly.
- Participants can submit registration requests.
- Registration requests remain pending until approved.
- Approval must happen before team account provisioning.

## 5. Database and Backend Responsibilities

Supabase PostgreSQL stores:
- Event configuration.
- Teams and team membership.
- Round configuration.
- Questions and challenges.
- Submissions.
- Scores.
- Timers.
- Evidence.
- Qualifications.
- Audit logs.

Supabase Auth manages authenticated identities.

Protected Edge Functions or secure database functions handle:
- Submission validation.
- Answer checking.
- Scoring.
- Timer operations.
- Qualification.
- Final-round unlocking.
- Leaderboard release.

The browser must not be trusted to calculate authoritative scores or reveal protected answers.

## 6. Timer Architecture

- The database stores authoritative start and end timestamps.
- All teams share the same round timing.
- The organizer controls timer operations.
- Participants calculate the displayed countdown using server timestamps.
- Refreshing the page must not restart a round.
- Reconnection must restore the correct timer state.
- Expiry must close submissions according to the defined deadline policy.
- Accepted submissions and progress must remain stored.
- Live configuration must be frozen when a round starts.

## 7. Data Security

- Enable Row Level Security on exposed tables.
- Restrict participant queries to their own team.
- Keep answer keys and unreleased evidence protected.
- Never expose Supabase service_role credentials in frontend code.
- Validate important operations on the server.
- Record sensitive administrative changes in audit logs.
- Use separate development and production configurations.
- Never use production data for experiments.

## 8. Reliability

The application must handle:
- Page refreshes.
- Temporary internet disconnections.
- Reconnection.
- Duplicate submissions.
- Multiple teams submitting simultaneously.
- Timer expiry.
- Organizer corrections.
- Database or network errors.

Use database constraints and unique submission identifiers where appropriate to prevent duplicate scoring.

Realtime notifications may be used for updates, but the database remains the source of truth. The application must also refresh data after reconnecting.

## 9. Proposed Frontend Organization

```text
src/
  app/
  components/
  features/
    public/
    authentication/
    registration/
    admin/
    participant/
    round-1/
    round-2/
    round-3/
    final-round/
    leaderboard/
  hooks/
  lib/
  services/
  types/
  utils/
```

Organize each feature into reusable components, hooks, services and types when useful.

Do not create unnecessary abstractions for small features.

## 10. Testing Strategy

Test:
- Authentication and authorization.
- Registration approval.
- Team isolation.
- RLS policies.
- Timer synchronization.
- Puzzle validation.
- Challenge validation.
- Submission reliability.
- Scoring accuracy.
- Qualification and final unlock.
- Concurrent team usage.
- Mobile and desktop layouts.
- Refresh and reconnection recovery.

Conduct a complete rehearsal before event day.

## 11. Deployment Strategy