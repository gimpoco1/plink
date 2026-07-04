alter table public.games
add column if not exists teams jsonb not null default '[]'::jsonb;
