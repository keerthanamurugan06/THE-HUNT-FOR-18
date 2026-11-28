-- Central organizer controls, authoritative round timers and shared scores.
-- Additive: existing challenge definitions and team progress are preserved.

alter table public.rounds
  add column if not exists paused_at timestamptz,
  add column if not exists paused_remaining_seconds integer
    check (paused_remaining_seconds is null or paused_remaining_seconds >= 0);
alter table public.rounds alter column duration_minutes set default 20;

alter table public.team_sudoku_progress add column if not exists completed_at timestamptz;
update public.team_sudoku_progress set completed_at=updated_at
where status='completed' and completed_at is null;
create or replace function private.stamp_sudoku_completion()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status='completed' and old.status is distinct from 'completed' then new.completed_at:=pg_catalog.now(); end if;
  return new;
end $$;
revoke all on function private.stamp_sudoku_completion() from public,anon,authenticated;
drop trigger if exists stamp_sudoku_completion on public.team_sudoku_progress;
create trigger stamp_sudoku_completion before update of status on public.team_sudoku_progress
for each row execute function private.stamp_sudoku_completion();

create unique index if not exists rounds_one_active_per_event
on public.rounds(event_id) where status in ('running','paused');

create table public.round_challenge_marks (
  event_id uuid not null,
  round_number integer not null check(round_number between 1 and 4),
  challenge_key text not null check(challenge_key ~ '^(classic|jigsaw|windoku|anti_knight|anti_king|diagonal|slot:[1-6])$'),
  maximum_marks numeric(8,2) not null check(maximum_marks>=0),
  configured_by uuid references auth.users(id) on delete restrict,
  updated_at timestamptz not null default pg_catalog.now(),
  primary key(event_id,round_number,challenge_key),
  foreign key(event_id,round_number) references public.rounds(event_id,round_number) on delete restrict
);
alter table public.round_challenge_marks enable row level security;
revoke all on public.round_challenge_marks from public,anon,authenticated;
grant select,insert,update on public.round_challenge_marks to authenticated;
create policy round_challenge_marks_organizer_all on public.round_challenge_marks
for all to authenticated using(public.is_organizer()) with check(public.is_organizer());

create table public.event_operation_audit (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete restrict,
  action text not null check(action in ('round_authorized','round_started','round_paused','round_resumed','round_extended','round_ended','round_expired','round_duration_changed','challenge_marks_changed','team_status_changed','leaderboard_published','finalists_confirmed','round_four_skipped','winner_declared')),
  round_number integer check(round_number between 1 and 4),
  subject_team_id uuid references public.teams(id) on delete restrict,
  details jsonb not null default '{}'::jsonb check(pg_catalog.jsonb_typeof(details)='object'),
  created_at timestamptz not null default pg_catalog.now()
);
alter table public.event_operation_audit enable row level security;
revoke all on public.event_operation_audit from public,anon,authenticated;
grant select on public.event_operation_audit to authenticated;
create policy event_operation_audit_organizer_read on public.event_operation_audit
for select to authenticated using(public.is_organizer());
create or replace function private.prevent_event_operation_audit_mutation()
returns trigger language plpgsql set search_path = '' as $$ begin raise exception 'Audit records are append-only'; end $$;
revoke all on function private.prevent_event_operation_audit_mutation() from public,anon,authenticated;
create trigger event_operation_audit_immutable before update or delete on public.event_operation_audit
for each row execute function private.prevent_event_operation_audit_mutation();

create or replace function private.expire_due_rounds(p_event_id uuid,p_round_number integer default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare expired record; expired_count integer:=0;
begin
  for expired in update public.rounds r set status='ended'
    where r.event_id=p_event_id and r.status='running' and r.ends_at<=pg_catalog.now()
      and (p_round_number is null or r.round_number=p_round_number)
    returning r.event_id,r.round_number
  loop
    insert into public.event_operation_audit(event_id,actor_user_id,action,round_number,details)
      values(expired.event_id,null,'round_expired',expired.round_number,'{"source":"server_deadline"}'::jsonb);
    expired_count:=expired_count+1;
  end loop;
  return expired_count;
end $$;
revoke all on function private.expire_due_rounds(uuid,integer) from public,anon,authenticated,service_role;

-- Start with already configured Round 2/3 values. Round 1 marks stay blank until
-- selected by an organizer; no competition values are invented.
insert into public.round_challenge_marks(event_id,round_number,challenge_key,maximum_marks)
select event_id,2,'slot:'||slot,maximum_marks from public.round2_challenge_definitions on conflict do nothing;
insert into public.round_challenge_marks(event_id,round_number,challenge_key,maximum_marks)
select event_id,3,'slot:'||slot,maximum_marks from public.round3_challenge_definitions where maximum_marks is not null on conflict do nothing;

create or replace function private.audit_round_mark_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  insert into public.event_operation_audit(event_id,actor_user_id,action,round_number,details)
    values(new.event_id,auth.uid(),'challenge_marks_changed',new.round_number,
      jsonb_build_object('challenge_key',new.challenge_key,'maximum_marks',new.maximum_marks,
        'previous_maximum_marks',case when tg_op='UPDATE' then old.maximum_marks else null end));
  return new;
end $$;
revoke all on function private.audit_round_mark_change() from public,anon,authenticated;
create trigger audit_round_mark_change after insert or update on public.round_challenge_marks
for each row execute function private.audit_round_mark_change();

create or replace function private.guard_round_marks()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if exists(select 1 from public.rounds r where r.event_id=new.event_id and r.round_number=new.round_number and r.status not in ('draft','locked','ready')) then raise exception 'Marks are frozen after round activation'; end if;
  return new;
end $$;
revoke all on function private.guard_round_marks() from public,anon,authenticated;
create trigger guard_round_marks before insert or update on public.round_challenge_marks
for each row execute function private.guard_round_marks();

create or replace function private.sync_round2_marks()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.maximum_marks is distinct from old.maximum_marks then
    insert into public.round_challenge_marks(event_id,round_number,challenge_key,maximum_marks,configured_by)
    values(new.event_id,2,'slot:'||new.slot,new.maximum_marks,auth.uid())
    on conflict(event_id,round_number,challenge_key) do update set maximum_marks=excluded.maximum_marks,configured_by=excluded.configured_by,updated_at=pg_catalog.now()
      where public.round_challenge_marks.maximum_marks is distinct from excluded.maximum_marks;
  end if;
  return new;
end $$;
revoke all on function private.sync_round2_marks() from public,anon,authenticated;
create trigger sync_round2_marks after update of maximum_marks on public.round2_challenge_definitions
for each row execute function private.sync_round2_marks();

create or replace function private.sync_round3_marks()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.maximum_marks is distinct from old.maximum_marks and new.maximum_marks is not null then
    insert into public.round_challenge_marks(event_id,round_number,challenge_key,maximum_marks,configured_by)
    values(new.event_id,3,'slot:'||new.slot,new.maximum_marks,auth.uid())
    on conflict(event_id,round_number,challenge_key) do update set maximum_marks=excluded.maximum_marks,configured_by=excluded.configured_by,updated_at=pg_catalog.now()
      where public.round_challenge_marks.maximum_marks is distinct from excluded.maximum_marks;
  end if;
  return new;
end $$;
revoke all on function private.sync_round3_marks() from public,anon,authenticated;
create trigger sync_round3_marks after update of maximum_marks on public.round3_challenge_definitions
for each row execute function private.sync_round3_marks();

-- Any participant write which changes progress, completion, hints or rewards is
-- accepted only while that team's event round is running and before its deadline.
create or replace function private.require_live_round_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_team uuid; v_event uuid; v_round integer; v_status text; v_ends timestamptz;
begin
  v_round:=case when tg_table_name in ('team_sudoku_progress','team_round1_evidence_unlocks') then 1
    when tg_table_name in ('team_round2_progress','team_round2_evidence_unlocks','team_round2_phrase_progress') then 2 else 3 end;
  v_team:=coalesce((to_jsonb(new)->>'team_id')::uuid,(to_jsonb(old)->>'team_id')::uuid);
  select t.event_id into v_event from public.teams t where t.id=v_team and t.status in ('approved','active');
  if v_event is null then raise exception 'Eligible team required' using errcode='42501'; end if;
  if tg_table_name like 'team_round2_%' and (to_jsonb(new)->>'event_id')::uuid is distinct from v_event then raise exception 'Team event mismatch' using errcode='42501'; end if;
  if tg_table_name like 'team_round3_%' and (to_jsonb(new)->>'event_id')::uuid is distinct from v_event then raise exception 'Team event mismatch' using errcode='42501'; end if;
  select r.status,r.ends_at into v_status,v_ends from public.rounds r where r.event_id=v_event and r.round_number=v_round;
  if v_status is distinct from 'running' or v_ends is null or v_ends<=pg_catalog.now() then
    raise exception 'Round is not accepting gameplay changes' using errcode='42501';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function private.require_live_round_write() from public,anon,authenticated;
do $$
declare table_name text;
begin
  foreach table_name in array array['team_sudoku_progress','team_round1_evidence_unlocks','team_round2_progress','team_round2_evidence_unlocks','team_round2_phrase_progress','team_round3_progress','team_round3_evidence_unlocks','team_round3_final_progress'] loop
    execute pg_catalog.format('drop trigger if exists enforce_live_round_write on public.%I',table_name);
    execute pg_catalog.format('create trigger enforce_live_round_write before insert or update or delete on public.%I for each row execute function private.require_live_round_write()',table_name);
  end loop;
  execute 'drop trigger if exists enforce_live_round_write on private.team_round3_hint_usage';
  execute 'create trigger enforce_live_round_write before insert or update or delete on private.team_round3_hint_usage for each row execute function private.require_live_round_write()';
end $$;

-- Invalid answers may perform no writes, so submission RPCs also check the
-- server deadline before any answer validation or reward logic is reached.
create or replace function private.assert_live_round(p_team_id uuid,p_event_id uuid,p_round_number integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_status text; v_ends timestamptz;
begin
  if auth.uid() is null or not exists(select 1 from public.teams t where t.id=p_team_id and t.event_id=p_event_id and t.auth_user_id=auth.uid() and t.status in ('approved','active')) then
    raise exception 'Eligible team required' using errcode='42501';
  end if;
  select r.status,r.ends_at into v_status,v_ends from public.rounds r where r.event_id=p_event_id and r.round_number=p_round_number for update;
  if v_status is distinct from 'running' or v_ends is null or v_ends<=pg_catalog.now() then
    raise exception 'Round is not accepting gameplay submissions' using errcode='42501';
  end if;
end $$;
revoke all on function private.assert_live_round(uuid,uuid,integer) from public,anon,authenticated,service_role;

alter function public.complete_round1_sudoku(text) rename to complete_round1_sudoku_unchecked;
revoke all on function public.complete_round1_sudoku_unchecked(text) from public,anon,authenticated,service_role;
create function public.complete_round1_sudoku(p_puzzle_type text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_team uuid; v_event uuid;
begin
  select t.id,t.event_id into v_team,v_event from public.teams t where t.auth_user_id=auth.uid();
  perform private.assert_live_round(v_team,v_event,1);
  return public.complete_round1_sudoku_unchecked(p_puzzle_type);
end $$;
revoke all on function public.complete_round1_sudoku(text) from public,anon;
grant execute on function public.complete_round1_sudoku(text) to authenticated;

alter function public.submit_round2_challenge(smallint,text) rename to submit_round2_challenge_unchecked;
revoke all on function public.submit_round2_challenge_unchecked(smallint,text) from public,anon,authenticated,service_role;
create function public.submit_round2_challenge(p_slot smallint,p_password text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_team uuid; v_event uuid;
begin
  select t.id,t.event_id into v_team,v_event from public.teams t where t.auth_user_id=auth.uid();
  perform private.assert_live_round(v_team,v_event,2);
  return public.submit_round2_challenge_unchecked(p_slot,p_password);
end $$;
revoke all on function public.submit_round2_challenge(smallint,text) from public,anon;
grant execute on function public.submit_round2_challenge(smallint,text) to authenticated;

alter function public.submit_round2_final_phrase(text) rename to submit_round2_final_phrase_unchecked;
revoke all on function public.submit_round2_final_phrase_unchecked(text) from public,anon,authenticated,service_role;
create function public.submit_round2_final_phrase(p_phrase text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_team uuid; v_event uuid;
begin
  select t.id,t.event_id into v_team,v_event from public.teams t where t.auth_user_id=auth.uid();
  perform private.assert_live_round(v_team,v_event,2);
  return public.submit_round2_final_phrase_unchecked(p_phrase);
end $$;
revoke all on function public.submit_round2_final_phrase(text) from public,anon;
grant execute on function public.submit_round2_final_phrase(text) to authenticated;

alter function public.submit_round3_challenge(smallint,text,text,text) rename to submit_round3_challenge_unchecked;
revoke all on function public.submit_round3_challenge_unchecked(smallint,text,text,text) from public,anon,authenticated,service_role;
create function public.submit_round3_challenge(p_slot smallint,p_key text,p_plaintext text,p_answer_format text default 'text')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_team uuid; v_event uuid;
begin
  select t.id,t.event_id into v_team,v_event from public.teams t where t.auth_user_id=auth.uid();
  perform private.assert_live_round(v_team,v_event,3);
  return public.submit_round3_challenge_unchecked(p_slot,p_key,p_plaintext,p_answer_format);
end $$;
revoke all on function public.submit_round3_challenge(smallint,text,text,text) from public,anon;
grant execute on function public.submit_round3_challenge(smallint,text,text,text) to authenticated;

alter function public.request_round3_hint(smallint,smallint) rename to request_round3_hint_unchecked;
revoke all on function public.request_round3_hint_unchecked(smallint,smallint) from public,anon,authenticated,service_role;
create function public.request_round3_hint(p_slot smallint,p_hint_index smallint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_team uuid; v_event uuid;
begin
  select t.id,t.event_id into v_team,v_event from public.teams t where t.auth_user_id=auth.uid();
  perform private.assert_live_round(v_team,v_event,3);
  return public.request_round3_hint_unchecked(p_slot,p_hint_index);
end $$;
revoke all on function public.request_round3_hint(smallint,smallint) from public,anon;
grant execute on function public.request_round3_hint(smallint,smallint) to authenticated;

alter function public.submit_round3_final_code(text) rename to submit_round3_final_code_unchecked;
revoke all on function public.submit_round3_final_code_unchecked(text) from public,anon,authenticated,service_role;
create function public.submit_round3_final_code(p_code text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_team uuid; v_event uuid;
begin
  select t.id,t.event_id into v_team,v_event from public.teams t where t.auth_user_id=auth.uid();
  perform private.assert_live_round(v_team,v_event,3);
  return public.submit_round3_final_code_unchecked(p_code);
end $$;
revoke all on function public.submit_round3_final_code(text) from public,anon;
grant execute on function public.submit_round3_final_code(text) to authenticated;

create or replace function public.organizer_set_round_duration(p_event_id uuid,p_round_number integer,p_duration_minutes integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_status text;
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if p_duration_minutes not between 1 and 240 then raise exception 'Duration must be between 1 and 240 minutes'; end if;
  select status into v_status from public.rounds where event_id=p_event_id and round_number=p_round_number for update;
  if not found or v_status not in ('draft','locked','ready') then raise exception 'Duration is frozen after round activation'; end if;
  update public.rounds set duration_minutes=p_duration_minutes where event_id=p_event_id and round_number=p_round_number;
  insert into public.event_operation_audit(event_id,actor_user_id,action,round_number,details) values(p_event_id,auth.uid(),'round_duration_changed',p_round_number,jsonb_build_object('duration_minutes',p_duration_minutes));
end $$;
revoke all on function public.organizer_set_round_duration(uuid,integer,integer) from public,anon;
grant execute on function public.organizer_set_round_duration(uuid,integer,integer) to authenticated;

create or replace function public.organizer_control_round(p_event_id uuid,p_round_number integer,p_action text,p_extend_minutes integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.rounds%rowtype; now_at timestamptz:=pg_catalog.now();
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if p_round_number not between 1 and 4 or p_action not in ('authorize','start','pause','resume','extend','end','skip_round_4') then raise exception 'Invalid round operation'; end if;
  if exists(select 1 from public.events e where e.id=p_event_id and e.status in ('completed','cancelled')) then raise exception 'Event is closed'; end if;
  perform private.expire_due_rounds(p_event_id);
  select * into r from public.rounds where event_id=p_event_id and round_number=p_round_number for update;
  if not found then raise exception 'Round not found'; end if;
  if p_action='authorize' then
    if r.status not in ('locked','draft') then raise exception 'Round cannot be authorized from its current state'; end if;
    if p_round_number=4 and ((select count(*) from public.event_qualifications q where q.event_id=p_event_id)<>6 or not exists(select 1 from public.rounds x where x.event_id=p_event_id and x.round_number=3 and x.status='ended')) then raise exception 'Confirm six finalists after Round 3'; end if;
    update public.rounds set status='ready' where id=r.id;
    insert into public.event_operation_audit(event_id,actor_user_id,action,round_number) values(p_event_id,auth.uid(),'round_authorized',p_round_number);
  elsif p_action='start' then
    if p_round_number=4 then raise exception 'Round 4 gameplay is outside this milestone'; end if;
    if r.status<>'ready' then raise exception 'Only an authorized round can start'; end if;
    if exists(select 1 from public.rounds x where x.event_id=p_event_id and x.status in ('running','paused')) then raise exception 'Another round is already active'; end if;
    if p_round_number=2 and not exists(select 1 from public.rounds x where x.event_id=p_event_id and x.round_number=1 and x.status='ended') then raise exception 'End Round 1 before activating Round 2'; end if;
    if p_round_number=3 and (select count(*) from public.rounds x where x.event_id=p_event_id and x.round_number in (1,2) and x.status='ended')<>2 then raise exception 'End Rounds 1 and 2 before activating Round 3'; end if;
    if p_round_number=1 and (select count(*) from private.sudoku_puzzle_definitions)<>6 then raise exception 'Round 1 content is incomplete'; end if;
    if p_round_number=2 and (select count(*) from public.round2_challenge_definitions d where d.event_id=p_event_id)<>6 then raise exception 'Round 2 content is incomplete'; end if;
    if p_round_number=3 and ((select count(*) from public.round3_challenge_definitions d where d.event_id=p_event_id)<>3 or not exists(select 1 from public.round3_question_sets q where q.event_id=p_event_id and q.published_at is not null)) then raise exception 'Round 3 content is not published'; end if;
    if p_round_number<=3 and (select count(*) from public.round_challenge_marks m where m.event_id=p_event_id and m.round_number=p_round_number)<>(case p_round_number when 1 then 6 when 2 then 6 else 3 end) then raise exception 'Configure all challenge marks before starting'; end if;
    if p_round_number=2 then update public.round2_challenge_definitions d set maximum_marks=m.maximum_marks from public.round_challenge_marks m where d.event_id=p_event_id and m.event_id=p_event_id and m.round_number=2 and m.challenge_key='slot:'||d.slot;
    elsif p_round_number=3 then update public.round3_challenge_definitions d set maximum_marks=m.maximum_marks from public.round_challenge_marks m where d.event_id=p_event_id and m.event_id=p_event_id and m.round_number=3 and m.challenge_key='slot:'||d.slot; end if;
    update public.rounds set status='running',starts_at=now_at,ends_at=now_at+pg_catalog.make_interval(mins=>r.duration_minutes),paused_at=null,paused_remaining_seconds=null where id=r.id;
    update public.events set status='active' where id=p_event_id and status<>'completed';
    update public.teams set status='active' where event_id=p_event_id and status='approved';
    insert into public.event_operation_audit(event_id,actor_user_id,action,round_number,details) values(p_event_id,auth.uid(),'round_started',p_round_number,jsonb_build_object('duration_minutes',r.duration_minutes));
  elsif p_action='pause' then
    if r.status<>'running' or r.ends_at<=now_at then raise exception 'Round is not running'; end if;
    update public.rounds set status='paused',paused_at=now_at,paused_remaining_seconds=greatest(0,pg_catalog.ceil(extract(epoch from(ends_at-now_at)))::integer) where id=r.id;
    insert into public.event_operation_audit(event_id,actor_user_id,action,round_number) values(p_event_id,auth.uid(),'round_paused',p_round_number);
  elsif p_action='resume' then
    if r.status<>'paused' or coalesce(r.paused_remaining_seconds,0)<=0 then raise exception 'No paused time remains'; end if;
    update public.rounds set status='running',ends_at=now_at+pg_catalog.make_interval(secs=>r.paused_remaining_seconds),paused_at=null,paused_remaining_seconds=null where id=r.id;
    insert into public.event_operation_audit(event_id,actor_user_id,action,round_number) values(p_event_id,auth.uid(),'round_resumed',p_round_number);
  elsif p_action='extend' then
    if p_extend_minutes not between 1 and 120 or r.status not in ('running','paused') or (r.status='running' and r.ends_at<=now_at) then raise exception 'Invalid timer extension'; end if;
    if r.status='running' then update public.rounds set ends_at=ends_at+pg_catalog.make_interval(mins=>p_extend_minutes) where id=r.id;
    else update public.rounds set paused_remaining_seconds=paused_remaining_seconds+p_extend_minutes*60 where id=r.id; end if;
    insert into public.event_operation_audit(event_id,actor_user_id,action,round_number,details) values(p_event_id,auth.uid(),'round_extended',p_round_number,jsonb_build_object('minutes',p_extend_minutes));
  elsif p_action='end' then
    if r.status not in ('running','paused') then raise exception 'Round is not active'; end if;
    update public.rounds set status='ended',paused_at=null,paused_remaining_seconds=null,ends_at=case when r.status='running' then now_at else r.ends_at end where id=r.id;
    insert into public.event_operation_audit(event_id,actor_user_id,action,round_number) values(p_event_id,auth.uid(),'round_ended',p_round_number);
  elsif p_action='skip_round_4' then
    if p_round_number<>4 or r.status not in ('locked','ready') or not exists(select 1 from public.rounds where event_id=p_event_id and round_number=3 and status='ended') then raise exception 'Round 4 can be skipped after Round 3'; end if;
    if (select count(*) from public.event_qualifications q where q.event_id=p_event_id)<>6 then raise exception 'Confirm six finalists first'; end if;
    update public.rounds set status='ended' where id=r.id;
    insert into public.event_operation_audit(event_id,actor_user_id,action,round_number) values(p_event_id,auth.uid(),'round_four_skipped',4);
  end if;
  select * into r from public.rounds where id=r.id;
  return jsonb_build_object('round_number',r.round_number,'status',r.status,'duration_minutes',r.duration_minutes,'starts_at',r.starts_at,'ends_at',r.ends_at,'paused_at',r.paused_at,'remaining_seconds',case when r.status='paused' then r.paused_remaining_seconds when r.status='running' then greatest(0,pg_catalog.ceil(extract(epoch from(r.ends_at-pg_catalog.now())))::integer) else 0 end);
end $$;
revoke all on function public.organizer_control_round(uuid,integer,text,integer) from public,anon;
grant execute on function public.organizer_control_round(uuid,integer,text,integer) to authenticated;

create or replace function public.organizer_set_challenge_marks(p_event_id uuid,p_round_number integer,p_challenge_key text,p_maximum_marks numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare v_status text;
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if p_maximum_marks is null or p_maximum_marks<0 or p_maximum_marks>100000 or (p_round_number=2 and p_maximum_marks=0) then raise exception 'Marks must satisfy the challenge configuration'; end if;
  select status into v_status from public.rounds where event_id=p_event_id and round_number=p_round_number for update;
  if not found or v_status not in ('draft','locked','ready') then raise exception 'Marks are frozen after round activation'; end if;
  if p_round_number=1 and p_challenge_key not in ('classic','jigsaw','windoku','anti_knight','anti_king','diagonal') then raise exception 'Unknown Round 1 puzzle'; end if;
  if p_round_number in (2,3) and p_challenge_key !~ '^slot:[1-6]$' then raise exception 'Unknown challenge slot'; end if;
  if (p_round_number=1 and not exists(select 1 from private.sudoku_puzzle_definitions where puzzle_type=p_challenge_key))
    or (p_round_number=2 and not exists(select 1 from public.round2_challenge_definitions where event_id=p_event_id and 'slot:'||slot=p_challenge_key))
    or (p_round_number=3 and not exists(select 1 from public.round3_challenge_definitions where event_id=p_event_id and 'slot:'||slot=p_challenge_key)) then raise exception 'Challenge configuration not found'; end if;
  insert into public.round_challenge_marks(event_id,round_number,challenge_key,maximum_marks,configured_by)
  values(p_event_id,p_round_number,p_challenge_key,p_maximum_marks,auth.uid())
  on conflict(event_id,round_number,challenge_key) do update set maximum_marks=excluded.maximum_marks,configured_by=excluded.configured_by,updated_at=pg_catalog.now();
  if p_round_number=2 then update public.round2_challenge_definitions set maximum_marks=p_maximum_marks where event_id=p_event_id and 'slot:'||slot=p_challenge_key;
  elsif p_round_number=3 then update public.round3_challenge_definitions set maximum_marks=p_maximum_marks where event_id=p_event_id and 'slot:'||slot=p_challenge_key; end if;
end $$;
revoke all on function public.organizer_set_challenge_marks(uuid,integer,text,numeric) from public,anon;
grant execute on function public.organizer_set_challenge_marks(uuid,integer,text,numeric) to authenticated;

create or replace function public.organizer_set_team_status(p_team_id uuid,p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.teams%rowtype;
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if p_status not in ('approved','active','suspended','disqualified') then raise exception 'Invalid team status'; end if;
  update public.teams set status=p_status where id=p_team_id returning * into t;
  if not found then raise exception 'Team not found'; end if;
  insert into public.event_operation_audit(event_id,actor_user_id,action,subject_team_id,details)
  values(t.event_id,auth.uid(),'team_status_changed',t.id,jsonb_build_object('status',p_status));
end $$;
revoke all on function public.organizer_set_team_status(uuid,text) from public,anon;
grant execute on function public.organizer_set_team_status(uuid,text) to authenticated;

-- Team provisioning remains on the existing organizer-authorized Edge Function;
-- participant names are added in the same database transaction as the team.
create or replace function public.provision_team_record_with_members(
  p_event_id uuid,p_team_code text,p_team_name text,p_auth_user_id uuid,
  p_access_code_hash text,p_actor_user_id uuid,p_members jsonb
)
returns table(id uuid,team_code text,team_name text,status text)
language plpgsql security definer set search_path = '' as $$
declare created public.teams%rowtype; item jsonb; member_name text; member_email text;
begin
  if not exists(select 1 from public.organizer_roles r where r.user_id=p_actor_user_id and r.role='organizer') then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if pg_catalog.jsonb_typeof(p_members)<>'array' or pg_catalog.jsonb_array_length(p_members)>2 then raise exception 'Up to two participants may be configured'; end if;
  if not exists(select 1 from public.events e where e.id=p_event_id and e.status in ('draft','published','active')) then raise exception 'Event is not accepting team registration'; end if;
  insert into public.teams(event_id,team_code,team_name,status,auth_user_id,access_code_hash)
    values(p_event_id,btrim(p_team_code),btrim(p_team_name),'approved',p_auth_user_id,p_access_code_hash) returning * into created;
  for item in select value from pg_catalog.jsonb_array_elements(p_members) loop
    member_name:=btrim(coalesce(item->>'participant_name',''));
    member_email:=nullif(lower(btrim(coalesce(item->>'participant_email',''))),'');
    if member_name='' or char_length(member_name)>200 then raise exception 'Participant name is invalid'; end if;
    if member_email is not null and (char_length(member_email)>320 or member_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then raise exception 'Participant email is invalid'; end if;
    insert into public.team_members(team_id,participant_name,participant_email) values(created.id,member_name,member_email);
  end loop;
  insert into public.team_audit_logs(team_id,actor_user_id,action,metadata)
    values(created.id,p_actor_user_id,'team_provisioned','{"source":"organizer_dashboard"}'::jsonb);
  return query select created.id,created.team_code,created.team_name,created.status;
end $$;
revoke all on function public.provision_team_record_with_members(uuid,text,text,uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.provision_team_record_with_members(uuid,text,text,uuid,text,uuid,jsonb) to service_role;

create or replace function public.reset_team_access_code_record(p_team_id uuid,p_access_code_hash text,p_actor_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.teams%rowtype;
begin
  if not exists(select 1 from public.organizer_roles r where r.user_id=p_actor_user_id and r.role='organizer') then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if p_access_code_hash !~ '^\$2[aby]\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$' then raise exception 'A supported access-code hash is required'; end if;
  update public.teams set access_code_hash=p_access_code_hash where id=p_team_id returning * into t;
  if not found then raise exception 'Team not found'; end if;
  insert into public.team_audit_logs(team_id,actor_user_id,action,metadata)
    values(t.id,p_actor_user_id,'access_code_reset','{"source":"organizer_dashboard"}'::jsonb);
end $$;
revoke all on function public.reset_team_access_code_record(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.reset_team_access_code_record(uuid,text,uuid) to service_role;

create or replace function public.get_organizer_event_snapshot(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  perform private.expire_due_rounds(p_event_id);
  select jsonb_build_object(
    'event',to_jsonb(e),
    'rounds',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',r.id,'event_id',r.event_id,'round_number',r.round_number,'round_name',r.round_name,
      'duration_minutes',r.duration_minutes,'status',r.status,'display_order',r.display_order,
      'starts_at',r.starts_at,'ends_at',r.ends_at,'paused_at',r.paused_at,
      'remaining_seconds',case when r.status='paused' then r.paused_remaining_seconds when r.status='running' then greatest(0,pg_catalog.ceil(extract(epoch from(r.ends_at-pg_catalog.now())))::integer) else 0 end
    ) order by r.round_number),'[]'::jsonb) from public.rounds r where r.event_id=e.id),
    'team_counts',jsonb_build_object(
      'registered',(select count(*) from public.teams t where t.event_id=e.id and t.status in ('pending','approved','active','suspended','disqualified')),
      'active',(select count(*) from public.teams t where t.event_id=e.id and t.status='active'),
      'eligible',(select count(*) from public.teams t where t.event_id=e.id and t.status in ('approved','active'))
    ),
    'marks',(select coalesce(jsonb_agg(to_jsonb(m) order by m.round_number,m.challenge_key),'[]'::jsonb) from public.round_challenge_marks m where m.event_id=e.id),
    'published_rounds',(select coalesce(jsonb_agg(p.round_number order by p.round_number),'[]'::jsonb) from public.round_leaderboard_publications p where p.event_id=e.id),
    'team_progress',(select coalesce(jsonb_agg(jsonb_build_object('team_id',t.id,
      'round1',(select count(*) from public.team_sudoku_progress p where p.team_id=t.id and p.status='completed'),
      'round2',(select count(*) from public.team_round2_progress p where p.team_id=t.id and p.status='completed'),
      'round3',(select count(*) from public.team_round3_progress p where p.team_id=t.id and p.status='completed')
    ) order by t.team_name),'[]'::jsonb) from public.teams t where t.event_id=e.id),
    'qualifications',(select coalesce(jsonb_agg(jsonb_build_object('team_id',q.team_id,'rank',q.selection_order,'team_name',t.team_name) order by q.selection_order),'[]'::jsonb) from public.event_qualifications q join public.teams t on t.id=q.team_id where q.event_id=e.id),
    'result',(select to_jsonb(x) from public.event_results x where x.event_id=e.id)
  ) into result from public.events e where e.id=p_event_id;
  if result is null then raise exception 'Event not found'; end if;
  return result;
end $$;
revoke all on function public.get_organizer_event_snapshot(uuid) from public,anon;
grant execute on function public.get_organizer_event_snapshot(uuid) to authenticated;

create or replace function public.get_participant_round_timer(p_round_number integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_event uuid; r public.rounds%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select t.event_id into v_event from public.teams t where t.auth_user_id=auth.uid() and t.status in ('approved','active');
  if v_event is null then raise exception 'Eligible team required' using errcode='42501'; end if;
  perform private.expire_due_rounds(v_event,p_round_number);
  select * into r from public.rounds where event_id=v_event and round_number=p_round_number;
  if not found then raise exception 'Round not found'; end if;
  return jsonb_build_object('round_number',r.round_number,'status',r.status,'duration_minutes',r.duration_minutes,'starts_at',r.starts_at,'ends_at',r.ends_at,'remaining_seconds',case when r.status='paused' then r.paused_remaining_seconds when r.status='running' then greatest(0,pg_catalog.ceil(extract(epoch from(r.ends_at-pg_catalog.now())))::integer) else 0 end,'server_now',pg_catalog.now());
end $$;
revoke all on function public.get_participant_round_timer(integer) from public,anon;
grant execute on function public.get_participant_round_timer(integer) to authenticated;

create or replace function public.compute_event_round_scores(p_event_id uuid,p_through_round integer default 3)
returns table(team_id uuid,round_number integer,round_score numeric,cumulative_score numeric,last_scored_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with completed as (
    select t.id team_id,1 round_number,m.maximum_marks earned,coalesce(p.completed_at,p.updated_at) completed_at
    from public.team_sudoku_progress p join public.teams t on t.id=p.team_id
    join public.round_challenge_marks m on m.event_id=t.event_id and m.round_number=1 and m.challenge_key=p.puzzle_type
    where t.event_id=p_event_id and p.status='completed'
    union all
    select t.id,2,m.maximum_marks,p.completed_at
    from public.team_round2_progress p join public.teams t on t.id=p.team_id
    join public.round_challenge_marks m on m.event_id=t.event_id and m.round_number=2 and m.challenge_key='slot:'||p.slot
    where p.event_id=p_event_id and p.status='completed'
    union all
    select t.id,3,greatest(0,m.maximum_marks-coalesce(h.deduction,0)),p.completed_at
    from public.team_round3_progress p join public.teams t on t.id=p.team_id
    join public.round_challenge_marks m on m.event_id=t.event_id and m.round_number=3 and m.challenge_key='slot:'||p.slot
    left join lateral(select sum(u.configured_deduction) deduction from private.team_round3_hint_usage u where u.event_id=p.event_id and u.team_id=p.team_id and u.slot=p.slot) h on true
    where p.event_id=p_event_id and p.status='completed'
  ), per_round as (
    select c.team_id,c.round_number,sum(c.earned)::numeric(10,2) points,max(c.completed_at) last_at from completed c group by c.team_id,c.round_number
  ), eligible as (
    select t.id team_id,r.round_number from public.teams t cross join public.rounds r
    where t.event_id=p_event_id and t.status in ('approved','active','suspended') and r.event_id=p_event_id and r.round_number between 1 and p_through_round
  ), totals as (
    select e.team_id,e.round_number,coalesce(pr.points,0)::numeric(10,2) round_points,
      coalesce((select sum(x.points) from per_round x where x.team_id=e.team_id and x.round_number<=e.round_number),0)::numeric(10,2) total_points,
      (select max(x.last_at) from per_round x where x.team_id=e.team_id and x.round_number<=e.round_number) last_at
    from eligible e left join per_round pr on pr.team_id=e.team_id and pr.round_number=e.round_number
  ) select team_id,round_number,round_points,total_points,last_at from totals
$$;
revoke all on function public.compute_event_round_scores(uuid,integer) from public,anon,authenticated;

create table public.round_leaderboard_publications (
  event_id uuid not null references public.events(id) on delete restrict,
  round_number integer not null check(round_number between 1 and 3),
  published_at timestamptz not null default pg_catalog.now(),
  published_by uuid not null references auth.users(id) on delete restrict,
  primary key(event_id,round_number),
  foreign key(event_id,round_number) references public.rounds(event_id,round_number) on delete restrict
);
create table public.round_leaderboard_entries (
  event_id uuid not null,
  round_number integer not null,
  team_id uuid not null references public.teams(id) on delete restrict,
  round_score numeric(10,2) not null,
  cumulative_score numeric(10,2) not null,
  last_scored_at timestamptz,
  rank integer not null check(rank>0),
  tied boolean not null default false,
  primary key(event_id,round_number,team_id),
  foreign key(event_id,round_number) references public.round_leaderboard_publications(event_id,round_number) on delete restrict
);
alter table public.round_leaderboard_publications enable row level security;
alter table public.round_leaderboard_entries enable row level security;
revoke all on public.round_leaderboard_publications,public.round_leaderboard_entries from public,anon,authenticated;
grant select on public.round_leaderboard_publications,public.round_leaderboard_entries to authenticated;
create policy leaderboard_publications_organizer_read on public.round_leaderboard_publications
for select to authenticated using(public.is_organizer());
create policy leaderboard_publications_team_read on public.round_leaderboard_publications
for select to authenticated using(exists(select 1 from public.teams t where t.id=public.my_team_id() and t.event_id=round_leaderboard_publications.event_id));
create policy leaderboard_entries_organizer_read on public.round_leaderboard_entries
for select to authenticated using(public.is_organizer());
create policy leaderboard_entries_team_read_published on public.round_leaderboard_entries
for select to authenticated using(exists(
  select 1 from public.teams mine
  join public.round_leaderboard_publications p on p.event_id=mine.event_id
  where mine.id=public.my_team_id() and p.event_id=round_leaderboard_entries.event_id
    and p.round_number=round_leaderboard_entries.round_number));

create table public.event_qualifications (
  event_id uuid not null references public.events(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  selection_order integer not null check(selection_order between 1 and 6),
  confirmed_by uuid not null references auth.users(id) on delete restrict,
  confirmed_at timestamptz not null default pg_catalog.now(),
  primary key(event_id,team_id),
  unique(event_id,selection_order)
);
alter table public.event_qualifications enable row level security;
revoke all on public.event_qualifications from public,anon,authenticated;
grant select on public.event_qualifications to authenticated;
create policy qualifications_organizer_read on public.event_qualifications
for select to authenticated using(public.is_organizer());
create policy qualifications_team_read on public.event_qualifications
for select to authenticated using(team_id=public.my_team_id());

create table public.event_results (
  event_id uuid primary key references public.events(id) on delete restrict,
  round_four_skipped boolean not null,
  winner_team_id uuid not null references public.teams(id) on delete restrict,
  resolution_note text not null default '' check(char_length(resolution_note)<=2000),
  declared_by uuid not null references auth.users(id) on delete restrict,
  declared_at timestamptz not null default pg_catalog.now()
);
alter table public.event_results enable row level security;
revoke all on public.event_results from public,anon,authenticated;
grant select on public.event_results to authenticated;
create policy event_results_organizer_read on public.event_results
for select to authenticated using(public.is_organizer());

create or replace function public.organizer_preview_leaderboard(p_event_id uuid,p_round_number integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if not exists(select 1 from public.rounds r where r.event_id=p_event_id and r.round_number=p_round_number and r.status='ended') then raise exception 'Preview results only after the round ends'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('team_id',x.team_id,'team_name',t.team_name,'team_code',t.team_code,'round_score',x.round_score,'cumulative_score',x.cumulative_score,'last_scored_at',x.last_scored_at,'rank',x.rank,'tied',x.ties>1) order by x.rank,t.team_name),'[]'::jsonb)
  into result from (select s.*,pg_catalog.rank() over(order by s.cumulative_score desc,s.last_scored_at asc nulls last) rank,
    count(*) over(partition by s.cumulative_score,s.last_scored_at) ties
    from public.compute_event_round_scores(p_event_id,p_round_number) s where s.round_number=p_round_number) x
  join public.teams t on t.id=x.team_id;
  return result;
end $$;
revoke all on function public.organizer_preview_leaderboard(uuid,integer) from public,anon;
grant execute on function public.organizer_preview_leaderboard(uuid,integer) to authenticated;

create or replace function public.organizer_publish_leaderboard(p_event_id uuid,p_round_number integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare published_count integer;
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if p_round_number not between 1 and 3 or not exists(select 1 from public.rounds r where r.event_id=p_event_id and r.round_number=p_round_number and r.status='ended') then raise exception 'Publish only after a preliminary round ends'; end if;
  if exists(select 1 from public.round_leaderboard_publications p where p.event_id=p_event_id and p.round_number=p_round_number) then raise exception 'Leaderboard has already been published'; end if;
  insert into public.round_leaderboard_publications(event_id,round_number,published_by)
    values(p_event_id,p_round_number,auth.uid());
  insert into public.round_leaderboard_entries(event_id,round_number,team_id,round_score,cumulative_score,last_scored_at,rank,tied)
  select p_event_id,p_round_number,x.team_id,x.round_score,x.cumulative_score,x.last_scored_at,x.rank,x.ties>1
  from (select s.*,pg_catalog.rank() over(order by s.cumulative_score desc,s.last_scored_at asc nulls last) rank,
    count(*) over(partition by s.cumulative_score,s.last_scored_at) ties
    from public.compute_event_round_scores(p_event_id,p_round_number) s where s.round_number=p_round_number) x;
  get diagnostics published_count=row_count;
  insert into public.event_operation_audit(event_id,actor_user_id,action,round_number,details)
    values(p_event_id,auth.uid(),'leaderboard_published',p_round_number,jsonb_build_object('team_count',published_count));
  return published_count;
end $$;
revoke all on function public.organizer_publish_leaderboard(uuid,integer) from public,anon;
grant execute on function public.organizer_publish_leaderboard(uuid,integer) to authenticated;

create or replace function public.load_published_leaderboard(p_round_number integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_event uuid; result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select t.event_id into v_event from public.teams t where t.auth_user_id=auth.uid() and t.status in ('approved','active');
  if v_event is null then raise exception 'Eligible team required' using errcode='42501'; end if;
  if not exists(select 1 from public.round_leaderboard_publications p where p.event_id=v_event and p.round_number=p_round_number) then raise exception 'Leaderboard has not been released' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('team_id',x.team_id,'team_name',t.team_name,'round_score',x.round_score,'cumulative_score',x.cumulative_score,'rank',x.rank,'tied',x.tied) order by x.rank,t.team_name),'[]'::jsonb)
  into result from public.round_leaderboard_entries x join public.teams t on t.id=x.team_id where x.event_id=v_event and x.round_number=p_round_number;
  return result;
end $$;
revoke all on function public.load_published_leaderboard(integer) from public,anon;
grant execute on function public.load_published_leaderboard(integer) to authenticated;

create or replace function public.organizer_confirm_finalists(p_event_id uuid,p_team_ids uuid[],p_resolution_note text default '')
returns integer language plpgsql security definer set search_path = '' as $$
declare eligible_ids uuid[]; selected integer;
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if exists(select 1 from public.event_qualifications q where q.event_id=p_event_id) then raise exception 'Finalists have already been confirmed'; end if;
  if pg_catalog.cardinality(p_team_ids)<>6 or (select count(distinct x) from unnest(p_team_ids) x)<>6 then raise exception 'Select six distinct teams'; end if;
  if not exists(select 1 from public.rounds r where r.event_id=p_event_id and r.round_number=3 and r.status='ended') or not exists(select 1 from public.round_leaderboard_publications p where p.event_id=p_event_id and p.round_number=3) then raise exception 'Publish Round 3 results first'; end if;
  select array_agg(team_id) into eligible_ids from (
    select s.team_id,pg_catalog.rank() over(order by s.cumulative_score desc,s.last_scored_at asc nulls last) rank
    from public.compute_event_round_scores(p_event_id,3) s where s.round_number=3
  ) ranked where rank<=6;
  if not p_team_ids <@ coalesce(eligible_ids,array[]::uuid[]) then raise exception 'Selection must come from the tied top-six qualification group'; end if;
  if pg_catalog.cardinality(eligible_ids)>6 and char_length(btrim(coalesce(p_resolution_note,'')))<10 then raise exception 'Record the organizer resolution for the tied qualification cutoff'; end if;
  insert into public.event_qualifications(event_id,team_id,selection_order,confirmed_by)
    select p_event_id,choice,ordinality::integer,auth.uid() from unnest(p_team_ids) with ordinality as chosen(choice,ordinality);
  get diagnostics selected=row_count;
  insert into public.event_operation_audit(event_id,actor_user_id,action,details) values(p_event_id,auth.uid(),'finalists_confirmed',jsonb_build_object('team_count',selected,'resolution_note',left(coalesce(p_resolution_note,''),2000)));
  return selected;
end $$;
revoke all on function public.organizer_confirm_finalists(uuid,uuid[],text) from public,anon;
grant execute on function public.organizer_confirm_finalists(uuid,uuid[],text) to authenticated;

create or replace function public.organizer_skip_round_four(p_event_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if not exists(select 1 from public.rounds where event_id=p_event_id and round_number=3 and status='ended') or not exists(select 1 from public.round_leaderboard_publications where event_id=p_event_id and round_number=3) or (select count(*) from public.event_qualifications where event_id=p_event_id)<>6 then raise exception 'Publish Round 3 and confirm six finalists first'; end if;
  update public.rounds set status='ended' where event_id=p_event_id and round_number=4 and status='locked';
  if not found then raise exception 'Round 4 is not locked'; end if;
  insert into public.event_operation_audit(event_id,actor_user_id,action,round_number) values(p_event_id,auth.uid(),'round_four_skipped',4);
end $$;
revoke all on function public.organizer_skip_round_four(uuid) from public,anon;
grant execute on function public.organizer_skip_round_four(uuid) to authenticated;

create or replace function public.organizer_declare_winner(p_event_id uuid,p_team_id uuid,p_resolution_note text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare top_score numeric; selected_score numeric; top_at timestamptz; selected_at timestamptz; tied_count integer; round4_started boolean;
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if not exists(select 1 from public.rounds where event_id=p_event_id and round_number=4 and status='ended') then raise exception 'End or skip Round 4 before declaring a winner'; end if;
  select starts_at is not null into round4_started from public.rounds where event_id=p_event_id and round_number=4;
  if round4_started then raise exception 'Round 4 result scoring is not implemented in this milestone'; end if;
  if exists(select 1 from public.event_results where event_id=p_event_id) then raise exception 'Event winner has already been declared'; end if;
  if not exists(select 1 from public.event_qualifications where event_id=p_event_id and team_id=p_team_id) then raise exception 'Winner must be a confirmed finalist'; end if;
  select cumulative_score,last_scored_at into top_score,top_at from public.round_leaderboard_entries where event_id=p_event_id and round_number=3 order by cumulative_score desc,last_scored_at asc nulls last limit 1;
  select cumulative_score,last_scored_at into selected_score,selected_at from public.round_leaderboard_entries where event_id=p_event_id and round_number=3 and team_id=p_team_id;
  select count(*) into tied_count from public.round_leaderboard_entries where event_id=p_event_id and round_number=3 and cumulative_score=top_score and last_scored_at is not distinct from top_at;
  if selected_score is distinct from top_score or selected_at is distinct from top_at then raise exception 'Winner must be at the top published rank'; end if;
  if tied_count>1 and char_length(btrim(coalesce(p_resolution_note,'')))<10 then raise exception 'Record the organizer resolution for the tied winner'; end if;
  insert into public.event_results(event_id,round_four_skipped,winner_team_id,resolution_note,declared_by)
    values(p_event_id,true,p_team_id,left(coalesce(p_resolution_note,''),2000),auth.uid());
  update public.events set status='completed' where id=p_event_id;
  insert into public.event_operation_audit(event_id,actor_user_id,action,subject_team_id,details) values(p_event_id,auth.uid(),'winner_declared',p_team_id,jsonb_build_object('resolution_note',left(coalesce(p_resolution_note,''),2000)));
end $$;
revoke all on function public.organizer_declare_winner(uuid,uuid,text) from public,anon;
grant execute on function public.organizer_declare_winner(uuid,uuid,text) to authenticated;

-- Configuration changes go through RPCs; lifecycle state has no client DML path.
revoke insert,update,delete on public.round_challenge_marks from authenticated;
revoke insert,update,delete on public.rounds from authenticated;
revoke update,delete on public.teams from authenticated;
revoke delete on public.events from authenticated;
revoke update(status) on public.events from authenticated;


