-- Competition content hardening and event-scoped victim case files.
-- Draft only: do not apply before project-owner approval.

alter table public.events
  add column is_demo_event boolean not null default false;

-- Preserve the already-created rehearsal event(s) as explicit demo events.
update public.events
set is_demo_event = true
where upper(name) like '%DEMO%'
   or upper(name) like '%TEMPORARY%'
   or upper(name) like '%TEST%'
   or upper(name) like '%REHEARSAL%'
   or status = 'cancelled';

-- Isolate existing test/rehearsal teams without deleting their progress.
update public.teams t set status='suspended'
where t.event_id in (select e.id from public.events e where e.is_demo_event)
  and t.status in ('approved','active');

-- The owner approved the six validated Sudoku definitions for competition use.
-- Solutions remain in the private schema and no puzzle/progress row is replaced.
update private.sudoku_puzzle_definitions
set demo_only = false
where puzzle_type in ('classic','jigsaw','windoku','anti_knight','anti_king','diagonal');

create table private.default_victim_profiles (
  victim_number smallint primary key check (victim_number between 1 and 18),
  challenge_key text not null,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 100),
  photograph_path text not null,
  description text not null check (char_length(btrim(description)) between 1 and 1500),
  investigation_clue text not null check (char_length(btrim(investigation_clue)) between 1 and 1000)
);
revoke all on table private.default_victim_profiles from public, anon, authenticated, service_role;

insert into private.default_victim_profiles values
 (1,'classic','Mara Ellison','default/victim-01.png','A municipal records clerk who maintained the North Quay building permits. Her final ledger contains a page removed with unusual care.','The torn ledger edge carries the same three-notch cut found on later case folders.'),
 (2,'jigsaw','Dev Shah','default/victim-02.png','A night-shift radio technician who logged a brief carrier signal at 9:18 p.m. on the night Mara disappeared.','The signal contains a faint mechanical return stroke, as if recorded beside a typewriter.'),
 (3,'windoku','Lena Ortiz','default/victim-03.png','A restoration photographer hired to document water damage in the sealed North Quay archive.','Every exposure of the locked archive shows a dry strip beneath the eastern door.'),
 (4,'anti_knight','Peter Wren','default/victim-04.png','A courier who delivered sealed evidence envelopes between the archive and the courthouse.','His route log lists one extra stop that is absent from the official street map.'),
 (5,'anti_king','Nadia Sato','default/victim-05.png','A court stenographer who transcribed a hearing about the archive’s missing permit files.','A carbon copy preserves a sentence that was omitted from the certified transcript.'),
 (6,'diagonal','Jonah Price','default/victim-06.png','A locksmith who replaced the North Quay archive cylinder and retained its work order.','The lock was opened with the correct key after the replacement was supposedly sealed.'),
 (7,'slot:1','Iris Bell','default/victim-07.png','A conservator who catalogued a group of records marked for destruction.','The destruction list was typed on a machine with a damaged lowercase e.'),
 (8,'slot:2','Caleb Monroe','default/victim-08.png','A ferry dispatcher who noticed the same unregistered passenger crossing the quay each Thursday.','The passenger always carried a dry folder during the rain.'),
 (9,'slot:3','Asha Raman','default/victim-09.png','A locksmith’s apprentice who copied the archive key schedule into a maintenance notebook.','One key was signed out in ink that matches the blue notation on the radio log.'),
 (10,'slot:4','Elias Voss','default/victim-10.png','A print-room operator who ran the courthouse duplicator after closing.','The duplicate pages show a pressure mark shaped like a narrow crescent.'),
 (11,'slot:5','Ruth Calder','default/victim-11.png','A claims investigator who traced a false fire-insurance amendment to a shell office.','The amendment was witnessed by a person whose initials never appear in payroll.'),
 (12,'slot:6','Mateo Quinn','default/victim-12.png','A night guard who filed a report about a clock stopped at 9:18 in the archive corridor.','The clock stopped before the fire alarm, but the report was filed the next morning.'),
 (13,'slot:1','June Park','default/victim-13.png','A cryptography lecturer who recognized a repeated byte pattern in the radio archive.','The repeated sequence aligns with the three-notch mark on Mara’s missing ledger.'),
 (14,'slot:1','Owen Mercer','default/victim-14.png','A data-recovery specialist who reconstructed a damaged copy of the carrier signal.','The recovered header names a filing cabinet that was removed from the archive.'),
 (15,'slot:2','Sofia Alvarez','default/victim-15.png','A translator who compared two versions of the courthouse transcript.','The translation preserves an acrostic pointing to the eastern records room.'),
 (16,'slot:2','Darius Cole','default/victim-16.png','A conservator who found a second ink layer beneath a routine inventory stamp.','The hidden layer repeats the same crescent pressure mark from the print room.'),
 (17,'slot:3','Mei Tanaka','default/victim-17.png','A forensic accountant who connected the insurance amendment to the archive’s missing permits.','The shell office paid for a replacement typewriter ribbon on the night of the signal.'),
 (18,'slot:3','Samuel Reed','default/victim-18.png','A retired investigator who kept the original dispatch log outside the official case file.','His log links the extra ferry stop, the dry folder and the 9:18 clock.'
);

create table public.victim_profiles (
  event_id uuid not null references public.events(id) on delete restrict,
  victim_number smallint not null check (victim_number between 1 and 18),
  challenge_key text not null,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 100),
  photograph_path text not null check (char_length(photograph_path) between 1 and 300),
  description text not null check (char_length(btrim(description)) between 1 and 1500),
  investigation_clue text not null check (char_length(btrim(investigation_clue)) between 1 and 1000),
  updated_at timestamptz not null default pg_catalog.now(),
  updated_by uuid references auth.users(id) on delete restrict,
  primary key (event_id, victim_number),
  check (
    (victim_number between 1 and 6 and challenge_key in ('classic','jigsaw','windoku','anti_knight','anti_king','diagonal'))
    or (victim_number between 7 and 12 and challenge_key ~ '^slot:[1-6]$')
    or (victim_number between 13 and 18 and challenge_key ~ '^slot:[1-3]$')
  )
);
alter table public.victim_profiles enable row level security;
revoke all on table public.victim_profiles from public, anon, authenticated, service_role;

create or replace function public.can_view_victim_profile(p_event_id uuid,p_victim_number smallint)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    public.is_organizer()
    or exists (
      select 1 from public.teams t where t.auth_user_id=auth.uid() and t.event_id=p_event_id and t.status in ('approved','active')
        and (
          exists(select 1 from public.team_round1_evidence_unlocks u where u.team_id=t.id and u.victim_number=p_victim_number)
          or exists(select 1 from public.team_round2_evidence_unlocks u where u.event_id=t.event_id and u.team_id=t.id and u.victim_number=p_victim_number)
          or exists(select 1 from public.team_round3_evidence_unlocks u where u.event_id=t.event_id and u.team_id=t.id and u.victim_number=p_victim_number)
        )
    )
  )
$$;
revoke all on function public.can_view_victim_profile(uuid,smallint) from public,anon;
grant execute on function public.can_view_victim_profile(uuid,smallint) to authenticated;
create policy victim_profiles_select_unlocked
on public.victim_profiles for select to authenticated
using (public.can_view_victim_profile(event_id,victim_number));
grant select on table public.victim_profiles to authenticated;

create or replace function public.can_read_victim_photo(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.victim_profiles v where v.photograph_path=p_name and public.can_view_victim_profile(v.event_id,v.victim_number))
$$;
revoke all on function public.can_read_victim_photo(text) from public,anon;
grant execute on function public.can_read_victim_photo(text) to authenticated;

create or replace function public.can_edit_victim_photo(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and public.is_organizer() and exists(
    select 1 from public.victim_profiles v join public.rounds r on r.event_id=v.event_id
      and r.round_number=case when v.victim_number<=6 then 1 when v.victim_number<=12 then 2 else 3 end
    where split_part(p_name,'/',1)='custom' and split_part(p_name,'/',2)=v.event_id::text
      and split_part(p_name,'/',3)='victim-'||lpad(v.victim_number::text,2,'0')||'.png'
      and r.status in ('draft','locked','ready')
  )
$$;
revoke all on function public.can_edit_victim_photo(text) from public,anon;
grant execute on function public.can_edit_victim_photo(text) to authenticated;

insert into public.victim_profiles(event_id,victim_number,challenge_key,full_name,photograph_path,description,investigation_clue)
select e.id,v.victim_number,v.challenge_key,v.full_name,v.photograph_path,v.description,v.investigation_clue
from public.events e cross join private.default_victim_profiles v
on conflict (event_id,victim_number) do nothing;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('victim-photos','victim-photos',false,5242880,array['image/png','image/jpeg','image/webp']::text[])
on conflict (id) do nothing;
do $$ begin
  if exists(select 1 from storage.buckets b where b.id='victim-photos' and b.public) then
    raise exception 'The existing victim-photos bucket must remain private';
  end if;
end $$;

create policy victim_photo_read_after_unlock
on storage.objects for select to authenticated
using (bucket_id='victim-photos' and public.can_read_victim_photo(name));

create policy victim_photo_upload_by_organizer
on storage.objects for insert to authenticated
with check (
  bucket_id='victim-photos' and public.can_edit_victim_photo(name)
);
create policy victim_photo_update_by_organizer
on storage.objects for update to authenticated
using (bucket_id='victim-photos' and public.can_edit_victim_photo(name))
with check (bucket_id='victim-photos' and public.can_edit_victim_photo(name));

create or replace function public.load_victim_casefiles()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_team_id uuid; v_event_id uuid; result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select t.id,t.event_id into v_team_id,v_event_id from public.teams t
    where t.auth_user_id=auth.uid() and t.status in ('approved','active');
  if v_team_id is null then raise exception 'Eligible team required' using errcode='42501'; end if;
  select jsonb_agg(jsonb_build_object(
    'victim_number',v.victim_number,'unlocked',u.unlocked,
    'full_name',case when u.unlocked then v.full_name else null end,
    'photograph_path',case when u.unlocked then v.photograph_path else null end,
    'description',case when u.unlocked then v.description else null end,
    'investigation_clue',case when u.unlocked then v.investigation_clue else null end
  ) order by v.victim_number) into result
  from public.victim_profiles v
  cross join lateral (
    select (
      exists(select 1 from public.team_round1_evidence_unlocks e where e.team_id=v_team_id and e.victim_number=v.victim_number)
      or exists(select 1 from public.team_round2_evidence_unlocks e where e.event_id=v_event_id and e.team_id=v_team_id and e.victim_number=v.victim_number)
      or exists(select 1 from public.team_round3_evidence_unlocks e where e.event_id=v_event_id and e.team_id=v_team_id and e.victim_number=v.victim_number)
    ) as unlocked
  ) u where v.event_id=v_event_id;
  return coalesce(result,'[]'::jsonb);
end $$;
revoke all on function public.load_victim_casefiles() from public,anon;
grant execute on function public.load_victim_casefiles() to authenticated;

create or replace function public.organizer_get_victim_profiles(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if not exists(select 1 from public.events where id=p_event_id) then raise exception 'Event not found'; end if;
  return coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('round_status',coalesce(r.status,'locked')) order by v.victim_number)
    from public.victim_profiles v left join public.rounds r on r.event_id=v.event_id
      and r.round_number=case when v.victim_number<=6 then 1 when v.victim_number<=12 then 2 else 3 end
    where v.event_id=p_event_id),'[]'::jsonb);
end $$;
revoke all on function public.organizer_get_victim_profiles(uuid) from public,anon;
grant execute on function public.organizer_get_victim_profiles(uuid) to authenticated;

create or replace function public.organizer_save_victim_profile(
  p_event_id uuid,p_victim_number smallint,p_full_name text,p_photograph_path text,p_description text,p_investigation_clue text
) returns void language plpgsql security definer set search_path = '' as $$
declare round_no smallint; round_state text;
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if p_full_name is null or char_length(btrim(p_full_name)) not between 1 and 100
    or p_description is null or char_length(btrim(p_description)) not between 1 and 1500
    or p_investigation_clue is null or char_length(btrim(p_investigation_clue)) not between 1 and 1000
    or p_photograph_path is null or char_length(p_photograph_path)>300 then raise exception 'Victim profile is incomplete'; end if;
  select case when p_victim_number between 1 and 6 then 1 when p_victim_number between 7 and 12 then 2 when p_victim_number between 13 and 18 then 3 else null end into round_no;
  if round_no is null or not exists(select 1 from public.events where id=p_event_id) then raise exception 'Victim profile not found'; end if;
  select status into round_state from public.rounds where event_id=p_event_id and round_number=round_no for update;
  if round_state is null or round_state not in ('draft','locked','ready') then raise exception 'Victim files are locked after the associated round starts'; end if;
  if p_photograph_path not like 'default/%' and p_photograph_path not like 'custom/'||p_event_id::text||'/%' then raise exception 'Victim photograph path is invalid'; end if;
  update public.victim_profiles set full_name=btrim(p_full_name),photograph_path=p_photograph_path,
    description=btrim(p_description),investigation_clue=btrim(p_investigation_clue),updated_at=pg_catalog.now(),updated_by=auth.uid()
  where event_id=p_event_id and victim_number=p_victim_number;
  if not found then raise exception 'Victim profile not found'; end if;
end $$;
revoke all on function public.organizer_save_victim_profile(uuid,smallint,text,text,text,text) from public,anon;
grant execute on function public.organizer_save_victim_profile(uuid,smallint,text,text,text,text) to authenticated;

create or replace function public.list_competition_events()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'name',e.name,'status',e.status,'event_date',e.event_date)
    order by e.event_date desc nulls last,e.created_at desc)
    from (select id,name,status,event_date,created_at from public.events where not is_demo_event and status<>'cancelled'
      order by event_date desc nulls last,created_at desc limit 1) e),'[]'::jsonb);
end $$;
revoke all on function public.list_competition_events() from public,anon;
grant execute on function public.list_competition_events() to authenticated;

create or replace function public.organizer_create_competition_event(
  p_name text,p_event_date date,p_round2_minutes integer,p_round3_minutes integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_event_id uuid;
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if exists(select 1 from public.events where not is_demo_event and status<>'cancelled') then raise exception 'A competition event is already configured'; end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 200 or p_round2_minutes not between 1 and 240 or p_round3_minutes not between 1 and 240 then
    raise exception 'Event name and round durations are required'; end if;
  insert into public.events(name,event_date,duration_minutes,status,is_demo_event)
    values(btrim(p_name),p_event_date,120,'draft',false) returning id into v_event_id;
  insert into public.rounds(event_id,round_number,round_name,duration_minutes,status,display_order) values
    (v_event_id,1,'DIGITAL LOGIC TRAP',20,'locked',1),
    (v_event_id,2,'PASSWORD BREAKER',p_round2_minutes,'locked',2),
    (v_event_id,3,'THE CRYPTO PROTOCOL',p_round3_minutes,'locked',3),
    (v_event_id,4,'OPERATION: DEADLOCK — OPTIONAL / LOCKED',20,'locked',4);
  insert into public.victim_profiles(event_id,victim_number,challenge_key,full_name,photograph_path,description,investigation_clue)
    select v_event_id,v.victim_number,v.challenge_key,v.full_name,v.photograph_path,v.description,v.investigation_clue
    from private.default_victim_profiles v;
  return v_event_id;
end $$;
revoke all on function public.organizer_create_competition_event(text,date,integer,integer) from public,anon;
grant execute on function public.organizer_create_competition_event(text,date,integer,integer) to authenticated;

create or replace function public.get_round2_organizer_configuration(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb; demo boolean; phrase_exists boolean;
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if not exists(select 1 from public.events where id=p_event_id) then raise exception 'Event configuration was not found'; end if;
  select q.is_demo_only into demo from public.round2_question_sets q where q.event_id=p_event_id;
  select exists(select 1 from private.round2_final_phrase_secrets s where s.event_id=p_event_id) into phrase_exists;
  select jsonb_agg(jsonb_build_object(
    'slot',n.slot,'title',coalesce(d.title,''),'question_text',coalesce(d.question_text,''),
    'puzzle_content',coalesce(d.puzzle_content,''),'built_in_clue',coalesce(d.built_in_clue,''),
    'difficulty',coalesce(d.difficulty,'medium'),'required_round1_victim',d.required_round1_victim,
    'associated_victim',coalesce(d.associated_victim,n.slot+6),'maximum_marks',coalesce(d.maximum_marks,0),
    'solution_explanation',coalesce(s.solution_explanation,''),'hidden_word',coalesce(s.hidden_word,''),
    'answer_configured',s.correct_password_hash is not null
  ) order by n.slot) into result
  from generate_series(1,6) as n(slot)
  left join public.round2_challenge_definitions d on d.event_id=p_event_id and d.slot=n.slot
  left join private.round2_challenge_secrets s on s.event_id=p_event_id and s.slot=n.slot;
  return jsonb_build_object('event_id',p_event_id,'is_demo_only',coalesce(demo,false),
    'phrase_configured',coalesce(phrase_exists,false),'challenges',coalesce(result,'[]'::jsonb));
end $$;
revoke all on function public.get_round2_organizer_configuration(uuid) from public,anon;
grant execute on function public.get_round2_organizer_configuration(uuid) to authenticated;

create or replace function public.get_round3_organizer_configuration(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb; demo boolean; published boolean; started boolean;
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if not exists(select 1 from public.events where id=p_event_id) then raise exception 'Event not found'; end if;
  select coalesce(q.is_demo_only,false),coalesce(q.published_at is not null,false),
    coalesce((select r.status in ('running','paused','ended') from public.rounds r where r.event_id=p_event_id and r.round_number=3),false)
    into demo,published,started from (select 1) seed left join public.round3_question_sets q on q.event_id=p_event_id;
  select jsonb_agg(jsonb_build_object(
    'slot',n.slot,'title',coalesce(d.title,''),'description',coalesce(d.description,''),
    'difficulty',coalesce(d.difficulty,'medium'),'encrypted_content',coalesce(d.encrypted_content,''),
    'known_plaintext',coalesce(d.known_plaintext,'[]'::jsonb),'clue',coalesce(d.clue,''),
    'accepted_formats',coalesce(d.accepted_formats,array['text']::text[]),
    'requires_key',coalesce(d.requires_key,true),'requires_plaintext',coalesce(d.requires_plaintext,true),
    'case_sensitive',coalesce(d.case_sensitive,false),'normalize_whitespace',coalesce(d.normalize_whitespace,true),
    'maximum_marks',d.maximum_marks,'associated_victims',case n.slot when 1 then array[13,14]::smallint[] when 2 then array[15,16]::smallint[] else array[17,18]::smallint[] end,
    'hints',coalesce(s.hints,'[]'::jsonb),'hint_deductions',coalesce(s.hint_deductions,'[]'::jsonb),
    'answer_configured',(s.expected_key is not null or not coalesce(d.requires_key,true)) and (s.expected_plaintext is not null or not coalesce(d.requires_plaintext,true)),
    'demo_only',coalesce(s.demo_only,false),
    'state',case when d.title is not null and d.title<>'' and d.encrypted_content<>'' and d.clue<>''
      and (s.expected_key is not null or not d.requires_key) and (s.expected_plaintext is not null or not d.requires_plaintext) and s.code_fragment<>'' then 'ready' else 'draft' end
  ) order by n.slot) into result from generate_series(1,3) as n(slot)
  left join public.round3_challenge_definitions d on d.event_id=p_event_id and d.slot=n.slot
  left join private.round3_challenge_secrets s on s.event_id=p_event_id and s.slot=n.slot;
  return jsonb_build_object('event_id',p_event_id,'is_demo_only',demo,'published',published,'round_started',started,
    'final_code_configured',exists(select 1 from private.round3_final_secrets f where f.event_id=p_event_id),
    'final_code_demo',coalesce((select f.demo_only from private.round3_final_secrets f where f.event_id=p_event_id),false),
    'challenges',coalesce(result,'[]'::jsonb));
end $$;
revoke all on function public.get_round3_organizer_configuration(uuid) from public,anon;
grant execute on function public.get_round3_organizer_configuration(uuid) to authenticated;

create or replace function public.save_round3_challenge_draft(p_event_id uuid,p_slot smallint,p_configuration jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare round_state text; next_version integer; old_secret private.round3_challenge_secrets%rowtype;
  key_value text; plain_value text; victims smallint[]; configured boolean;
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if p_slot not between 1 and 3 or jsonb_typeof(p_configuration)<>'object' then raise exception 'Invalid challenge draft'; end if;
  if not exists(select 1 from public.events where id=p_event_id) then raise exception 'Event not found'; end if;
  select status into round_state from public.rounds where event_id=p_event_id and round_number=3 for update;
  if round_state in ('running','paused','ended') or exists(select 1 from public.team_round3_progress where event_id=p_event_id) then raise exception 'Round 3 configuration is locked'; end if;
  select * into old_secret from private.round3_challenge_secrets where event_id=p_event_id and slot=p_slot;
  key_value:=coalesce(nullif(p_configuration->>'expected_key',''),old_secret.expected_key);
  plain_value:=coalesce(nullif(p_configuration->>'expected_plaintext',''),old_secret.expected_plaintext);
  victims:=array(select jsonb_array_elements_text(p_configuration->'associated_victims')::smallint);
  if victims is distinct from (case p_slot when 1 then array[13,14]::smallint[] when 2 then array[15,16]::smallint[] else array[17,18]::smallint[] end) then raise exception 'Victim mapping cannot be changed'; end if;
  if char_length(coalesce(p_configuration->>'title',''))>120 or char_length(coalesce(p_configuration->>'encrypted_content',''))>12000 or char_length(coalesce(p_configuration->>'clue',''))>2000 then raise exception 'Challenge field exceeds its limit'; end if;
  configured:=(not coalesce((p_configuration->>'requires_key')::boolean,true) or key_value is not null)
    and (not coalesce((p_configuration->>'requires_plaintext')::boolean,true) or plain_value is not null)
    and coalesce(nullif(p_configuration->>'code_fragment',''),old_secret.code_fragment,'')<>'';
  insert into public.round3_question_sets(event_id,is_demo_only,version,configured_by)
    values(p_event_id,true,1,auth.uid()) on conflict(event_id) do update
    set version=round3_question_sets.version+1,published_at=null,configured_by=auth.uid(),updated_at=pg_catalog.now()
    returning version into next_version;
  insert into public.round3_challenge_definitions(event_id,slot,title,description,difficulty,encrypted_content,known_plaintext,clue,accepted_formats,requires_key,requires_plaintext,case_sensitive,normalize_whitespace,maximum_marks,associated_victims)
    values(p_event_id,p_slot,coalesce(nullif(btrim(p_configuration->>'title'),''),'Challenge '||lpad(p_slot::text,2,'0')),coalesce(p_configuration->>'description',''),coalesce(nullif(p_configuration->>'difficulty',''),'medium'),coalesce(p_configuration->>'encrypted_content',''),coalesce(p_configuration->'known_plaintext','[]'::jsonb),coalesce(p_configuration->>'clue',''),coalesce(array(select jsonb_array_elements_text(p_configuration->'accepted_formats')),array['text']::text[]),coalesce((p_configuration->>'requires_key')::boolean,true),coalesce((p_configuration->>'requires_plaintext')::boolean,true),coalesce((p_configuration->>'case_sensitive')::boolean,false),coalesce((p_configuration->>'normalize_whitespace')::boolean,true),nullif(p_configuration->>'maximum_marks','')::numeric,victims)
    on conflict(event_id,slot) do update set title=excluded.title,description=excluded.description,difficulty=excluded.difficulty,encrypted_content=excluded.encrypted_content,known_plaintext=excluded.known_plaintext,clue=excluded.clue,accepted_formats=excluded.accepted_formats,requires_key=excluded.requires_key,requires_plaintext=excluded.requires_plaintext,case_sensitive=excluded.case_sensitive,normalize_whitespace=excluded.normalize_whitespace,maximum_marks=excluded.maximum_marks,updated_at=pg_catalog.now();
  insert into private.round3_challenge_secrets(event_id,slot,expected_key,expected_plaintext,hints,hint_deductions,code_fragment,demo_only)
    values(p_event_id,p_slot,key_value,plain_value,coalesce(p_configuration->'hints','[]'::jsonb),coalesce(p_configuration->'hint_deductions','[]'::jsonb),coalesce(nullif(p_configuration->>'code_fragment',''),old_secret.code_fragment,''),not configured)
    on conflict(event_id,slot) do update set expected_key=key_value,expected_plaintext=plain_value,hints=coalesce(p_configuration->'hints',round3_challenge_secrets.hints),hint_deductions=coalesce(p_configuration->'hint_deductions',round3_challenge_secrets.hint_deductions),code_fragment=coalesce(nullif(p_configuration->>'code_fragment',''),round3_challenge_secrets.code_fragment,''),demo_only=not configured,updated_at=pg_catalog.now();
  insert into private.round3_configuration_audit(event_id,version,actor_user_id,action) values(p_event_id,next_version,auth.uid(),'draft_saved');
  return next_version;
end $$;
revoke all on function public.save_round3_challenge_draft(uuid,smallint,jsonb) from public,anon;
grant execute on function public.save_round3_challenge_draft(uuid,smallint,jsonb) to authenticated;

alter function public.submit_round2_challenge(smallint,text) rename to submit_round2_challenge_live_base;
revoke all on function public.submit_round2_challenge_live_base(smallint,text) from public,anon,authenticated,service_role;
create or replace function public.submit_round2_challenge(p_slot smallint,p_password text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb; v_team uuid; v_event uuid; explanation text;
begin
  result:=public.submit_round2_challenge_live_base(p_slot,p_password);
  if coalesce((result->>'correct')::boolean,false) then
    select t.id,t.event_id into v_team,v_event from public.teams t where t.auth_user_id=auth.uid();
    select s.solution_explanation into explanation from private.round2_challenge_secrets s where s.event_id=v_event and s.slot=p_slot;
    result:=jsonb_set(result,'{solution_explanation}',to_jsonb(explanation),true);
  end if;
  return result;
end $$;
revoke all on function public.submit_round2_challenge(smallint,text) from public,anon;
grant execute on function public.submit_round2_challenge(smallint,text) to authenticated;

alter function public.load_round2_challenges() rename to load_round2_challenges_legacy;
revoke all on function public.load_round2_challenges_legacy() from public,anon,authenticated,service_role;
create or replace function public.load_round2_challenges()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb; rows jsonb; v_event uuid; v_team uuid;
begin
  result:=public.load_round2_challenges_legacy();
  select t.id,t.event_id into v_team,v_event from public.teams t where t.auth_user_id=auth.uid();
  select jsonb_agg(case when coalesce((c.value->>'completed')::boolean,false) then
    c.value||jsonb_build_object('solution_explanation',s.solution_explanation)
    else c.value end order by c.ordinality) into rows
  from jsonb_array_elements(coalesce(result->'challenges','[]'::jsonb)) with ordinality c(value,ordinality)
  left join private.round2_challenge_secrets s on s.event_id=v_event and s.slot=(c.value->>'slot')::smallint;
  return jsonb_set(result,'{challenges}',coalesce(rows,'[]'::jsonb),true);
end $$;
revoke all on function public.load_round2_challenges() from public,anon;
grant execute on function public.load_round2_challenges() to authenticated;

create or replace function public.guard_competition_round_content()
returns trigger language plpgsql security definer set search_path = '' as $$
declare is_demo boolean;
begin
  if new.status in ('ready','running') and old.status is distinct from new.status then
    select e.is_demo_event into is_demo from public.events e where e.id=new.event_id;
    if not coalesce(is_demo,false) then
      if new.round_number=1 and (select count(*) from private.sudoku_puzzle_definitions where not demo_only)<>6 then
        raise exception 'Round 1 competition puzzles are not validated';
      elsif new.round_number=2 and (
        not exists(select 1 from public.round2_question_sets q where q.event_id=new.event_id and not q.is_demo_only)
        or (select count(*) from public.round2_challenge_definitions d where d.event_id=new.event_id and d.title not ilike 'demo only%' and d.question_text not ilike '%temporary demo%' and d.puzzle_content not ilike '%temporary%placeholder%' and d.built_in_clue not ilike '%temporary demo%')<>6
        or (select count(*) from private.round2_challenge_secrets s where s.event_id=new.event_id and s.correct_password_hash is not null and s.hidden_word not ilike 'demo-%')<>6
        or not exists(select 1 from private.round2_final_phrase_secrets p where p.event_id=new.event_id)
      ) then raise exception 'Round 2 competition questions are incomplete';
      elsif new.round_number=3 and (
        not exists(select 1 from public.round3_question_sets q where q.event_id=new.event_id and not q.is_demo_only and q.published_at is not null)
        or (select count(*) from public.round3_challenge_definitions d join private.round3_challenge_secrets s using(event_id,slot) where d.event_id=new.event_id and d.title not ilike 'demo only%' and d.encrypted_content<>'' and d.clue<>'' and (not d.requires_key or s.expected_key is not null) and (not d.requires_plaintext or s.expected_plaintext is not null) and s.code_fragment<>'')<>3
        or not exists(select 1 from private.round3_final_secrets f where f.event_id=new.event_id and not f.demo_only)
      ) then raise exception 'Round 3 competition questions are incomplete or unpublished';
      end if;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_competition_round_content() from public,anon,authenticated,service_role;
create trigger guard_competition_round_content_before_access
before update of status on public.rounds for each row execute function public.guard_competition_round_content();

-- Each participant can see all 18 numbered positions, but profile data and
-- portrait storage paths are returned only for team-scoped unlocked victims.
