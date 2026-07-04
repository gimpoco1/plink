alter table public.teams
add column if not exists icon text not null default 'dumbbell';
