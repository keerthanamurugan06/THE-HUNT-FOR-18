-- Initial core schema for THE HUNT FOR 18.
-- This migration creates identity, event, round, and role tables only.

create extension if not exists pgcrypto with schema extensions;


-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (btrim(name) <> '' and char_length(name) <= 200),
  event_date date,
  duration_minutes integer not null default 120
    check (duration_minutes > 0),
  timezone text not null default 'UTC'
    check (btrim(timezone) <> '' and char_length(timezone) <= 100),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'active', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_status_idx on public.events (status);
create index events_event_date_idx on public.events (event_date);


create table public.rounds (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  round_number integer not null check (round_number between 1 and 4),
  round_name text not null check (btrim(round_name) <> '' and char_length(round_name) <= 200),
  duration_minutes integer not null check (duration_minutes > 0),
  status text not null default 'locked'
    check (status in ('draft', 'locked', 'ready', 'running', 'paused', 'ended')),
  display_order integer not null check (display_order between 1 and 4),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rounds_start_before_end check (starts_at is null or ends_at is null or ends_at >= starts_at),
  constraint rounds_event_round_unique unique (event_id, round_number),
  constraint rounds_event_display_unique unique (event_id, display_order)
);

create index rounds_event_status_idx on public.rounds (event_id, status);
create index rounds_active_window_idx on public.rounds (starts_at, ends_at);


create table public.round_config (
  id uuid primary key default extensions.gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  version integer not null check (version > 0),
  configuration jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  is_frozen boolean not null default false,
  frozen_at timestamptz,
  frozen_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint round_config_round_version_unique unique (round_id, version),
  constraint round_config_freeze_state check (
    (is_frozen = false and frozen_at is null and frozen_by is null)
    or
    (is_frozen = true and frozen_at is not null and frozen_by is not null)
  )
);

create unique index round_config_one_active_idx
  on public.round_config (round_id)
  where is_active;
create index round_config_round_frozen_idx
  on public.round_config (round_id, is_frozen);


create table public.teams (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  team_code text not null
    check (btrim(team_code) <> '' and team_code = btrim(team_code)
      and char_length(team_code) <= 50),
  team_name text not null
    check (btrim(team_name) <> '' and char_length(team_name) <= 200),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'active', 'rejected', 'suspended', 'disqualified')),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  access_code_hash text not null
    check (
      char_length(access_code_hash) >= 60
      and access_code_hash !~ '[[:space:]]'
      and (
        access_code_hash ~ '^\$2[aby]\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$'
        or access_code_hash ~ '^\$argon2(id|i|d)\$[^[:space:]$]+(\$[^[:space:]$]+)+$'
        or access_code_hash ~ '^\$scrypt\$[^[:space:]$]+(\$[^[:space:]$]+)+$'
      )
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_event_code_unique unique (event_id, team_code)
);

create index teams_event_status_idx on public.teams (event_id, status);
create index teams_team_name_idx on public.teams (team_name);


create table public.team_members (
  id uuid primary key default extensions.gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  participant_name text not null
    check (btrim(participant_name) <> '' and char_length(participant_name) <= 200),
  participant_email text
    check (
      participant_email is null
      or (
        participant_email = btrim(participant_email)
        and participant_email = lower(participant_email)
        and char_length(participant_email) between 3 and 320
        and participant_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      )
    ),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_members_team_email_unique unique (team_id, participant_email)
);

create index team_members_team_idx on public.team_members (team_id);
create index team_members_email_idx on public.team_members (participant_email);


create table public.organizer_roles (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role = 'organizer'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organizer_roles_role_idx on public.organizer_roles (role);


-- ---------------------------------------------------------------------------
-- Trigger helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger set_rounds_updated_at
before update on public.rounds
for each row execute function public.set_updated_at();

create trigger set_round_config_updated_at
before update on public.round_config
for each row execute function public.set_updated_at();

create trigger set_teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create trigger set_team_members_updated_at
before update on public.team_members
for each row execute function public.set_updated_at();

create trigger set_organizer_roles_updated_at
before update on public.organizer_roles
for each row execute function public.set_updated_at();


create or replace function public.enforce_team_member_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  member_count integer;
begin
  if tg_op = 'UPDATE' and old.team_id is distinct from new.team_id then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(old.team_id::text));
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.team_id::text));

  select count(*)
  into member_count
  from public.team_members
  where team_id = new.team_id
    and (tg_op = 'INSERT' or id <> new.id);

  if member_count >= 2 then
    raise exception 'A team cannot have more than two team members';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_team_member_limit() from public, anon, authenticated;

create trigger enforce_team_member_limit
before insert or update of team_id on public.team_members
for each row execute function public.enforce_team_member_limit();


create or replace function public.prevent_frozen_round_config_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_frozen then
      raise exception 'Frozen round configuration cannot be deleted';
    end if;
    return old;
  end if;

  if old.is_frozen then
    raise exception 'Frozen round configuration cannot be edited';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_frozen_round_config_changes() from public, anon, authenticated;

create trigger prevent_frozen_round_config_changes
before update or delete on public.round_config
for each row execute function public.prevent_frozen_round_config_changes();


-- ---------------------------------------------------------------------------
-- Authorization helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_organizer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organizer_roles r
    where r.user_id = auth.uid()
  );
$$;

revoke all on function public.is_organizer() from public, anon;
grant execute on function public.is_organizer() to authenticated;


create or replace function public.my_team_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select t.id
  from public.teams t
  where t.auth_user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.my_team_id() from public, anon;
grant execute on function public.my_team_id() to authenticated;


create or replace function public.freeze_round_config(p_config_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  frozen_count integer;
begin
  if auth.uid() is null or not public.is_organizer() then
    raise exception 'Only authorized organizers may freeze round configuration'
      using errcode = '42501';
  end if;

  update public.round_config rc
  set
    is_frozen = true,
    frozen_at = pg_catalog.now(),
    frozen_by = auth.uid(),
    updated_at = pg_catalog.now()
  where rc.id = p_config_id
    and rc.is_frozen = false;

  get diagnostics frozen_count = row_count;
  if frozen_count <> 1 then
    raise exception 'Round configuration was not found or is already frozen';
  end if;
end;
$$;

revoke all on function public.freeze_round_config(uuid) from public, anon;
grant execute on function public.freeze_round_config(uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.events enable row level security;
alter table public.rounds enable row level security;
alter table public.round_config enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.organizer_roles enable row level security;


-- Events: published event metadata is public; team users see their event;
-- organizers see and manage every event.
create policy events_public_select
on public.events
for select
to anon, authenticated
using (
  status = 'published'
);

create policy events_organizer_select
on public.events
for select
to authenticated
using (public.is_organizer());

create policy events_team_select
on public.events
for select
to authenticated
using (
  exists (
    select 1
    from public.teams t
    where t.id = public.my_team_id()
      and t.event_id = events.id
  )
);

create policy events_organizer_insert
on public.events
for insert
to authenticated
with check (public.is_organizer());

create policy events_organizer_update
on public.events
for update
to authenticated
using (public.is_organizer())
with check (public.is_organizer());

create policy events_organizer_delete
on public.events
for delete
to authenticated
using (public.is_organizer());


-- Rounds: published/active lifecycle metadata is visible to teams for their
-- event. Draft rounds are not exposed. No participant writes.
create policy rounds_organizer_select
on public.rounds
for select
to authenticated
using (public.is_organizer());

create policy rounds_team_select
on public.rounds
for select
to authenticated
using (
  status <> 'draft'
  and exists (
    select 1
    from public.teams t
    where t.id = public.my_team_id()
      and t.event_id = rounds.event_id
  )
);

create policy rounds_organizer_insert
on public.rounds
for insert
to authenticated
with check (public.is_organizer());

create policy rounds_organizer_update
on public.rounds
for update
to authenticated
using (public.is_organizer())
with check (public.is_organizer());

create policy rounds_organizer_delete
on public.rounds
for delete
to authenticated
using (public.is_organizer());


-- Protected round configuration is organizer-only. Participant policies are
-- intentionally absent.
create policy round_config_organizer_select
on public.round_config
for select
to authenticated
using (public.is_organizer());

create policy round_config_organizer_insert
on public.round_config
for insert
to authenticated
with check (
  public.is_organizer()
  and is_frozen = false
  and frozen_at is null
  and frozen_by is null
);

create policy round_config_organizer_update
on public.round_config
for update
to authenticated
using (public.is_organizer() and is_frozen = false)
with check (
  public.is_organizer()
  and is_frozen = false
  and frozen_at is null
  and frozen_by is null
);

create policy round_config_organizer_delete
on public.round_config
for delete
to authenticated
using (public.is_organizer() and is_frozen = false);


-- Teams: team accounts see only their own row; organizers manage team records.
create policy teams_organizer_select
on public.teams
for select
to authenticated
using (public.is_organizer());

create policy teams_team_select
on public.teams
for select
to authenticated
using (id = public.my_team_id());

create policy teams_organizer_insert
on public.teams
for insert
to authenticated
with check (public.is_organizer());

create policy teams_organizer_update
on public.teams
for update
to authenticated
using (public.is_organizer())
with check (public.is_organizer());

create policy teams_organizer_delete
on public.teams
for delete
to authenticated
using (public.is_organizer());


-- Team membership: a team sees only its own members; organizers manage them.
create policy team_members_organizer_select
on public.team_members
for select
to authenticated
using (public.is_organizer());

create policy team_members_team_select
on public.team_members
for select
to authenticated
using (team_id = public.my_team_id());

create policy team_members_organizer_insert
on public.team_members
for insert
to authenticated
with check (public.is_organizer());

create policy team_members_organizer_update
on public.team_members
for update
to authenticated
using (public.is_organizer())
with check (public.is_organizer());

create policy team_members_organizer_delete
on public.team_members
for delete
to authenticated
using (public.is_organizer());


-- Organizer role records are readable by the role holder or another organizer.
-- No policy grants inserts, updates, or deletes to authenticated users.
create policy organizer_roles_authorized_select
on public.organizer_roles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_organizer()
);


-- ---------------------------------------------------------------------------
-- Column privileges
-- ---------------------------------------------------------------------------

revoke all on table public.events from public;
revoke all on table public.rounds from public;
revoke all on table public.round_config from public;
revoke all on table public.teams from public;
revoke all on table public.team_members from public;
revoke all on table public.organizer_roles from public;

revoke all on table public.events from anon, authenticated;
grant select (id, name, event_date, duration_minutes, timezone, status, created_at, updated_at)
  on table public.events to anon, authenticated;
grant insert (name, event_date, duration_minutes, timezone, status)
  on table public.events to authenticated;
grant update (name, event_date, duration_minutes, timezone, status)
  on table public.events to authenticated;
grant delete on table public.events to authenticated;

revoke all on table public.rounds from anon, authenticated;
grant select (id, event_id, round_number, round_name, duration_minutes, status,
              display_order, starts_at, ends_at, created_at, updated_at)
  on table public.rounds to authenticated;
grant insert (event_id, round_number, round_name, duration_minutes, status,
              display_order, starts_at, ends_at)
  on table public.rounds to authenticated;
grant update (event_id, round_number, round_name, duration_minutes, status,
              display_order, starts_at, ends_at)
  on table public.rounds to authenticated;
grant delete on table public.rounds to authenticated;

revoke all on table public.round_config from anon, authenticated;
grant select (id, round_id, version, configuration, is_active, is_frozen,
              frozen_at, frozen_by, created_at, updated_at)
  on table public.round_config to authenticated;
grant insert (round_id, version, configuration, is_active)
  on table public.round_config to authenticated;
grant update (round_id, version, configuration, is_active)
  on table public.round_config to authenticated;
grant delete on table public.round_config to authenticated;

revoke all on table public.teams from anon, authenticated;
grant select (id, event_id, team_code, team_name, status, created_at, updated_at)
  on table public.teams to authenticated;
grant insert (event_id, team_code, team_name, status)
  on table public.teams to authenticated;
grant update (event_id, team_code, team_name, status)
  on table public.teams to authenticated;
grant delete on table public.teams to authenticated;

revoke all on table public.team_members from anon, authenticated;
grant select (id, team_id, participant_name, participant_email, created_at, updated_at)
  on table public.team_members to authenticated;
grant insert (team_id, participant_name, participant_email)
  on table public.team_members to authenticated;
grant update (team_id, participant_name, participant_email)
  on table public.team_members to authenticated;
grant delete on table public.team_members to authenticated;

revoke all on table public.organizer_roles from anon, authenticated;
grant select (id, user_id, role, created_at, updated_at)
  on table public.organizer_roles to authenticated;

comment on table public.teams is 'Team application records. access_code_hash is never the plaintext access code.';
comment on column public.teams.access_code_hash is 'Bcrypt or Argon2/scrypt PHC-style password hash only.';
