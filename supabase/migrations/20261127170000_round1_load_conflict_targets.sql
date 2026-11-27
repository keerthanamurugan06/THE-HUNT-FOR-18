-- Fix PL/pgSQL ambiguity between the RETURNS TABLE output variable
-- `puzzle_type` and unqualified ON CONFLICT column targets in the loader.

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
  select current_team_id, definition.puzzle_type,
    row_number() over (order by extensions.gen_random_uuid())::integer
  from private.sudoku_puzzle_definitions as definition
  on conflict on constraint team_round1_puzzle_order_pkey do nothing;

  insert into public.team_sudoku_progress (team_id, puzzle_type, board)
  select current_team_id, definition.puzzle_type, definition.initial_grid
  from private.sudoku_puzzle_definitions as definition
  on conflict on constraint team_sudoku_progress_unique do nothing;

  insert into public.team_round1_evidence_unlocks (team_id, puzzle_type, victim_number)
  select current_team_id, progress.puzzle_type,
    case progress.puzzle_type
      when 'classic' then 1 when 'jigsaw' then 2 when 'windoku' then 3
      when 'anti_knight' then 4 when 'anti_king' then 5 when 'diagonal' then 6
    end
  from public.team_sudoku_progress as progress
  where progress.team_id = current_team_id and progress.status = 'completed'
  on conflict on constraint team_round1_evidence_unlocks_pkey do nothing;

  return query
  select definition.puzzle_type, definition.initial_grid, progress.board, progress.status,
    definition.demo_only, definition.jigsaw_regions, puzzle_order.display_order,
    exists (
      select 1 from public.team_round1_evidence_unlocks as unlocked
      where unlocked.team_id = current_team_id
        and unlocked.puzzle_type = definition.puzzle_type
    )
  from private.sudoku_puzzle_definitions as definition
  join public.team_sudoku_progress as progress
    on progress.team_id = current_team_id and progress.puzzle_type = definition.puzzle_type
  join private.team_round1_puzzle_order as puzzle_order
    on puzzle_order.team_id = current_team_id and puzzle_order.puzzle_type = definition.puzzle_type
  order by puzzle_order.display_order;
end;
$$;
