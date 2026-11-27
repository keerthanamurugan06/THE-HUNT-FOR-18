-- Team login throttling and atomic organizer provisioning.
-- Fingerprints are HMACs created by the Edge Function. Raw team IDs and IPs
-- are never stored in this table.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.team_login_attempt_buckets (
  bucket_key text primary key
    check (bucket_key ~ '^(ip|team|pair):[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table private.team_login_attempt_buckets enable row level security;
revoke all on table private.team_login_attempt_buckets
  from public, anon, authenticated, service_role;

create or replace function public.consume_team_login_rate_limit(
  p_ip_fingerprint text,
  p_team_fingerprint text,
  p_pair_fingerprint text
)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  bucket_policy record;
  bucket_blocked_until timestamptz;
  retry_seconds integer := 0;
begin
  if p_ip_fingerprint is null or p_ip_fingerprint !~ '^[a-f0-9]{64}$'
     or p_team_fingerprint is null or p_team_fingerprint !~ '^[a-f0-9]{64}$'
     or p_pair_fingerprint is null or p_pair_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid rate-limit fingerprint'
      using errcode = '22023';
  end if;

  for bucket_policy in
    select * from (values
      ('ip:' || p_ip_fingerprint, 120, 900),
      ('team:' || p_team_fingerprint, 30, 900),
      ('pair:' || p_pair_fingerprint, 8, 600)
    ) as policies(bucket_key, attempt_limit, window_seconds)
  loop
    insert into private.team_login_attempt_buckets as existing (
      bucket_key,
      window_started_at,
      attempts,
      blocked_until,
      updated_at
    ) values (
      bucket_policy.bucket_key,
      v_now,
      1,
      null,
      v_now
    )
    on conflict (bucket_key) do update
    set
      attempts = case
        when existing.blocked_until > v_now then existing.attempts
        when existing.window_started_at <= v_now
          - pg_catalog.make_interval(secs => bucket_policy.window_seconds)
          then 1
        else existing.attempts + 1
      end,
      window_started_at = case
        when existing.blocked_until > v_now then existing.window_started_at
        when existing.window_started_at <= v_now
          - pg_catalog.make_interval(secs => bucket_policy.window_seconds)
          then v_now
        else existing.window_started_at
      end,
      blocked_until = case
        when existing.blocked_until > v_now then existing.blocked_until
        when existing.window_started_at <= v_now
          - pg_catalog.make_interval(secs => bucket_policy.window_seconds)
          then null
        when existing.attempts + 1 >= bucket_policy.attempt_limit
          then v_now + pg_catalog.make_interval(secs => bucket_policy.window_seconds)
        else null
      end,
      updated_at = v_now
    returning blocked_until
    into bucket_blocked_until;

    if bucket_blocked_until > v_now then
      retry_seconds := greatest(
        retry_seconds,
        ceil(extract(epoch from (bucket_blocked_until - v_now)))::integer
      );
    end if;
  end loop;

  -- Opportunistic bounded cleanup avoids retaining inactive fingerprints forever.
  if pg_catalog.random() < 0.01 then
    delete from private.team_login_attempt_buckets
    where updated_at < v_now - interval '2 days';
  end if;

  return query select retry_seconds = 0, retry_seconds;
end;
$$;

revoke all on function public.consume_team_login_rate_limit(text, text, text)
  from public, anon, authenticated;
grant execute on function public.consume_team_login_rate_limit(text, text, text)
  to service_role;

-- Team row and provisioning audit entry are written in one transaction.
-- The Edge Function verifies the caller's organizer role before calling this
-- service-role-only function; this function checks the role again defensively.
create or replace function public.provision_team_record(
  p_event_id uuid,
  p_team_code text,
  p_team_name text,
  p_auth_user_id uuid,
  p_access_code_hash text,
  p_actor_user_id uuid
)
returns table (
  id uuid,
  team_code text,
  team_name text,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_team public.teams%rowtype;
begin
  if not exists (
    select 1
    from public.organizer_roles r
    where r.user_id = p_actor_user_id
      and r.role = 'organizer'
  ) then
    raise exception 'Organizer authorization required'
      using errcode = '42501';
  end if;

  insert into public.teams (
    event_id,
    team_code,
    team_name,
    status,
    auth_user_id,
    access_code_hash
  ) values (
    p_event_id,
    btrim(p_team_code),
    btrim(p_team_name),
    'approved',
    p_auth_user_id,
    p_access_code_hash
  )
  returning * into created_team;

  insert into public.team_audit_logs (
    team_id,
    actor_user_id,
    action,
    metadata
  ) values (
    created_team.id,
    p_actor_user_id,
    'team_provisioned',
    '{"source":"organizer_provisioning"}'::jsonb
  );

  return query
  select created_team.id, created_team.team_code, created_team.team_name, created_team.status;
end;
$$;

revoke all on function public.provision_team_record(uuid, text, text, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.provision_team_record(uuid, text, text, uuid, text, uuid)
  to service_role;
