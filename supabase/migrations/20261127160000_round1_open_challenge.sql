-- Round 1 Open Challenge: additive multi-variant support.
-- This migration preserves existing definitions and team progress.

alter table public.team_sudoku_progress
  drop constraint team_sudoku_progress_puzzle_type_check;
alter table public.team_sudoku_progress
  add constraint team_sudoku_progress_puzzle_type_check
  check (puzzle_type in ('classic', 'jigsaw', 'windoku', 'anti_knight', 'anti_king', 'diagonal'));

alter table private.sudoku_puzzle_definitions
  drop constraint sudoku_puzzle_definitions_puzzle_type_check;
alter table private.sudoku_puzzle_definitions
  add constraint sudoku_puzzle_definitions_puzzle_type_check
  check (puzzle_type in ('classic', 'jigsaw', 'windoku', 'anti_knight', 'anti_king', 'diagonal'));

alter table private.sudoku_puzzle_definitions
  add column display_name text,
  add column demo_only boolean not null default false,
  add column jigsaw_regions integer[];

update private.sudoku_puzzle_definitions
set display_name = 'Classic Sudoku'
where puzzle_type = 'classic' and display_name is null;

update private.sudoku_puzzle_definitions
set demo_only = true
where puzzle_type in ('classic', 'jigsaw', 'windoku', 'anti_knight', 'anti_king', 'diagonal');

create or replace function private.is_valid_jigsaw_regions(p_regions integer[])
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  region_id integer;
  start_cell integer;
  cell integer;
  candidate integer;
  queue integer[];
  reached integer[];
  queue_index integer;
begin
  if p_regions is null or pg_catalog.cardinality(p_regions) <> 81
    or pg_catalog.array_lower(p_regions, 1) <> 1 or pg_catalog.array_upper(p_regions, 1) <> 81 then return false; end if;
  if pg_catalog.array_position(p_regions, null) is not null then return false; end if;
  if exists (select 1 from pg_catalog.unnest(p_regions) as r where r < 0 or r > 8) then return false; end if;

  for region_id in 0..8 loop
    if (select count(*) from pg_catalog.unnest(p_regions) as r where r = region_id) <> 9 then return false; end if;
    select pg_catalog.min(i)::integer into start_cell
    from pg_catalog.generate_series(1, 81) as i
    where p_regions[i] = region_id;
    queue := array[start_cell];
    reached := array[start_cell];
    queue_index := 1;
    while queue_index <= pg_catalog.cardinality(queue) loop
      cell := queue[queue_index];
      for candidate in 1..81 loop
        if p_regions[candidate] = region_id
          and not (candidate = any(reached))
          and (pg_catalog.abs(((candidate - 1) / 9) - ((cell - 1) / 9))
            + pg_catalog.abs(((candidate - 1) % 9) - ((cell - 1) % 9))) = 1 then
          queue := pg_catalog.array_append(queue, candidate);
          reached := pg_catalog.array_append(reached, candidate);
        end if;
      end loop;
      queue_index := queue_index + 1;
    end loop;
    if pg_catalog.cardinality(reached) <> 9 then return false; end if;
  end loop;
  return true;
end;
$$;
revoke all on function private.is_valid_jigsaw_regions(integer[]) from public, anon, authenticated;

alter table private.sudoku_puzzle_definitions
  add constraint sudoku_puzzle_display_name_nonempty
    check (display_name is not null and char_length(display_name) between 1 and 80),
  add constraint sudoku_jigsaw_regions_valid
    check (
      (puzzle_type = 'jigsaw' and private.is_valid_jigsaw_regions(jigsaw_regions))
      or (puzzle_type <> 'jigsaw' and jigsaw_regions is null)
    );

-- Stable randomized display order is generated once per team and retained.
create table private.team_round1_puzzle_order (
  team_id uuid not null references public.teams(id) on delete restrict,
  puzzle_type text not null check (puzzle_type in ('classic', 'jigsaw', 'windoku', 'anti_knight', 'anti_king', 'diagonal')),
  display_order integer not null check (display_order between 1 and 6),
  created_at timestamptz not null default pg_catalog.now(),
  primary key (team_id, puzzle_type),
  unique (team_id, display_order)
);
revoke all on table private.team_round1_puzzle_order from public, anon, authenticated;

-- The unlock row is a per-team/per-puzzle completion signal; narrative content
-- remains unconfigured and is intentionally not invented here.
create table public.team_round1_evidence_unlocks (
  team_id uuid not null references public.teams(id) on delete restrict,
  puzzle_type text not null check (puzzle_type in ('classic', 'jigsaw', 'windoku', 'anti_knight', 'anti_king', 'diagonal')),
  victim_number integer not null check (victim_number between 1 and 6),
  placeholder_only boolean not null default true,
  unlocked_at timestamptz not null default pg_catalog.now(),
  primary key (team_id, puzzle_type),
  unique (team_id, victim_number),
  foreign key (team_id, puzzle_type)
    references public.team_sudoku_progress(team_id, puzzle_type) on delete restrict
);
alter table public.team_round1_evidence_unlocks enable row level security;
create policy team_round1_evidence_unlocks_select_own
  on public.team_round1_evidence_unlocks for select to authenticated
  using (team_id = (select public.my_team_id()));
revoke all on table public.team_round1_evidence_unlocks from public, anon, authenticated;
grant select on table public.team_round1_evidence_unlocks to authenticated;

create or replace function public.load_round1_sudokus()
returns table (
  puzzle_type text,
  initial_grid text,
  board text,
  progress_status text,
  demo_only boolean,
  jigsaw_regions integer[],
  display_order integer,
  evidence_unlocked boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  current_team_id := public.my_team_id();
  if current_team_id is null then
    raise exception 'No team is linked to this account' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_team_id::text, 0));

  if (select count(*) from private.sudoku_puzzle_definitions) <> 6 then
    raise exception 'Round 1 puzzle set is not configured';
  end if;

  insert into private.team_round1_puzzle_order (team_id, puzzle_type, display_order)
  select current_team_id, p.puzzle_type, row_number() over (order by extensions.gen_random_uuid())::integer
  from private.sudoku_puzzle_definitions p
  on conflict (team_id, puzzle_type) do nothing;

  insert into public.team_sudoku_progress (team_id, puzzle_type, board)
  select current_team_id, p.puzzle_type, p.initial_grid
  from private.sudoku_puzzle_definitions p
  on conflict (team_id, puzzle_type) do nothing;

  insert into public.team_round1_evidence_unlocks (team_id, puzzle_type, victim_number)
  select current_team_id, p.puzzle_type,
    case p.puzzle_type
      when 'classic' then 1 when 'jigsaw' then 2 when 'windoku' then 3
      when 'anti_knight' then 4 when 'anti_king' then 5 when 'diagonal' then 6
    end
  from public.team_sudoku_progress p
  where p.team_id = current_team_id and p.status = 'completed'
  on conflict (team_id, puzzle_type) do nothing;

  return query
  select d.puzzle_type, d.initial_grid, p.board, p.status, d.demo_only, d.jigsaw_regions, o.display_order,
    exists (select 1 from public.team_round1_evidence_unlocks e where e.team_id = current_team_id and e.puzzle_type = d.puzzle_type)
  from private.sudoku_puzzle_definitions d
  join public.team_sudoku_progress p on p.team_id = current_team_id and p.puzzle_type = d.puzzle_type
  join private.team_round1_puzzle_order o on o.team_id = current_team_id and o.puzzle_type = d.puzzle_type
  order by o.display_order;
end;
$$;
revoke all on function public.load_round1_sudokus() from public, anon;
grant execute on function public.load_round1_sudokus() to authenticated;

create function public.complete_round1_sudoku(p_puzzle_type text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_team_id uuid;
  saved_board text;
  correct_solution text;
  current_status text;
  victim_id integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  current_team_id := public.my_team_id();
  if current_team_id is null then
    raise exception 'No team is linked to this account' using errcode = '42501';
  end if;
  if p_puzzle_type is null or p_puzzle_type not in ('classic', 'jigsaw', 'windoku', 'anti_knight', 'anti_king', 'diagonal') then
    raise exception 'Unknown Round 1 puzzle';
  end if;

  select p.board, p.status into saved_board, current_status
  from public.team_sudoku_progress p
  where p.team_id = current_team_id and p.puzzle_type = p_puzzle_type
  for update;
  if not found then raise exception 'No saved Sudoku progress found'; end if;
  if current_status = 'completed' then
    select e.victim_number into victim_id from public.team_round1_evidence_unlocks e
    where e.team_id = current_team_id and e.puzzle_type = p_puzzle_type;
    if victim_id is null then
      victim_id := case p_puzzle_type
        when 'classic' then 1 when 'jigsaw' then 2 when 'windoku' then 3
        when 'anti_knight' then 4 when 'anti_king' then 5 when 'diagonal' then 6
      end;
      insert into public.team_round1_evidence_unlocks (team_id, puzzle_type, victim_number)
      values (current_team_id, p_puzzle_type, victim_id)
      on conflict (team_id, puzzle_type) do nothing;
    end if;
    return victim_id;
  end if;

  select d.solution into correct_solution
  from private.sudoku_puzzle_definitions d where d.puzzle_type = p_puzzle_type;
  if correct_solution is null then raise exception 'Sudoku puzzle is not configured'; end if;
  if saved_board <> correct_solution then return null; end if;

  victim_id := case p_puzzle_type
    when 'classic' then 1 when 'jigsaw' then 2 when 'windoku' then 3
    when 'anti_knight' then 4 when 'anti_king' then 5 when 'diagonal' then 6
  end;

  update public.team_sudoku_progress
  set status = 'completed', updated_at = pg_catalog.now()
  where team_id = current_team_id and puzzle_type = p_puzzle_type;
  insert into public.team_round1_evidence_unlocks (team_id, puzzle_type, victim_number)
  values (current_team_id, p_puzzle_type, victim_id)
  on conflict (team_id, puzzle_type) do nothing;
  return victim_id;
end;
$$;
revoke all on function public.complete_round1_sudoku(text) from public, anon;
grant execute on function public.complete_round1_sudoku(text) to authenticated;

-- Keep legacy Classic callers on the same atomic evidence-unlock path.
create or replace function public.complete_classic_sudoku()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  unlocked_victim integer;
begin
  unlocked_victim := public.complete_round1_sudoku('classic');
  return unlocked_victim is not null;
end;
$$;
revoke all on function public.complete_classic_sudoku() from public, anon;
grant execute on function public.complete_classic_sudoku() to authenticated;

-- Verified temporary demonstration puzzle candidates. Existing definitions are preserved.
insert into private.sudoku_puzzle_definitions (puzzle_type, initial_grid, solution, display_name, demo_only, jigsaw_regions)
values
  ('classic', '000000300010360408300070001530180070120090005008050030400630000000800204060049000', '689421357217365498345978621534186972126793845798254136471632589953817264862549713', 'Classic Sudoku', true, null),
  ('jigsaw', '030000902600000308090000060850701403400003701700020050000530004200009000000206170', '534678912672195348198342567859761423426853791713924856961537284287419635345286179', 'Jigsaw Sudoku', true, array[0,0,0,1,1,1,2,2,2,0,0,0,1,1,2,2,2,2,0,0,0,1,1,1,1,2,2,3,3,3,4,4,4,5,5,5,3,3,3,4,4,4,5,5,5,3,3,3,4,4,4,5,5,5,6,6,6,7,7,7,8,8,8,6,6,6,7,7,7,8,8,8,6,6,6,7,7,7,8,8,8]::integer[]),
  ('windoku', '003000067009800300000304910000100076020050000000003020700000541915007002000500739', '483915267179826354562374918354192876621758493897643125738269541915437682246581739', 'Windoku', true, null),
  ('anti_knight', '100702609040803005072000000027450090000000800600009340064500000000000768000960020', '153742689946813275872695413327458196491326857685179342264587931519234768738961524', 'Anti-Knight Sudoku', true, null),
  ('anti_king', '203000004709030001860049073000087006000900007970024000634805000080010009000000000', '253761984749538621861249573425387196318956247976124358634895712587612439192473865', 'Anti-King Sudoku', true, null),
  ('diagonal', '730002106008031000010000000300000420201049050500728013905000000003006000040000201', '739452186658931742412867935387615429261349857594728613925174368173286594846593271', 'Diagonal Sudoku (X-Sudoku)', true, null)
on conflict (puzzle_type) do nothing;

