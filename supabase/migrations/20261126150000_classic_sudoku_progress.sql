-- ---------------------------------------------------------------------------
-- CLASSIC SUDOKU: TEAM PROGRESS
-- ---------------------------------------------------------------------------

create table public.team_sudoku_progress (
  id uuid primary key default extensions.gen_random_uuid(),

  team_id uuid not null
    references public.teams(id) on delete restrict,

  puzzle_type text not null default 'classic'
    check (puzzle_type = 'classic'),

  -- 81-character representation of the Sudoku board.
  -- 0 represents an empty cell.
  board text not null
    check (
      char_length(board) = 81
      and board !~ '[^0-9]'
    ),

  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint team_sudoku_progress_unique
    unique (team_id, puzzle_type)
);

create index team_sudoku_progress_team_idx
  on public.team_sudoku_progress(team_id);

-- Automatically maintain updated_at.
create trigger set_team_sudoku_progress_updated_at
before update on public.team_sudoku_progress
for each row
execute function public.set_updated_at();
-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

alter table public.team_sudoku_progress
enable row level security;

-- Teams can read only their own progress.
create policy team_sudoku_progress_select_own
on public.team_sudoku_progress
for select
to authenticated
using (
  team_id = (select public.my_team_id())
);

-- Teams can create progress only for their own team.
create policy team_sudoku_progress_insert_own
on public.team_sudoku_progress
for insert
to authenticated
with check (
  team_id = (select public.my_team_id())
  and status = 'in_progress'
);

-- Teams can update their own unfinished board only.
create policy team_sudoku_progress_update_own
on public.team_sudoku_progress
for update
to authenticated
using (
  team_id = (select public.my_team_id())
  and status = 'in_progress'
)
with check (
  team_id = (select public.my_team_id())
  and status = 'in_progress'
);

-- ---------------------------------------------------------------------------
-- TABLE PERMISSIONS
-- ---------------------------------------------------------------------------

revoke all on table public.team_sudoku_progress
from public, anon, authenticated;

grant select on table public.team_sudoku_progress
to authenticated;

grant insert (team_id, board)
on table public.team_sudoku_progress
to authenticated;

grant update (board)
on table public.team_sudoku_progress
to authenticated;
-- ---------------------------------------------------------------------------
-- PRIVATE SUDOKU PUZZLE STORAGE
-- ---------------------------------------------------------------------------

create schema if not exists private;

-- Block direct access from participant accounts.
revoke all on schema private from public, anon, authenticated;

create table private.sudoku_puzzle_definitions (
  puzzle_type text primary key
    check (puzzle_type = 'classic'),

  initial_grid text not null
    check (
      char_length(initial_grid) = 81
      and initial_grid !~ '[^0-9]'
    ),

  solution text not null
    check (
      char_length(solution) = 81
      and solution !~ '[^1-9]'
    ),

  created_at timestamptz not null default now()
);

-- Validate that the solution preserves all original clues.
create or replace function private.validate_classic_sudoku_definition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  cell integer;
begin
  for cell in 1..81 loop
    if pg_catalog.substr(new.initial_grid, cell, 1) <> '0'
       and pg_catalog.substr(new.initial_grid, cell, 1)
           <> pg_catalog.substr(new.solution, cell, 1) then
      raise exception 'Solution does not preserve the original puzzle clues';
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.validate_classic_sudoku_definition()
from public, anon, authenticated;

create trigger validate_classic_sudoku_definition
before insert or update on private.sudoku_puzzle_definitions
for each row
execute function private.validate_classic_sudoku_definition();

revoke all on table private.sudoku_puzzle_definitions
from public, anon, authenticated;
-- ---------------------------------------------------------------------------
-- PREVENT CHANGES TO ORIGINAL SUDOKU CLUES
-- ---------------------------------------------------------------------------

create or replace function private.enforce_classic_sudoku_givens()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  original_grid text;
  cell integer;
begin
  select d.initial_grid
  into original_grid
  from private.sudoku_puzzle_definitions d
  where d.puzzle_type = new.puzzle_type;

  if original_grid is null then
    raise exception 'Sudoku puzzle definition not found';
  end if;

  for cell in 1..81 loop
    if pg_catalog.substr(original_grid, cell, 1) <> '0'
       and pg_catalog.substr(new.board, cell, 1)
           <> pg_catalog.substr(original_grid, cell, 1) then
      raise exception 'Original Sudoku clues cannot be changed';
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.enforce_classic_sudoku_givens()
from public, anon, authenticated;

create trigger enforce_classic_sudoku_givens
before insert or update of board
on public.team_sudoku_progress
for each row
execute function private.enforce_classic_sudoku_givens();
-- ---------------------------------------------------------------------------
-- SECURE CLASSIC SUDOKU COMPLETION
-- ---------------------------------------------------------------------------

create or replace function public.complete_classic_sudoku()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_team_id uuid;
  saved_board text;
  correct_solution text;
  current_status text;
begin
  -- Identify the signed-in team.
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  current_team_id := public.my_team_id();

  if current_team_id is null then
    raise exception 'No team is linked to this account';
  end if;

  -- Read the team's saved progress.
  select p.board, p.status
  into saved_board, current_status
  from public.team_sudoku_progress p
  where p.team_id = current_team_id
    and p.puzzle_type = 'classic'
  for update;

  if not found then
    raise exception 'No saved Sudoku progress found';
  end if;

  if current_status = 'completed' then
    return true;
  end if;

  -- Read the protected solution.
  select d.solution
  into correct_solution
  from private.sudoku_puzzle_definitions d
  where d.puzzle_type = 'classic';

  if correct_solution is null then
    raise exception 'Sudoku solution is not configured';
  end if;

  -- Compare the saved board with the protected solution.
  if saved_board <> correct_solution then
    return false;
  end if;

  -- Mark completion on the server.
  update public.team_sudoku_progress
  set
    status = 'completed',
    updated_at = pg_catalog.now()
  where team_id = current_team_id
    and puzzle_type = 'classic';

  return true;
end;
$$;

revoke all on function public.complete_classic_sudoku()
from public, anon;

grant execute on function public.complete_classic_sudoku()
to authenticated;
-- ---------------------------------------------------------------------------
-- LOAD OR INITIALIZE CLASSIC SUDOKU
-- ---------------------------------------------------------------------------

create or replace function public.load_classic_sudoku()
returns table (
  initial_grid text,
  board text,
  progress_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  current_team_id := public.my_team_id();

  if current_team_id is null then
    raise exception 'No team is linked to this account';
  end if;

  insert into public.team_sudoku_progress (
    team_id,
    puzzle_type,
    board
  )
  select
    current_team_id,
    d.puzzle_type,
    d.initial_grid
  from private.sudoku_puzzle_definitions d
  where d.puzzle_type = 'classic'
  on conflict (team_id, puzzle_type) do nothing;

  return query
  select
    d.initial_grid,
    p.board,
    p.status
  from private.sudoku_puzzle_definitions d
  join public.team_sudoku_progress p
    on p.team_id = current_team_id
   and p.puzzle_type = d.puzzle_type
  where d.puzzle_type = 'classic';
end;
$$;

revoke all on function public.load_classic_sudoku()
from public, anon;

grant execute on function public.load_classic_sudoku()
to authenticated;
-- ---------------------------------------------------------------------------
-- CLASSIC SUDOKU PUZZLE DATA
-- ---------------------------------------------------------------------------

insert into private.sudoku_puzzle_definitions (
  puzzle_type,
  initial_grid,
  solution
)
values (
  'classic',
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
)
on conflict (puzzle_type) do nothing;