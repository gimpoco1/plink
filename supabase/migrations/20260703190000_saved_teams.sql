alter table public.games
add column if not exists participant_mode text not null default 'players';

create table if not exists public.teams (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at bigint not null,
  updated_at bigint not null
);

create table if not exists public.team_members (
  team_id text not null references public.teams(id) on delete cascade,
  profile_id text not null references public.player_profiles(id) on delete cascade,
  created_at bigint not null,
  primary key (team_id, profile_id)
);

create index if not exists teams_user_id_idx on public.teams(user_id);
create index if not exists team_members_profile_id_idx on public.team_members(profile_id);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists "Users manage own teams" on public.teams;
create policy "Users manage own teams"
on public.teams
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own team members" on public.team_members;
create policy "Users manage own team members"
on public.team_members
for all
to authenticated
using (
  exists (
    select 1
    from public.teams
    where teams.id = team_members.team_id
      and teams.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.teams
    where teams.id = team_members.team_id
      and teams.user_id = auth.uid()
  )
);
