create table if not exists public.game_join_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  game_name text not null,
  player_name text not null,
  created_at bigint not null default floor(extract(epoch from clock_timestamp()) * 1000)
);

create index if not exists game_join_notifications_user_id_idx
  on public.game_join_notifications(user_id, created_at);

alter table public.game_join_notifications enable row level security;

drop policy if exists "Users can read their game join notifications"
  on public.game_join_notifications;
create policy "Users can read their game join notifications"
  on public.game_join_notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can dismiss their game join notifications"
  on public.game_join_notifications;
create policy "Users can dismiss their game join notifications"
  on public.game_join_notifications
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.notify_game_owner_on_collaborator_join()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner_id uuid;
  v_game_name text;
  v_player_name text;
begin
  select user_id, name
  into v_owner_id, v_game_name
  from public.games
  where id = new.game_id;

  select name
  into v_player_name
  from public.player_profiles
  where user_id = new.user_id
    and is_account_player = true
  order by updated_at desc
  limit 1;

  if v_owner_id is not null
    and v_game_name is not null
    and v_player_name is not null then
    insert into public.game_join_notifications (
      user_id,
      game_id,
      game_name,
      player_name
    ) values (
      v_owner_id,
      new.game_id,
      v_game_name,
      v_player_name
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notify_game_owner_on_collaborator_join
  on public.game_collaborators;
create trigger notify_game_owner_on_collaborator_join
after insert on public.game_collaborators
for each row execute function public.notify_game_owner_on_collaborator_join();

revoke all on function public.notify_game_owner_on_collaborator_join()
  from public;
revoke all on function public.notify_game_owner_on_collaborator_join()
  from anon;
revoke all on function public.notify_game_owner_on_collaborator_join()
  from authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_join_notifications'
  ) then
    alter publication supabase_realtime
      add table public.game_join_notifications;
  end if;
end;
$$;
