-- Scope randomized challenge-order rows to the authenticated team's order.

create or replace function public.load_round3_challenges()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_team_id uuid; v_event_id uuid; team_state text; round_state text; rows jsonb; done_count integer; demo boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select t.id,t.event_id,t.status into v_team_id,v_event_id,team_state
  from public.teams t where t.auth_user_id=auth.uid();
  if v_team_id is null or team_state not in ('approved','active') then
    raise exception 'No eligible team is linked to this account' using errcode='42501';
  end if;
  select r.status into round_state from public.rounds r
  where r.event_id=v_event_id and r.round_number=3;
  if round_state is null or round_state not in ('ready','running','paused','ended') then
    raise exception 'Round 3 is not authorized by the organizer' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.round3_question_sets q
    where q.event_id=v_event_id and q.published_at is not null
  ) then raise exception 'Round 3 content is not published'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_team_id::text||v_event_id::text,0)
  );
  insert into private.team_round3_challenge_order(event_id,team_id,slot,display_order)
  select v_event_id,v_team_id,d.slot,
    row_number() over(order by extensions.gen_random_uuid())::smallint
  from public.round3_challenge_definitions d where d.event_id=v_event_id
  on conflict do nothing;

  insert into public.team_round3_progress(event_id,team_id,slot)
  select v_event_id,v_team_id,d.slot from public.round3_challenge_definitions d
  where d.event_id=v_event_id on conflict do nothing;

  select q.is_demo_only into demo from public.round3_question_sets q where q.event_id=v_event_id;
  select count(*) filter(where p.status='completed'),pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'slot',d.slot,'title',d.title,'description',d.description,'difficulty',d.difficulty,
      'encrypted_content',d.encrypted_content,'known_plaintext',d.known_plaintext,
      'clue',d.clue,'accepted_formats',d.accepted_formats,'display_order',o.display_order,
      'completed',p.status='completed','workspace',p.workspace,
      'fragment',case when p.status='completed' then s.code_fragment else null end,
      'victims',case when p.status='completed' then d.associated_victims else array[]::smallint[] end,
      'hints',coalesce((
        select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'index',u.hint_index,'text',s.hints->>(u.hint_index-1),
          'configured_deduction',u.configured_deduction
        ) order by u.hint_index)
        from private.team_round3_hint_usage u
        where u.event_id=d.event_id and u.team_id=v_team_id and u.slot=d.slot
      ),'[]'::jsonb),
      'hint_count',(
        select count(*) from private.team_round3_hint_usage u
        where u.event_id=d.event_id and u.team_id=v_team_id and u.slot=d.slot
      ),
      'hint_available_count',pg_catalog.jsonb_array_length(s.hints),
      'is_demo_only',demo
    ) order by o.display_order
  ) into done_count,rows
  from public.round3_challenge_definitions d
  join private.team_round3_challenge_order o
    on o.event_id=d.event_id and o.slot=d.slot and o.team_id=v_team_id
  join public.team_round3_progress p
    on p.event_id=d.event_id and p.team_id=v_team_id and p.slot=d.slot
  join private.round3_challenge_secrets s
    on s.event_id=d.event_id and s.slot=d.slot
  where d.event_id=v_event_id;

  return pg_catalog.jsonb_build_object(
    'round_status',round_state,'is_demo_only',demo,'final_code_available',done_count=3,
    'final_code_complete',exists(
      select 1 from public.team_round3_final_progress f
      where f.event_id=v_event_id and f.team_id=v_team_id
    ),
    'challenges',coalesce(rows,'[]'::jsonb)
  );
end $$;

revoke all on function public.load_round3_challenges() from public,anon;
grant execute on function public.load_round3_challenges() to authenticated;
