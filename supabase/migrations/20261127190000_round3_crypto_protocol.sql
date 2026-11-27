-- Round 3: THE CRYPTO PROTOCOL. Draft for test-project review; do not apply
-- until project-owner approval. Demo-only seed templates contain no competition content.

create schema if not exists private;

create table public.round3_question_sets (
  event_id uuid primary key references public.events(id) on delete restrict,
  is_demo_only boolean not null default true,
  version integer not null default 1 check (version > 0),
  published_at timestamptz,
  configured_by uuid references auth.users(id) on delete restrict,
  updated_at timestamptz not null default pg_catalog.now()
);

create table public.round3_challenge_definitions (
  event_id uuid not null references public.round3_question_sets(event_id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 4000),
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  encrypted_content text not null default '' check (char_length(encrypted_content) <= 12000),
  known_plaintext jsonb not null default '[]'::jsonb check (pg_catalog.jsonb_typeof(known_plaintext) = 'array'),
  clue text not null default '' check (char_length(clue) <= 2000),
  accepted_formats text[] not null default array['text']::text[] check (accepted_formats <@ array['text','hex','base64','binary','decimal']::text[] and cardinality(accepted_formats) > 0),
  requires_key boolean not null default true,
  requires_plaintext boolean not null default true,
  case_sensitive boolean not null default false,
  normalize_whitespace boolean not null default true,
  maximum_marks numeric(8,2) check (maximum_marks is null or maximum_marks >= 0),
  associated_victims smallint[] not null check (cardinality(associated_victims)=2),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (event_id,slot),
  unique (event_id,associated_victims),
  check ((slot=1 and associated_victims=array[13,14]::smallint[]) or
         (slot=2 and associated_victims=array[15,16]::smallint[]) or
         (slot=3 and associated_victims=array[17,18]::smallint[]))
);

create table private.round3_challenge_secrets (
  event_id uuid not null,
  slot smallint not null,
  expected_key text,
  expected_plaintext text,
  hints jsonb not null default '[]'::jsonb check (pg_catalog.jsonb_typeof(hints)='array'),
  hint_deductions jsonb not null default '[]'::jsonb check (pg_catalog.jsonb_typeof(hint_deductions)='array'),
  code_fragment text not null default '',
  demo_only boolean not null default true,
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (event_id,slot),
  foreign key (event_id,slot) references public.round3_challenge_definitions(event_id,slot) on delete cascade
);

create table private.round3_final_secrets (
  event_id uuid primary key references public.round3_question_sets(event_id) on delete cascade,
  expected_code text not null check (char_length(expected_code) between 1 and 512),
  demo_only boolean not null default false,
  updated_at timestamptz not null default pg_catalog.now()
);

create table private.round3_demo_final_template (
  singleton boolean primary key default true check (singleton),
  expected_code text not null
);
insert into private.round3_demo_final_template(singleton,expected_code) values(true,'ASHES-HIDE-TRUTH');

create table private.round3_demo_templates (
  slot smallint primary key check (slot between 1 and 3),
  title text not null,
  description text not null,
  difficulty text not null,
  encrypted_content text not null,
  known_plaintext jsonb not null,
  clue text not null,
  accepted_formats text[] not null,
  expected_key text not null,
  expected_plaintext text not null,
  hints jsonb not null,
  hint_deductions jsonb not null,
  maximum_marks numeric(8,2),
  code_fragment text not null,
  associated_victims smallint[] not null
);

insert into private.round3_demo_templates values
 (1, 'DEMO ONLY — THE FRACTURED KEY', 'A repeating-key XOR archive contains a known-plaintext fragment. Reconstruct the key and recover the complete message.', 'easy', '1b 06 17 1c 04 02 74 79 7e 64 65 7c 77 6f 17 00 08 0c 1f 68 19 07 11 68 08 0e 07 1c 6d 18 1d 06 0a 61', '["VICTIM 13", "CHECK"]', 'XOR the known plaintext bytes against the ciphertext bytes. The repeating differences expose the key stream.', array['text','hex']::text[], 'MOTH', 'VICTIM 13+14: CHECK THE EAST WING.', '["Look for a short repeating byte sequence.", "Use both known fragments to confirm the repetition."]', '[null,null]', null, 'ASHES', array[13,14]::smallint[]),
 (2, 'DEMO ONLY — THE ENCRYPTION LABYRINTH', 'A message was transformed through several classical operations. Determine the order, reverse each layer, and recover the plaintext.', 'medium', 'Lk5WUlYgQUQgSVZaSkpaViBJSEsgOjYxKzUxIFVUUU9HSU0=', '[]', 'The outermost layer is an encoding. Work from the visible representation inward; reversing the order of operations is essential.', array['text','base64']::text[], 'ARCHIVE', 'VICTIMS 15+16: THE ARCHIVE IS OPEN.', '["Decode the outer representation first.", "At least one transformation preserves punctuation and spacing."]', '[null,null]', null, 'HIDE', array[15,16]::smallint[]),
 (3, 'DEMO ONLY — THE BROKEN TRUST', 'A weak educational RSA example exposes a small public modulus. Recover the factors, compute the totient and private exponent, then decrypt the ciphertext.', 'hard', 'RSA PUBLIC KEY: n = 3233, e = 17\nCIPHERTEXT: 2790', '[]', 'Factor n into two primes, compute φ(n), find the inverse of e modulo φ(n), then use modular exponentiation.', array['text','decimal']::text[], '2753', 'A', '["Check that e and φ(n) are coprime.", "The decrypted numeric value is one ASCII character."]', '[null,null]', null, 'TRUTH', array[17,18]::smallint[]);

create table public.team_round3_progress (
  event_id uuid not null,
  team_id uuid not null references public.teams(id) on delete restrict,
  slot smallint not null check (slot between 1 and 3),
  workspace jsonb not null default '{"scratchpad":"","key":"","plaintext":""}'::jsonb,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  completed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (event_id,team_id,slot),
  foreign key (event_id,slot) references public.round3_challenge_definitions(event_id,slot) on delete restrict,
  check ((status='in_progress' and completed_at is null) or (status='completed' and completed_at is not null))
);

create table private.team_round3_challenge_order (
  event_id uuid not null references public.round3_question_sets(event_id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  slot smallint not null check (slot between 1 and 3),
  display_order smallint not null check (display_order between 1 and 3),
  created_at timestamptz not null default pg_catalog.now(),
  primary key (event_id,team_id,slot),
  unique (event_id,team_id,display_order)
);

create table private.team_round3_hint_usage (
  event_id uuid not null,
  team_id uuid not null references public.teams(id) on delete restrict,
  slot smallint not null,
  hint_index smallint not null check (hint_index > 0),
  configured_deduction numeric(8,2),
  requested_at timestamptz not null default pg_catalog.now(),
  primary key (event_id,team_id,slot,hint_index),
  foreign key (event_id,team_id,slot) references public.team_round3_progress(event_id,team_id,slot) on delete restrict
);

create table public.team_round3_evidence_unlocks (
  event_id uuid not null,
  team_id uuid not null references public.teams(id) on delete restrict,
  slot smallint not null check (slot between 1 and 3),
  victim_number smallint not null check (victim_number between 13 and 18),
  placeholder_only boolean not null default true,
  unlocked_at timestamptz not null default pg_catalog.now(),
  primary key (event_id,team_id,slot,victim_number),
  unique (event_id,team_id,victim_number),
  foreign key (event_id,team_id,slot) references public.team_round3_progress(event_id,team_id,slot) on delete restrict
);

create table public.team_round3_final_progress (
  event_id uuid not null references public.round3_question_sets(event_id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  completed_at timestamptz not null default pg_catalog.now(),
  primary key (event_id,team_id)
);

create table private.round3_configuration_audit (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  version integer not null check (version > 0),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('draft_saved','published')),
  changed_at timestamptz not null default pg_catalog.now()
);

alter table public.round3_question_sets enable row level security;
alter table public.round3_challenge_definitions enable row level security;
alter table public.team_round3_progress enable row level security;
alter table public.team_round3_evidence_unlocks enable row level security;
alter table public.team_round3_final_progress enable row level security;
create policy team_round3_evidence_select_own on public.team_round3_evidence_unlocks for select to authenticated using (team_id=(select public.my_team_id()));
revoke all on table public.round3_question_sets, public.round3_challenge_definitions, public.team_round3_progress, public.team_round3_evidence_unlocks, public.team_round3_final_progress from public,anon,authenticated,service_role;
grant select on table public.team_round3_evidence_unlocks to authenticated;
revoke all on all tables in schema private from public,anon,authenticated,service_role;

create or replace function private.round3_normalize(p_value text, p_case_sensitive boolean, p_normalize_whitespace boolean)
returns text language sql immutable set search_path = '' as $$
  select case when p_case_sensitive then
    case when p_normalize_whitespace then pg_catalog.regexp_replace(btrim(coalesce(p_value,'')), '\s+', ' ', 'g') else coalesce(p_value,'') end
  else pg_catalog.lower(case when p_normalize_whitespace then pg_catalog.regexp_replace(btrim(coalesce(p_value,'')), '\s+', ' ', 'g') else coalesce(p_value,'') end) end
$$;

create or replace function private.round3_decode_answer(p_value text,p_format text)
returns text language plpgsql immutable set search_path = '' as $$
declare compact text; decoded bytea;
begin
  if p_value is null or char_length(p_value)>12000 then return null; end if;
  if p_format='text' then return p_value; end if;
  if p_format='hex' then
    compact:=pg_catalog.regexp_replace(p_value,'[[:space:]]','','g');
    if compact='' or compact !~ '^[[:xdigit:]]+$' or length(compact)%2<>0 then return null; end if;
    decoded:=pg_catalog.decode(compact,'hex');
  elsif p_format='base64' then
    compact:=pg_catalog.regexp_replace(p_value,'[[:space:]]','','g');
    if compact='' or compact !~ '^[A-Za-z0-9+/]*={0,2}$' then return null; end if;
    decoded:=pg_catalog.decode(compact,'base64');
  elsif p_format='binary' then
    if pg_catalog.btrim(p_value)='' or p_value !~ '^[[:space:],01]+$' then return null; end if;
    select pg_catalog.string_agg(pg_catalog.lpad(pg_catalog.to_hex(part::bit(8)::integer),2,'0'),'') into compact
      from pg_catalog.regexp_split_to_table(pg_catalog.btrim(p_value),'[,[:space:]]+') as parts(part);
    if exists(select 1 from pg_catalog.regexp_split_to_table(pg_catalog.btrim(p_value),'[,[:space:]]+') as parts(part) where part !~ '^[01]{8}$') then return null; end if;
    decoded:=pg_catalog.decode(compact,'hex');
  elsif p_format='decimal' then
    if pg_catalog.btrim(p_value)='' or p_value !~ '^[[:space:],[:digit:]]+$' then return null; end if;
    if exists(select 1 from pg_catalog.regexp_split_to_table(pg_catalog.btrim(p_value),'[,[:space:]]+') as parts(part) where part !~ '^[0-9]{1,3}$' or case when part ~ '^[0-9]{1,3}$' then part::integer>255 else false end) then return null; end if;
    select pg_catalog.string_agg(pg_catalog.lpad(pg_catalog.to_hex(part::integer),2,'0'),'') into compact
      from pg_catalog.regexp_split_to_table(pg_catalog.btrim(p_value),'[,[:space:]]+') as parts(part);
    decoded:=pg_catalog.decode(compact,'hex');
  else return null;
  end if;
  return pg_catalog.convert_from(decoded,'UTF8');
exception when others then return null;
end $$;
revoke all on function private.round3_normalize(text,boolean,boolean) from public,anon,authenticated,service_role;
revoke all on function private.round3_decode_answer(text,text) from public,anon,authenticated,service_role;

create or replace function public.get_round3_organizer_configuration(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb; exists_config boolean; demo boolean; published boolean; started boolean;
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if not exists(select 1 from public.events where id=p_event_id) then raise exception 'Event not found'; end if;
  select exists(select 1 from public.round3_question_sets where event_id=p_event_id),
    coalesce((select is_demo_only from public.round3_question_sets where event_id=p_event_id),true),
    coalesce((select published_at is not null from public.round3_question_sets where event_id=p_event_id),false),
    coalesce((select status in ('running','paused','ended') from public.rounds where event_id=p_event_id and round_number=3),false)
  into exists_config,demo,published,started;
  if exists_config then
    select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'slot',d.slot,'title',d.title,'description',d.description,'difficulty',d.difficulty,
      'encrypted_content',d.encrypted_content,'known_plaintext',coalesce(d.known_plaintext,'[]'::jsonb),
      'clue',d.clue,'accepted_formats',d.accepted_formats,'requires_key',d.requires_key,
      'requires_plaintext',d.requires_plaintext,'case_sensitive',d.case_sensitive,
      'normalize_whitespace',d.normalize_whitespace,'maximum_marks',d.maximum_marks,
      'associated_victims',d.associated_victims,'hints',s.hints,'hint_deductions',s.hint_deductions,
      'answer_configured',(s.expected_key is not null or not d.requires_key) and (s.expected_plaintext is not null or not d.requires_plaintext),
      'demo_only',s.demo_only,
      'state',case when d.title like 'DEMO ONLY%' then 'draft' when d.title<>'' and d.encrypted_content<>'' and d.clue<>'' and ((s.expected_key is not null or not d.requires_key) and (s.expected_plaintext is not null or not d.requires_plaintext)) then 'ready' else 'incomplete' end
    ) order by d.slot) into result
    from public.round3_challenge_definitions d join private.round3_challenge_secrets s using(event_id,slot) where d.event_id=p_event_id;
  else
    select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'slot',slot,'title',title,'description',description,'difficulty',difficulty,
      'encrypted_content',encrypted_content,'known_plaintext',known_plaintext,'clue',clue,
      'accepted_formats',accepted_formats,'requires_key',true,'requires_plaintext',true,
      'case_sensitive',false,'normalize_whitespace',true,'maximum_marks',maximum_marks,
      'associated_victims',associated_victims,'hints',hints,'hint_deductions',hint_deductions,
      'answer_configured',true,'state','draft'
    ) order by slot) into result from private.round3_demo_templates;
  end if;
  return pg_catalog.jsonb_build_object('event_id',p_event_id,'is_demo_only',demo,'published',published,'round_started',started,
    'final_code_configured',exists(select 1 from private.round3_final_secrets where event_id=p_event_id) or exists(select 1 from private.round3_demo_final_template where singleton),
    'final_code_demo',coalesce((select demo_only from private.round3_final_secrets where event_id=p_event_id),true),
    'challenges',coalesce(result,'[]'::jsonb));
end $$;
revoke all on function public.get_round3_organizer_configuration(uuid) from public,anon;
grant execute on function public.get_round3_organizer_configuration(uuid) to authenticated;

create or replace function public.save_round3_challenge_draft(p_event_id uuid,p_slot smallint,p_configuration jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare round_state text; next_version integer; old_secret private.round3_challenge_secrets%rowtype; template private.round3_demo_templates%rowtype;
  key_value text; plain_value text; victims smallint[];
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  if p_slot not between 1 and 3 or pg_catalog.jsonb_typeof(p_configuration)<>'object' then raise exception 'Invalid challenge draft'; end if;
  select status into round_state from public.rounds where event_id=p_event_id and round_number=3 for update;
  if round_state in ('running','paused','ended') or exists(select 1 from public.team_round3_progress where event_id=p_event_id) then raise exception 'Round 3 configuration is locked'; end if;
  select * into old_secret from private.round3_challenge_secrets where event_id=p_event_id and slot=p_slot;
  select * into template from private.round3_demo_templates where slot=p_slot;
  key_value:=coalesce(nullif(p_configuration->>'expected_key',''),null);
  plain_value:=coalesce(nullif(p_configuration->>'expected_plaintext',''),null);
  key_value:=coalesce(key_value,old_secret.expected_key,template.expected_key);
  plain_value:=coalesce(plain_value,old_secret.expected_plaintext,template.expected_plaintext);
  victims:=array(select jsonb_array_elements_text(p_configuration->'associated_victims')::smallint);
  if victims is distinct from (case p_slot when 1 then array[13,14]::smallint[] when 2 then array[15,16]::smallint[] else array[17,18]::smallint[] end) then raise exception 'Victim mapping cannot be changed'; end if;
  if char_length(p_configuration->>'title')>120 or char_length(p_configuration->>'encrypted_content')>12000 or char_length(p_configuration->>'clue')>2000 then raise exception 'Challenge field exceeds its limit'; end if;
  insert into public.round3_question_sets(event_id,is_demo_only,version,configured_by)
  values(p_event_id,true,1,auth.uid()) on conflict(event_id) do update set version=round3_question_sets.version+1,published_at=null,configured_by=auth.uid(),updated_at=pg_catalog.now()
  returning version into next_version;
  insert into public.round3_challenge_definitions(event_id,slot,title,description,difficulty,encrypted_content,known_plaintext,clue,accepted_formats,requires_key,requires_plaintext,case_sensitive,normalize_whitespace,maximum_marks,associated_victims)
  values(p_event_id,p_slot,btrim(p_configuration->>'title'),coalesce(p_configuration->>'description',''),p_configuration->>'difficulty',coalesce(p_configuration->>'encrypted_content',''),coalesce(p_configuration->'known_plaintext','[]'::jsonb),coalesce(p_configuration->>'clue',''),array(select jsonb_array_elements_text(p_configuration->'accepted_formats')),coalesce((p_configuration->>'requires_key')::boolean,true),coalesce((p_configuration->>'requires_plaintext')::boolean,true),coalesce((p_configuration->>'case_sensitive')::boolean,false),coalesce((p_configuration->>'normalize_whitespace')::boolean,true),nullif(p_configuration->>'maximum_marks','')::numeric,victims)
  on conflict(event_id,slot) do update set title=excluded.title,description=excluded.description,difficulty=excluded.difficulty,encrypted_content=excluded.encrypted_content,known_plaintext=excluded.known_plaintext,clue=excluded.clue,accepted_formats=excluded.accepted_formats,requires_key=excluded.requires_key,requires_plaintext=excluded.requires_plaintext,case_sensitive=excluded.case_sensitive,normalize_whitespace=excluded.normalize_whitespace,maximum_marks=excluded.maximum_marks,updated_at=pg_catalog.now();
  insert into private.round3_challenge_secrets(event_id,slot,expected_key,expected_plaintext,hints,hint_deductions,code_fragment,demo_only)
  values(p_event_id,p_slot,key_value,plain_value,coalesce(p_configuration->'hints',template.hints),coalesce(p_configuration->'hint_deductions',template.hint_deductions),coalesce(nullif(p_configuration->>'code_fragment',''),old_secret.code_fragment,template.code_fragment),
    case when (not coalesce((p_configuration->>'requires_key')::boolean,true) or nullif(p_configuration->>'expected_key','') is not null)
      and (not coalesce((p_configuration->>'requires_plaintext')::boolean,true) or nullif(p_configuration->>'expected_plaintext','') is not null)
      and nullif(p_configuration->>'code_fragment','') is not null then false else coalesce(old_secret.demo_only,true) end)
  on conflict(event_id,slot) do update set expected_key=coalesce(key_value,round3_challenge_secrets.expected_key),
    expected_plaintext=coalesce(plain_value,round3_challenge_secrets.expected_plaintext),hints=coalesce(p_configuration->'hints',round3_challenge_secrets.hints),hint_deductions=coalesce(p_configuration->'hint_deductions',round3_challenge_secrets.hint_deductions),
    code_fragment=coalesce(nullif(p_configuration->>'code_fragment',''),round3_challenge_secrets.code_fragment),
    demo_only=case when (not coalesce((p_configuration->>'requires_key')::boolean,true) or nullif(p_configuration->>'expected_key','') is not null)
      and (not coalesce((p_configuration->>'requires_plaintext')::boolean,true) or nullif(p_configuration->>'expected_plaintext','') is not null)
      and nullif(p_configuration->>'code_fragment','') is not null then false else round3_challenge_secrets.demo_only end,
    updated_at=pg_catalog.now();
  insert into private.round3_configuration_audit(event_id,version,actor_user_id,action) values(p_event_id,next_version,auth.uid(),'draft_saved');
  return next_version;
end $$;
revoke all on function public.save_round3_challenge_draft(uuid,smallint,jsonb) from public,anon;
grant execute on function public.save_round3_challenge_draft(uuid,smallint,jsonb) to authenticated;

create or replace function public.save_round3_final_code_draft(p_event_id uuid,p_final_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare prior private.round3_final_secrets%rowtype; round_state text;
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  select status into round_state from public.rounds where event_id=p_event_id and round_number=3 for update;
  if round_state in ('running','paused','ended') or exists(select 1 from public.team_round3_progress where event_id=p_event_id) then raise exception 'Round 3 configuration is locked'; end if;
  select * into prior from private.round3_final_secrets where event_id=p_event_id;
  if nullif(p_final_code,'') is null and prior.expected_code is not null then return; end if;
  if nullif(p_final_code,'') is null then return; end if;
  if char_length(p_final_code)>512 then raise exception 'Final code is too long'; end if;
  insert into public.round3_question_sets(event_id,is_demo_only,version,configured_by) values(p_event_id,true,1,auth.uid()) on conflict(event_id) do update set version=round3_question_sets.version+1,published_at=null,configured_by=auth.uid(),updated_at=pg_catalog.now();
  insert into private.round3_final_secrets(event_id,expected_code,demo_only) values(p_event_id,p_final_code,false)
  on conflict(event_id) do update set expected_code=excluded.expected_code,demo_only=false,updated_at=pg_catalog.now();
end $$;
revoke all on function public.save_round3_final_code_draft(uuid,text) from public,anon;
grant execute on function public.save_round3_final_code_draft(uuid,text) to authenticated;

create or replace function public.publish_round3_configuration(p_event_id uuid,p_demo_only boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare round_state text;
begin
  if auth.uid() is null or not public.is_organizer() then raise exception 'Organizer authorization required' using errcode='42501'; end if;
  select status into round_state from public.rounds where event_id=p_event_id and round_number=3 for update;
  if round_state in ('running','paused','ended') or exists(select 1 from public.team_round3_progress where event_id=p_event_id) then raise exception 'Round 3 configuration is locked'; end if;
  if p_demo_only is null or (select count(*) from public.round3_challenge_definitions where event_id=p_event_id)<>3
    or (select count(*) from private.round3_challenge_secrets s join public.round3_challenge_definitions d using(event_id,slot) where s.event_id=p_event_id and (not d.requires_key or s.expected_key is not null) and (not d.requires_plaintext or s.expected_plaintext is not null) and s.code_fragment<>'')<>3
    or (p_demo_only and not exists(select 1 from private.round3_demo_final_template where singleton) and not exists(select 1 from private.round3_final_secrets where event_id=p_event_id))
    or (not p_demo_only and (select count(*) from private.round3_challenge_secrets where event_id=p_event_id and not demo_only)<>3)
    or (not p_demo_only and not exists(select 1 from private.round3_final_secrets where event_id=p_event_id and not demo_only))
    or (not p_demo_only and exists(select 1 from public.round3_challenge_definitions where event_id=p_event_id and (title like 'DEMO ONLY%' or encrypted_content='' or clue='' or (requires_key=false and requires_plaintext=false))) ) then
    raise exception 'All three complete challenge configurations and final code are required';
  end if;
  update public.round3_question_sets set published_at=pg_catalog.now(),is_demo_only=p_demo_only,version=version+1,updated_at=pg_catalog.now() where event_id=p_event_id;
  insert into private.round3_configuration_audit(event_id,version,actor_user_id,action) select event_id,version,auth.uid(),'published' from public.round3_question_sets where event_id=p_event_id;
end $$;
revoke all on function public.publish_round3_configuration(uuid,boolean) from public,anon;
grant execute on function public.publish_round3_configuration(uuid,boolean) to authenticated;

create or replace function public.load_round3_challenges()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_team_id uuid; v_event_id uuid; team_state text; round_state text; rows jsonb; done_count integer; demo boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select t.id,t.event_id,t.status into v_team_id,v_event_id,team_state from public.teams t where t.auth_user_id=auth.uid();
  if v_team_id is null or team_state not in ('approved','active') then raise exception 'No eligible team is linked to this account' using errcode='42501'; end if;
  select r.status into round_state from public.rounds r where r.event_id=v_event_id and r.round_number=3;
  if round_state is null or round_state not in ('ready','running','paused','ended') then raise exception 'Round 3 is not authorized by the organizer' using errcode='42501'; end if;
  if not exists(select 1 from public.round3_question_sets where round3_question_sets.event_id=v_event_id and published_at is not null) then raise exception 'Round 3 content is not published'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_team_id::text||v_event_id::text,0));
  insert into private.team_round3_challenge_order(event_id,team_id,slot,display_order)
    select v_event_id,v_team_id,d.slot,row_number() over(order by extensions.gen_random_uuid())::smallint from public.round3_challenge_definitions d where d.event_id=v_event_id on conflict do nothing;
  insert into public.team_round3_progress(event_id,team_id,slot) select v_event_id,v_team_id,d.slot from public.round3_challenge_definitions d where d.event_id=v_event_id on conflict do nothing;
  select q.is_demo_only into demo from public.round3_question_sets q where q.event_id=v_event_id;
  select count(*) filter(where p.status='completed'),pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'slot',d.slot,'title',d.title,'description',d.description,'difficulty',d.difficulty,'encrypted_content',d.encrypted_content,
    'known_plaintext',d.known_plaintext,'clue',d.clue,'accepted_formats',d.accepted_formats,'display_order',o.display_order,
    'completed',p.status='completed','workspace',p.workspace,
    'fragment',case when p.status='completed' then s.code_fragment else null end,
    'victims',case when p.status='completed' then d.associated_victims else array[]::smallint[] end,
    'hints',coalesce((select jsonb_agg(jsonb_build_object('index',u.hint_index,'text',s.hints->>(u.hint_index-1),'configured_deduction',u.configured_deduction) order by u.hint_index) from private.team_round3_hint_usage u where u.event_id=d.event_id and u.team_id=v_team_id and u.slot=d.slot),'[]'::jsonb),
    'hint_count',(select count(*) from private.team_round3_hint_usage u where u.event_id=d.event_id and u.team_id=v_team_id and u.slot=d.slot),
    'hint_available_count',jsonb_array_length(s.hints),
    'is_demo_only',demo
  ) order by o.display_order) into done_count,rows
  from public.round3_challenge_definitions d join private.team_round3_challenge_order o using(event_id,slot)
  join public.team_round3_progress p on p.event_id=d.event_id and p.team_id=v_team_id and p.slot=d.slot
  join private.round3_challenge_secrets s using(event_id,slot) where d.event_id=v_event_id;
  return jsonb_build_object('round_status',round_state,'is_demo_only',demo,'final_code_available',done_count=3,
    'final_code_complete',exists(select 1 from public.team_round3_final_progress f where f.event_id=v_event_id and f.team_id=v_team_id),'challenges',coalesce(rows,'[]'::jsonb));
end $$;
revoke all on function public.load_round3_challenges() from public,anon;
grant execute on function public.load_round3_challenges() to authenticated;

create or replace function public.save_round3_workspace(p_slot smallint,p_workspace jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_team_id uuid; v_event_id uuid; round_state text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select t.id,t.event_id into v_team_id,v_event_id from public.teams t where t.auth_user_id=auth.uid() and t.status in ('approved','active');
  if v_team_id is null or p_slot not between 1 and 3 or pg_catalog.jsonb_typeof(p_workspace)<>'object' or pg_catalog.octet_length(p_workspace::text)>24000 then raise exception 'Invalid workspace'; end if;
  select r.status into round_state from public.rounds r where r.event_id=v_event_id and r.round_number=3;
  if round_state is null or round_state not in ('ready','running') or not exists(select 1 from public.round3_question_sets q where q.event_id=v_event_id and q.published_at is not null) then raise exception 'Round 3 is not accepting workspace updates' using errcode='42501'; end if;
  update public.team_round3_progress set workspace=jsonb_build_object('scratchpad',left(coalesce(p_workspace->>'scratchpad',''),12000),'key',left(coalesce(p_workspace->>'key',''),512),'plaintext',left(coalesce(p_workspace->>'plaintext',''),6000)),updated_at=now()
  where event_id=v_event_id and team_id=v_team_id and slot=p_slot and status='in_progress';
end $$;
revoke all on function public.save_round3_workspace(smallint,jsonb) from public,anon;
grant execute on function public.save_round3_workspace(smallint,jsonb) to authenticated;

create or replace function public.submit_round3_challenge(p_slot smallint,p_key text,p_plaintext text,p_answer_format text default 'text')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_team_id uuid; v_event_id uuid; round_state text; d public.round3_challenge_definitions%rowtype; s private.round3_challenge_secrets%rowtype; progress_status text; key_ok boolean; plaintext_ok boolean; decoded_plaintext text; victim smallint;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_slot not between 1 and 3 or length(coalesce(p_key,''))>512 or length(coalesce(p_plaintext,''))>6000 then raise exception 'Invalid answer'; end if;
  select t.id,t.event_id into v_team_id,v_event_id from public.teams t where t.auth_user_id=auth.uid() and t.status in ('approved','active');
  if v_team_id is null then raise exception 'Eligible team required' using errcode='42501'; end if;
  select r.status into round_state from public.rounds r where r.event_id=v_event_id and r.round_number=3 for update;
  if round_state is null or round_state not in ('ready','running') then raise exception 'Round 3 is not accepting submissions' using errcode='42501'; end if;
  if not exists(select 1 from public.round3_question_sets q where q.event_id=v_event_id and q.published_at is not null) then raise exception 'Round 3 content is not published'; end if;
  select * into d from public.round3_challenge_definitions definition where definition.event_id=v_event_id and definition.slot=p_slot;
  select * into s from private.round3_challenge_secrets secret where secret.event_id=v_event_id and secret.slot=p_slot;
  if d.event_id is null then return jsonb_build_object('correct',false,'completed',false); end if;
  insert into public.team_round3_progress(event_id,team_id,slot) values(v_event_id,v_team_id,p_slot) on conflict do nothing;
  select p.status into progress_status from public.team_round3_progress p where p.event_id=v_event_id and p.team_id=v_team_id and p.slot=p_slot for update;
  if progress_status='completed' then return jsonb_build_object('correct',true,'completed',true); end if;
  if p_answer_format is null or not coalesce(p_answer_format=any(d.accepted_formats),false) then return jsonb_build_object('correct',false,'completed',false); end if;
  decoded_plaintext:=private.round3_decode_answer(coalesce(p_plaintext,''),p_answer_format);
  if decoded_plaintext is null then return jsonb_build_object('correct',false,'completed',false); end if;
  key_ok:=not d.requires_key or (s.expected_key is not null and private.round3_normalize(coalesce(p_key,''),d.case_sensitive,d.normalize_whitespace)=private.round3_normalize(s.expected_key,d.case_sensitive,d.normalize_whitespace));
  plaintext_ok:=not d.requires_plaintext or (s.expected_plaintext is not null and private.round3_normalize(decoded_plaintext,d.case_sensitive,d.normalize_whitespace)=private.round3_normalize(s.expected_plaintext,d.case_sensitive,d.normalize_whitespace));
  if not (key_ok and plaintext_ok) then return jsonb_build_object('correct',false,'completed',false); end if;
  update public.team_round3_progress set status='completed',completed_at=now(),updated_at=now() where event_id=v_event_id and team_id=v_team_id and slot=p_slot;
  for victim in select unnest(d.associated_victims) loop insert into public.team_round3_evidence_unlocks(event_id,team_id,slot,victim_number,placeholder_only) values(v_event_id,v_team_id,p_slot,victim,true) on conflict do nothing; end loop;
  return jsonb_build_object('correct',true,'completed',true);
end $$;
revoke all on function public.submit_round3_challenge(smallint,text,text,text) from public,anon;
grant execute on function public.submit_round3_challenge(smallint,text,text,text) to authenticated;

create or replace function public.request_round3_hint(p_slot smallint,p_hint_index smallint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_team_id uuid; v_event_id uuid; hint_text text; deduction numeric; total_hints integer; inserted_count integer; round_state text; challenge_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select t.id,t.event_id into v_team_id,v_event_id from public.teams t where t.auth_user_id=auth.uid() and t.status in ('approved','active');
  if v_team_id is null or p_slot not between 1 and 3 or p_hint_index<1 then raise exception 'Hint unavailable' using errcode='42501'; end if;
  select r.status into round_state from public.rounds r where r.event_id=v_event_id and r.round_number=3;
  if round_state is null or round_state not in ('ready','running') or not exists(select 1 from public.round3_question_sets q where q.event_id=v_event_id and q.published_at is not null) then raise exception 'Hints are not available' using errcode='42501'; end if;
  select p.status into challenge_status from public.team_round3_progress p where p.event_id=v_event_id and p.team_id=v_team_id and p.slot=p_slot;
  if challenge_status='completed' then raise exception 'Challenge is already complete'; end if;
  select jsonb_array_length(s.hints) into total_hints from private.round3_challenge_secrets s where s.event_id=v_event_id and s.slot=p_slot;
  if p_hint_index>coalesce(total_hints,0) then raise exception 'Hint unavailable'; end if;
  if challenge_status is null then insert into public.team_round3_progress(event_id,team_id,slot) values(v_event_id,v_team_id,p_slot) on conflict do nothing; end if;
  select nullif(nullif(s.hint_deductions->>(p_hint_index-1),'null'),'')::numeric,s.hints->>(p_hint_index-1) into deduction,hint_text from private.round3_challenge_secrets s where s.event_id=v_event_id and s.slot=p_slot;
  insert into private.team_round3_hint_usage(event_id,team_id,slot,hint_index,configured_deduction) values(v_event_id,v_team_id,p_slot,p_hint_index,deduction) on conflict(event_id,team_id,slot,hint_index) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count=0 then select configured_deduction into deduction from private.team_round3_hint_usage where event_id=v_event_id and team_id=v_team_id and slot=p_slot and hint_index=p_hint_index; end if;
  return jsonb_build_object('index',p_hint_index,'text',hint_text,'configured_deduction',deduction,'already_used',inserted_count=0);
end $$;
revoke all on function public.request_round3_hint(smallint,smallint) from public,anon;
grant execute on function public.request_round3_hint(smallint,smallint) to authenticated;

create or replace function public.submit_round3_final_code(p_code text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_team_id uuid; v_event_id uuid; final_secret private.round3_final_secrets%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if length(coalesce(p_code,''))>512 then return false; end if;
  select t.id,t.event_id into v_team_id,v_event_id from public.teams t where t.auth_user_id=auth.uid() and t.status in ('approved','active');
  if v_team_id is null then raise exception 'Eligible team required' using errcode='42501'; end if;
  if (select count(*) from public.team_round3_progress p where p.event_id=v_event_id and p.team_id=v_team_id and p.status='completed')<>3 then return false; end if;
  select * into final_secret from private.round3_final_secrets s where s.event_id=v_event_id;
  if final_secret.expected_code is null and exists(select 1 from public.round3_question_sets q where q.event_id=v_event_id and q.is_demo_only) then select expected_code into final_secret.expected_code from private.round3_demo_final_template where singleton; end if;
  if final_secret.expected_code is null or private.round3_normalize(coalesce(p_code,''),false,true)<>private.round3_normalize(final_secret.expected_code,false,true) then return false; end if;
  insert into public.team_round3_final_progress(event_id,team_id) values(v_event_id,v_team_id) on conflict do nothing;
  return true;
end $$;
revoke all on function public.submit_round3_final_code(text) from public,anon;
grant execute on function public.submit_round3_final_code(text) to authenticated;
