-- Stage 2.1 database foundation for secure team authentication.
-- This migration is additive and does not create teams or auth accounts.


-- Team IDs must be globally unique so login never depends on event selection.
alter table public.teams
  add constraint teams_team_code_global_unique
  unique (team_code);


-- Immutable metadata validation that PostgreSQL can call from a CHECK constraint.
create or replace function public.is_safe_team_audit_metadata(p_metadata jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_metadata is null
    or (
      jsonb_typeof(p_metadata) = 'object'
      and not exists (
        select 1
        from jsonb_object_keys(p_metadata) as keys(key_name)
        where lower(keys.key_name) in (
          'access_code',
          'access_code_hash',
          'plaintext_access_code',
          'password',
          'auth_password',
          'internal_password',
          'service_role',
          'service_role_key',
          'token',
          'refresh_token'
        )
      )
      and not exists (
        select 1
        from jsonb_each(p_metadata) as value_row
        where jsonb_typeof(value_row.value) not in ('string', 'number', 'boolean', 'null')
      )
    );
$$;

revoke all on function public.is_safe_team_audit_metadata(jsonb)
  from public, anon, authenticated;
grant execute on function public.is_safe_team_audit_metadata(jsonb)
  to service_role;


-- Append-only audit records for privileged team provisioning and credential resets.
create table public.team_audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  team_id uuid not null
    references public.teams(id) on delete restrict,
  actor_user_id uuid not null
    references auth.users(id) on delete restrict,
  action text not null
    check (action in ('team_provisioned', 'access_code_reset')),
  metadata jsonb
    check (public.is_safe_team_audit_metadata(metadata)),
  created_at timestamptz not null default now()
);

create index team_audit_logs_team_created_idx
  on public.team_audit_logs (team_id, created_at desc);

create index team_audit_logs_actor_created_idx
  on public.team_audit_logs (actor_user_id, created_at desc);

create index team_audit_logs_action_created_idx
  on public.team_audit_logs (action, created_at desc);


alter table public.team_audit_logs enable row level security;


-- No ordinary role may read or write audit records. Future privileged database
-- operations must use a trusted migration-owned function or service-role process.
revoke all on table public.team_audit_logs from public;
revoke all on table public.team_audit_logs from anon;
revoke all on table public.team_audit_logs from authenticated;
revoke all on table public.team_audit_logs from service_role;
grant insert (
  team_id,
  actor_user_id,
  action,
  metadata,
  created_at
) on table public.team_audit_logs to service_role;


-- Audit rows are append-only, including to privileged database roles.
create or replace function public.prevent_team_audit_log_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Team audit log records are append-only';
end;
$$;

revoke all on function public.prevent_team_audit_log_mutation()
  from public, anon, authenticated;

create trigger prevent_team_audit_log_mutation
before update or delete on public.team_audit_logs
for each row execute function public.prevent_team_audit_log_mutation();

revoke truncate on table public.team_audit_logs
  from public, anon, authenticated;

create trigger prevent_team_audit_log_truncate
before truncate on public.team_audit_logs
for each statement execute function public.prevent_team_audit_log_mutation();

