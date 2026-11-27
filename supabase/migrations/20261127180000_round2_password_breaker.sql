-- Round 2 configurable Password Breaker engine.
-- Demo templates are temporary and are never exposed by participant RPCs.

create table public.round2_question_sets (
  event_id uuid primary key references public.events(id) on delete restrict,
  is_demo_only boolean not null default true,
  version integer not null default 1 check (version > 0),
  configured_by uuid references auth.users(id) on delete restrict,
  updated_at timestamptz not null default pg_catalog.now()
);

create table public.round2_challenge_definitions (
  event_id uuid not null references public.round2_question_sets(event_id) on delete cascade,
  slot smallint not null check (slot between 1 and 6),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  question_text text not null check (char_length(btrim(question_text)) between 1 and 6000),
  puzzle_content text not null check (char_length(btrim(puzzle_content)) between 1 and 8000),
  built_in_clue text not null check (char_length(btrim(built_in_clue)) between 1 and 1200),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  required_round1_victim smallint check (required_round1_victim between 1 and 6),
  associated_victim smallint not null check (associated_victim between 7 and 12),
  maximum_marks numeric(8, 2) not null check (maximum_marks > 0),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (event_id, slot),
  unique (event_id, associated_victim)
);

create table private.round2_challenge_secrets (
  event_id uuid not null,
  slot smallint not null,
  correct_password_hash text not null,
  solution_explanation text not null check (char_length(btrim(solution_explanation)) between 1 and 6000),
  hidden_word text not null check (char_length(btrim(hidden_word)) between 1 and 80),
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (event_id, slot),
  foreign key (event_id, slot)
    references public.round2_challenge_definitions(event_id, slot) on delete cascade
);

create table private.round2_final_phrase_secrets (
  event_id uuid primary key references public.round2_question_sets(event_id) on delete cascade,
  phrase_hash text not null,
  updated_at timestamptz not null default pg_catalog.now()
);

-- Generic defaults for development only. Organizers may edit every field in the
-- manager. They are not competition questions, answers, clues or scoring.
create table private.round2_demo_question_templates (
  slot smallint primary key check (slot between 1 and 6),
  title text not null,
  question_text text not null,
  puzzle_content text not null,
  built_in_clue text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  required_round1_victim smallint check (required_round1_victim between 1 and 6),
  associated_victim smallint not null unique check (associated_victim between 7 and 12),
  maximum_marks numeric(8, 2) not null check (maximum_marks > 0),
  correct_password_hash text not null,
  solution_explanation text not null,
  hidden_word text not null
);

insert into private.round2_demo_question_templates (
  slot, title, question_text, puzzle_content, built_in_clue, difficulty,
  required_round1_victim, associated_victim, maximum_marks,
  correct_password_hash, solution_explanation, hidden_word
) values
  (1, 'DEMO ONLY — Challenge 01', 'Temporary demo question. Replace this text in organizer configuration before the event.', 'Temporary encrypted-message placeholder 01.', 'Temporary demo clue 01.', 'easy', 1, 7, 1, extensions.crypt('DEMO-PASSWORD-01', extensions.gen_salt('bf', 12)), 'Temporary demo explanation 01.', 'demo-one'),
  (2, 'DEMO ONLY — Challenge 02', 'Temporary demo question. Replace this text in organizer configuration before the event.', 'Temporary puzzle-content placeholder 02.', 'Temporary demo clue 02.', 'easy', null, 8, 1, extensions.crypt('DEMO-PASSWORD-02', extensions.gen_salt('bf', 12)), 'Temporary demo explanation 02.', 'demo-two'),
  (3, 'DEMO ONLY — Challenge 03', 'Temporary demo question. Replace this text in organizer configuration before the event.', 'Temporary encrypted-message placeholder 03.', 'Temporary demo clue 03.', 'medium', null, 9, 1, extensions.crypt('DEMO-PASSWORD-03', extensions.gen_salt('bf', 12)), 'Temporary demo explanation 03.', 'demo-three'),
  (4, 'DEMO ONLY — Challenge 04', 'Temporary demo question. Replace this text in organizer configuration before the event.', 'Temporary puzzle-content placeholder 04.', 'Temporary demo clue 04.', 'medium', null, 10, 1, extensions.crypt('DEMO-PASSWORD-04', extensions.gen_salt('bf', 12)), 'Temporary demo explanation 04.', 'demo-four'),
  (5, 'DEMO ONLY — Challenge 05', 'Temporary demo question. Replace this text in organizer configuration before the event.', 'Temporary encrypted-message placeholder 05.', 'Temporary demo clue 05.', 'hard', null, 11, 1, extensions.crypt('DEMO-PASSWORD-05', extensions.gen_salt('bf', 12)), 'Temporary demo explanation 05.', 'demo-five'),
  (6, 'DEMO ONLY — Challenge 06', 'Temporary demo question. Replace this text in organizer configuration before the event.', 'Temporary puzzle-content placeholder 06.', 'Temporary demo clue 06.', 'hard', null, 12, 1, extensions.crypt('DEMO-PASSWORD-06', extensions.gen_salt('bf', 12)), 'Temporary demo explanation 06.', 'demo-six');

create table private.round2_demo_phrase_template (
  singleton boolean primary key default true check (singleton),
  phrase_hash text not null
);

insert into private.round2_demo_phrase_template (singleton, phrase_hash)
values (
  true,
  extensions.crypt(
    'demo-one demo-two demo-three demo-four demo-five demo-six',
    extensions.gen_salt('bf', 12)
  )
);

create table private.team_round2_challenge_order (
  event_id uuid not null references public.round2_question_sets(event_id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  slot smallint not null check (slot between 1 and 6),
  display_order smallint not null check (display_order between 1 and 6),
  created_at timestamptz not null default pg_catalog.now(),
  primary key (event_id, team_id, slot),
  unique (event_id, team_id, display_order)
);

create table public.team_round2_progress (
  event_id uuid not null,
  team_id uuid not null references public.teams(id) on delete restrict,
  slot smallint not null check (slot between 1 and 6),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (event_id, team_id, slot),
  foreign key (event_id, slot)
    references public.round2_challenge_definitions(event_id, slot) on delete restrict,
  constraint team_round2_progress_completion_state check (
    (status = 'in_progress' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  )
);

create table public.team_round2_evidence_unlocks (
  event_id uuid not null,
  team_id uuid not null references public.teams(id) on delete restrict,
  slot smallint not null check (slot between 1 and 6),
  victim_number smallint not null check (victim_number between 7 and 12),
  placeholder_only boolean not null default true,
  unlocked_at timestamptz not null default pg_catalog.now(),
  primary key (event_id, team_id, slot),
  unique (event_id, team_id, victim_number),
  foreign key (event_id, team_id, slot)
    references public.team_round2_progress(event_id, team_id, slot) on delete restrict
);

create table public.team_round2_phrase_progress (
  event_id uuid not null references public.round2_question_sets(event_id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  completed_at timestamptz not null default pg_catalog.now(),
  primary key (event_id, team_id)
);

create table private.round2_configuration_audit (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  version integer not null check (version > 0),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  is_demo_only boolean not null,
  changed_at timestamptz not null default pg_catalog.now(),
  unique (event_id, version)
);

alter table public.round2_question_sets enable row level security;
alter table public.round2_challenge_definitions enable row level security;
alter table public.team_round2_progress enable row level security;
alter table public.team_round2_evidence_unlocks enable row level security;
alter table public.team_round2_phrase_progress enable row level security;

create policy team_round2_evidence_unlocks_select_own
  on public.team_round2_evidence_unlocks for select to authenticated
  using (team_id = (select public.my_team_id()));

revoke all on table public.round2_question_sets from public, anon, authenticated, service_role;
revoke all on table public.round2_challenge_definitions from public, anon, authenticated, service_role;
revoke all on table public.team_round2_progress from public, anon, authenticated, service_role;
revoke all on table public.team_round2_evidence_unlocks from public, anon, authenticated, service_role;
revoke all on table public.team_round2_phrase_progress from public, anon, authenticated, service_role;
grant select on table public.team_round2_evidence_unlocks to authenticated;

revoke all on table private.round2_challenge_secrets from public, anon, authenticated, service_role;
revoke all on table private.round2_final_phrase_secrets from public, anon, authenticated, service_role;
revoke all on table private.round2_demo_question_templates from public, anon, authenticated, service_role;
revoke all on table private.round2_demo_phrase_template from public, anon, authenticated, service_role;
revoke all on table private.team_round2_challenge_order from public, anon, authenticated, service_role;
revoke all on table private.round2_configuration_audit from public, anon, authenticated, service_role;

create or replace function public.get_round2_organizer_configuration(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  configuration_exists boolean;
  configuration_demo_only boolean;
  challenges jsonb;
  phrase_configured boolean;
begin
  if auth.uid() is null or not public.is_organizer() then
    raise exception 'Organizer authorization required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.events e where e.id = p_event_id) then
    raise exception 'Event configuration was not found';
  end if;

  select q.is_demo_only into configuration_demo_only
  from public.round2_question_sets q where q.event_id = p_event_id;
  configuration_exists := found;

  if configuration_exists then
    select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'slot', d.slot,
        'title', d.title,
        'question_text', d.question_text,
        'puzzle_content', d.puzzle_content,
        'built_in_clue', d.built_in_clue,
        'difficulty', d.difficulty,
        'required_round1_victim', d.required_round1_victim,
        'associated_victim', d.associated_victim,
        'maximum_marks', d.maximum_marks,
        'solution_explanation', s.solution_explanation,
        'hidden_word', s.hidden_word,
        'answer_configured', s.correct_password_hash is not null
      ) order by d.slot
    ) into challenges
    from public.round2_challenge_definitions d
    join private.round2_challenge_secrets s
      on s.event_id = d.event_id and s.slot = d.slot
    where d.event_id = p_event_id;

    select s.phrase_hash is not null into phrase_configured
    from private.round2_final_phrase_secrets s where s.event_id = p_event_id;
  else
    select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'slot', d.slot,
        'title', d.title,
        'question_text', d.question_text,
        'puzzle_content', d.puzzle_content,
        'built_in_clue', d.built_in_clue,
        'difficulty', d.difficulty,
        'required_round1_victim', d.required_round1_victim,
        'associated_victim', d.associated_victim,
        'maximum_marks', d.maximum_marks,
        'solution_explanation', d.solution_explanation,
        'hidden_word', d.hidden_word,
        'answer_configured', d.correct_password_hash is not null
      ) order by d.slot
    ) into challenges
    from private.round2_demo_question_templates d;
    select s.phrase_hash is not null into phrase_configured
    from private.round2_demo_phrase_template s where s.singleton;
    configuration_demo_only := true;
  end if;

  return pg_catalog.jsonb_build_object(
    'event_id', p_event_id,
    'is_demo_only', coalesce(configuration_demo_only, true),
    'phrase_configured', coalesce(phrase_configured, false),
    'challenges', coalesce(challenges, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_round2_organizer_configuration(uuid) from public, anon;
grant execute on function public.get_round2_organizer_configuration(uuid) to authenticated;

create or replace function public.save_round2_configuration(
  p_event_id uuid,
  p_challenges jsonb,
  p_final_phrase text,
  p_demo_only boolean default true
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  round_status text;
  row_count integer;
  slot_count integer;
  victim_count integer;
  dependency_count integer;
  challenge record;
  answer_hash text;
  phrase_hash text;
  next_version integer;
begin
  if auth.uid() is null or not public.is_organizer() then
    raise exception 'Organizer authorization required' using errcode = '42501';
  end if;
  if p_event_id is null or p_demo_only is null
    or pg_catalog.jsonb_typeof(p_challenges) <> 'array'
    or pg_catalog.jsonb_array_length(p_challenges) <> 6 then
    raise exception 'Exactly six complete challenge slots are required';
  end if;
  if p_final_phrase is not null and (
    char_length(p_final_phrase) > 500
    or pg_catalog.cardinality(pg_catalog.regexp_split_to_array(btrim(p_final_phrase), '\s+')) <> 6
  ) then
    raise exception 'Final phrase must contain exactly six words';
  end if;
  if not exists (select 1 from public.events e where e.id = p_event_id) then
    raise exception 'Event configuration was not found';
  end if;

  select r.status into round_status
  from public.rounds r
  where r.event_id = p_event_id and r.round_number = 2
  for update;
  if round_status is null or round_status in ('running', 'paused', 'ended') then
    raise exception 'Round 2 configuration is locked for this event';
  end if;
  if exists (select 1 from public.team_round2_progress p where p.event_id = p_event_id)
    or exists (select 1 from private.team_round2_challenge_order o where o.event_id = p_event_id) then
    raise exception 'Round 2 configuration is locked after participant progress begins';
  end if;

  select count(*), count(distinct q.slot), count(distinct q.associated_victim),
    count(*) filter (where q.required_round1_victim is not null)
  into row_count, slot_count, victim_count, dependency_count
  from pg_catalog.jsonb_to_recordset(p_challenges) as q(
    slot smallint,
    title text,
    question_text text,
    puzzle_content text,
    built_in_clue text,
    difficulty text,
    required_round1_victim smallint,
    associated_victim smallint,
    maximum_marks numeric,
    correct_password text,
    solution_explanation text,
    hidden_word text
  );
  if row_count <> 6 or slot_count <> 6 or victim_count <> 6 or dependency_count <> 1
    or (select min(q.slot) from pg_catalog.jsonb_to_recordset(p_challenges) as q(slot smallint)) <> 1
    or (select max(q.slot) from pg_catalog.jsonb_to_recordset(p_challenges) as q(slot smallint)) <> 6
    or (select min(q.associated_victim) from pg_catalog.jsonb_to_recordset(p_challenges) as q(associated_victim smallint)) <> 7
    or (select max(q.associated_victim) from pg_catalog.jsonb_to_recordset(p_challenges) as q(associated_victim smallint)) <> 12 then
    raise exception 'Challenge slots, Round 1 dependency and victim assignments are invalid';
  end if;
  if not p_demo_only and (
    p_final_phrase is null or nullif(btrim(p_final_phrase), '') is null
    or exists (
      select 1 from pg_catalog.jsonb_to_recordset(p_challenges) as q(
        correct_password text, title text, question_text text, puzzle_content text,
        built_in_clue text, hidden_word text
      )
      where nullif(btrim(q.correct_password), '') is null
        or pg_catalog.octet_length(pg_catalog.convert_to(btrim(q.correct_password), 'UTF8')) > 72
        or q.title ilike 'demo only%'
        or q.question_text ilike '%temporary demo%'
        or q.puzzle_content ilike '%temporary%placeholder%'
        or q.built_in_clue ilike '%temporary demo%'
        or q.hidden_word ilike 'demo-%'
    )
  ) then
    raise exception 'Demo placeholders cannot be marked as final; provide all final answers, six-word phrase and content';
  end if;
  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(p_challenges) as q(
      title text, question_text text, puzzle_content text, built_in_clue text,
      difficulty text, required_round1_victim smallint, associated_victim smallint,
      maximum_marks numeric, correct_password text, solution_explanation text,
      hidden_word text
    )
    where q.title is null or char_length(btrim(q.title)) not between 1 and 120
      or q.question_text is null or char_length(btrim(q.question_text)) not between 1 and 6000
      or q.puzzle_content is null or char_length(btrim(q.puzzle_content)) not between 1 and 8000
      or q.built_in_clue is null or char_length(btrim(q.built_in_clue)) not between 1 and 1200
      or q.difficulty not in ('easy', 'medium', 'hard')
      or (q.required_round1_victim is not null and q.required_round1_victim not between 1 and 6)
      or q.associated_victim not between 7 and 12
      or q.maximum_marks is null or q.maximum_marks <= 0
      or q.solution_explanation is null or char_length(btrim(q.solution_explanation)) not between 1 and 6000
      or q.hidden_word is null or char_length(btrim(q.hidden_word)) not between 1 and 80
      or (nullif(btrim(q.correct_password), '') is not null and pg_catalog.octet_length(pg_catalog.convert_to(btrim(q.correct_password), 'UTF8')) > 72)
  ) then
    raise exception 'Challenge content is invalid';
  end if;

  insert into public.round2_question_sets (event_id, is_demo_only, version, configured_by)
  values (p_event_id, p_demo_only, 1, auth.uid())
  on conflict (event_id) do update
    set is_demo_only = excluded.is_demo_only,
        version = public.round2_question_sets.version + 1,
        configured_by = excluded.configured_by,
        updated_at = pg_catalog.now()
  returning version into next_version;

  for challenge in
    select * from pg_catalog.jsonb_to_recordset(p_challenges) as q(
      slot smallint,
      title text,
      question_text text,
      puzzle_content text,
      built_in_clue text,
      difficulty text,
      required_round1_victim smallint,
      associated_victim smallint,
      maximum_marks numeric,
      correct_password text,
      solution_explanation text,
      hidden_word text
    ) order by q.slot
  loop
    insert into public.round2_challenge_definitions (
      event_id, slot, title, question_text, puzzle_content, built_in_clue,
      difficulty, required_round1_victim, associated_victim, maximum_marks
    ) values (
      p_event_id, challenge.slot, btrim(challenge.title), btrim(challenge.question_text),
      btrim(challenge.puzzle_content), btrim(challenge.built_in_clue), challenge.difficulty,
      challenge.required_round1_victim, challenge.associated_victim, challenge.maximum_marks
    )
    on conflict (event_id, slot) do update
      set title = excluded.title,
          question_text = excluded.question_text,
          puzzle_content = excluded.puzzle_content,
          built_in_clue = excluded.built_in_clue,
          difficulty = excluded.difficulty,
          required_round1_victim = excluded.required_round1_victim,
          associated_victim = excluded.associated_victim,
          maximum_marks = excluded.maximum_marks,
          updated_at = pg_catalog.now();

    select s.correct_password_hash into answer_hash
    from private.round2_challenge_secrets s
    where s.event_id = p_event_id and s.slot = challenge.slot;
    if nullif(btrim(challenge.correct_password), '') is not null then
      answer_hash := extensions.crypt(btrim(challenge.correct_password), extensions.gen_salt('bf', 12));
    elsif answer_hash is null then
      select d.correct_password_hash into answer_hash
      from private.round2_demo_question_templates d where d.slot = challenge.slot;
    end if;
    if answer_hash is null then raise exception 'A protected answer is required for every challenge'; end if;

    insert into private.round2_challenge_secrets (
      event_id, slot, correct_password_hash, solution_explanation, hidden_word
    ) values (
      p_event_id, challenge.slot, answer_hash,
      btrim(challenge.solution_explanation), btrim(challenge.hidden_word)
    )
    on conflict (event_id, slot) do update
      set correct_password_hash = excluded.correct_password_hash,
          solution_explanation = excluded.solution_explanation,
          hidden_word = excluded.hidden_word,
          updated_at = pg_catalog.now();
  end loop;

  select s.phrase_hash into phrase_hash
  from private.round2_final_phrase_secrets s where s.event_id = p_event_id;
  if nullif(btrim(p_final_phrase), '') is not null then
    phrase_hash := extensions.crypt(pg_catalog.regexp_replace(btrim(p_final_phrase), '\s+', ' ', 'g'), extensions.gen_salt('bf', 12));
  elsif phrase_hash is null then
    select d.phrase_hash into phrase_hash
    from private.round2_demo_phrase_template d where d.singleton;
  end if;
  if phrase_hash is null then raise exception 'A protected final phrase is required'; end if;

  insert into private.round2_final_phrase_secrets (event_id, phrase_hash)
  values (p_event_id, phrase_hash)
  on conflict (event_id) do update
    set phrase_hash = excluded.phrase_hash,
        updated_at = pg_catalog.now();

  insert into private.round2_configuration_audit (event_id, version, actor_user_id, is_demo_only)
  values (p_event_id, next_version, auth.uid(), p_demo_only);

  return next_version;
end;
$$;

revoke all on function public.save_round2_configuration(uuid, jsonb, text, boolean) from public, anon;
grant execute on function public.save_round2_configuration(uuid, jsonb, text, boolean) to authenticated;

create or replace function public.load_round2_challenges()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_team_id uuid;
  current_event_id uuid;
  current_team_status text;
  current_round_status text;
  challenge_rows jsonb;
  demo_status boolean;
  phrase_complete boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select t.id, t.event_id, t.status into current_team_id, current_event_id, current_team_status
  from public.teams t where t.auth_user_id = auth.uid();
  if current_team_id is null or current_team_status not in ('approved', 'active') then
    raise exception 'No eligible team is linked to this account' using errcode = '42501';
  end if;

  select r.status into current_round_status
  from public.rounds r where r.event_id = current_event_id and r.round_number = 2;
  if current_round_status is null or current_round_status not in ('ready', 'running', 'paused', 'ended') then
    raise exception 'Round 2 is not authorized by the organizer' using errcode = '42501';
  end if;
  if (select count(*) from public.round2_challenge_definitions d where d.event_id = current_event_id) <> 6 then
    raise exception 'Round 2 questions are not configured';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_team_id::text || current_event_id::text, 0)
  );
  insert into private.team_round2_challenge_order (event_id, team_id, slot, display_order)
  select current_event_id, current_team_id, d.slot,
    pg_catalog.row_number() over (order by extensions.gen_random_uuid())::smallint
  from public.round2_challenge_definitions d where d.event_id = current_event_id
  on conflict (event_id, team_id, slot) do nothing;

  insert into public.team_round2_progress (event_id, team_id, slot)
  select current_event_id, current_team_id, d.slot
  from public.round2_challenge_definitions d where d.event_id = current_event_id
  on conflict (event_id, team_id, slot) do nothing;

  select q.is_demo_only into demo_status
  from public.round2_question_sets q where q.event_id = current_event_id;
  select exists (
    select 1 from public.team_round2_phrase_progress p
    where p.event_id = current_event_id and p.team_id = current_team_id
  ) into phrase_complete;

  select pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'slot', d.slot,
      'title', d.title,
      'question_text', case when access.is_available or progress.status = 'completed' then d.question_text else null end,
      'puzzle_content', case when access.is_available or progress.status = 'completed' then d.puzzle_content else null end,
      'built_in_clue', d.built_in_clue,
      'difficulty', d.difficulty,
      'maximum_marks', d.maximum_marks,
      'required_round1_victim', d.required_round1_victim,
      'display_order', ordering.display_order,
      'is_available', access.is_available,
      'completed', progress.status = 'completed',
      'victim_number', case when progress.status = 'completed' then d.associated_victim else null end,
      'revealed_word', case when progress.status = 'completed' then secrets.hidden_word else null end
    ) order by ordering.display_order
  ) into challenge_rows
  from public.round2_challenge_definitions d
  join private.team_round2_challenge_order ordering
    on ordering.event_id = d.event_id and ordering.team_id = current_team_id and ordering.slot = d.slot
  join public.team_round2_progress progress
    on progress.event_id = d.event_id and progress.team_id = current_team_id and progress.slot = d.slot
  join private.round2_challenge_secrets secrets
    on secrets.event_id = d.event_id and secrets.slot = d.slot
  cross join lateral (
    select d.required_round1_victim is null or exists (
      select 1 from public.team_round1_evidence_unlocks evidence
      where evidence.team_id = current_team_id
        and evidence.victim_number = d.required_round1_victim
    ) as is_available
  ) access
  where d.event_id = current_event_id;

  return pg_catalog.jsonb_build_object(
    'round_status', current_round_status,
    'is_demo_only', coalesce(demo_status, true),
    'phrase_complete', coalesce(phrase_complete, false),
    'challenges', coalesce(challenge_rows, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.load_round2_challenges() from public, anon;
grant execute on function public.load_round2_challenges() to authenticated;

create or replace function public.submit_round2_challenge(p_slot smallint, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_team_id uuid;
  current_event_id uuid;
  current_team_status text;
  current_round_status text;
  current_progress_status text;
  current_answer_hash text;
  current_explanation text;
  current_hidden_word text;
  current_victim smallint;
  current_marks numeric(8, 2);
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_slot is null or p_slot not between 1 and 6 then
    raise exception 'Unknown Round 2 challenge';
  end if;
  select t.id, t.event_id, t.status into current_team_id, current_event_id, current_team_status
  from public.teams t where t.auth_user_id = auth.uid();
  if current_team_id is null or current_team_status not in ('approved', 'active') then
    raise exception 'No eligible team is linked to this account' using errcode = '42501';
  end if;
  select r.status into current_round_status
  from public.rounds r where r.event_id = current_event_id and r.round_number = 2
  for update;
  if current_round_status is null or current_round_status not in ('ready', 'running') then
    raise exception 'Round 2 is not accepting submissions' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.round2_challenge_definitions d
    where d.event_id = current_event_id and d.slot = p_slot
  ) then raise exception 'Round 2 challenge is not configured'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_team_id::text || current_event_id::text, 0)
  );
  insert into public.team_round2_progress (event_id, team_id, slot)
  values (current_event_id, current_team_id, p_slot)
  on conflict (event_id, team_id, slot) do nothing;

  select progress.status, secret.correct_password_hash, secret.solution_explanation,
    secret.hidden_word, definition.associated_victim, definition.maximum_marks
  into current_progress_status, current_answer_hash, current_explanation,
    current_hidden_word, current_victim, current_marks
  from public.team_round2_progress progress
  join public.round2_challenge_definitions definition
    on definition.event_id = progress.event_id and definition.slot = progress.slot
  join private.round2_challenge_secrets secret
    on secret.event_id = definition.event_id and secret.slot = definition.slot
  where progress.event_id = current_event_id and progress.team_id = current_team_id
    and progress.slot = p_slot
  for update of progress;

  if current_progress_status = 'completed' then
    return pg_catalog.jsonb_build_object(
      'correct', true, 'completed', true,
      'victim_number', current_victim, 'revealed_word', current_hidden_word,
      'maximum_marks', current_marks
    );
  end if;

  if exists (
    select 1 from public.round2_challenge_definitions d
    where d.event_id = current_event_id and d.slot = p_slot
      and d.required_round1_victim is not null
      and not exists (
        select 1 from public.team_round1_evidence_unlocks evidence
        where evidence.team_id = current_team_id
          and evidence.victim_number = d.required_round1_victim
      )
  ) then
    raise exception 'Required Round 1 evidence has not been unlocked' using errcode = '42501';
  end if;

  if p_password is null or pg_catalog.octet_length(pg_catalog.convert_to(p_password, 'UTF8')) > 72
    or extensions.crypt(btrim(p_password), current_answer_hash) is distinct from current_answer_hash then
    return pg_catalog.jsonb_build_object('correct', false, 'completed', false);
  end if;

  update public.team_round2_progress
  set status = 'completed', completed_at = pg_catalog.now(), updated_at = pg_catalog.now()
  where event_id = current_event_id and team_id = current_team_id and slot = p_slot;

  insert into public.team_round2_evidence_unlocks (
    event_id, team_id, slot, victim_number, placeholder_only
  ) values (current_event_id, current_team_id, p_slot, current_victim, true)
  on conflict (event_id, team_id, slot) do nothing;

  return pg_catalog.jsonb_build_object(
    'correct', true, 'completed', true,
    'victim_number', current_victim, 'revealed_word', current_hidden_word,
    'maximum_marks', current_marks
  );
end;
$$;

revoke all on function public.submit_round2_challenge(smallint, text) from public, anon;
grant execute on function public.submit_round2_challenge(smallint, text) to authenticated;

create or replace function public.submit_round2_final_phrase(p_phrase text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_team_id uuid;
  current_event_id uuid;
  current_team_status text;
  current_round_status text;
  current_phrase_hash text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_phrase is null or char_length(p_phrase) > 500
    or pg_catalog.cardinality(pg_catalog.regexp_split_to_array(btrim(p_phrase), '\s+')) <> 6 then return false; end if;
  select t.id, t.event_id, t.status into current_team_id, current_event_id, current_team_status
  from public.teams t where t.auth_user_id = auth.uid();
  if current_team_id is null or current_team_status not in ('approved', 'active') then
    raise exception 'No eligible team is linked to this account' using errcode = '42501';
  end if;
  select r.status into current_round_status
  from public.rounds r where r.event_id = current_event_id and r.round_number = 2
  for update;
  if current_round_status is null or current_round_status not in ('ready', 'running') then
    raise exception 'Round 2 is not accepting submissions' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.team_round2_phrase_progress p
    where p.event_id = current_event_id and p.team_id = current_team_id
  ) then return true; end if;
  if (select count(*) from public.team_round2_progress p
      where p.event_id = current_event_id and p.team_id = current_team_id and p.status = 'completed') <> 6 then
    raise exception 'Complete all six challenges before submitting the final phrase';
  end if;
  select s.phrase_hash into current_phrase_hash
  from private.round2_final_phrase_secrets s where s.event_id = current_event_id;
  if current_phrase_hash is null then raise exception 'Round 2 phrase is not configured'; end if;
  if extensions.crypt(pg_catalog.regexp_replace(btrim(p_phrase), '\s+', ' ', 'g'), current_phrase_hash) is distinct from current_phrase_hash then
    return false;
  end if;

  insert into public.team_round2_phrase_progress (event_id, team_id)
  values (current_event_id, current_team_id)
  on conflict (event_id, team_id) do nothing;
  -- Completing the phrase records only Round 2 progress; it never activates Round 3.
  return true;
end;
$$;

revoke all on function public.submit_round2_final_phrase(text) from public, anon;
grant execute on function public.submit_round2_final_phrase(text) to authenticated;
