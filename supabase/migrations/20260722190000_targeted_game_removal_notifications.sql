create table if not exists public.game_removal_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  game_name text not null,
  created_at bigint not null default floor(extract(epoch from clock_timestamp()) * 1000)
);

create index if not exists game_removal_notifications_user_id_idx
  on public.game_removal_notifications(user_id, created_at);

alter table public.game_removal_notifications enable row level security;

drop policy if exists "Users can read their game removal notifications"
  on public.game_removal_notifications;
create policy "Users can read their game removal notifications"
  on public.game_removal_notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can dismiss their game removal notifications"
  on public.game_removal_notifications;
create policy "Users can dismiss their game removal notifications"
  on public.game_removal_notifications
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.notify_game_collaborator_removal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game_name text;
begin
  select name into v_game_name
  from public.games
  where id = old.game_id;

  if v_game_name is not null then
    insert into public.game_removal_notifications (
      user_id,
      game_id,
      game_name
    ) values (
      old.user_id,
      old.game_id,
      v_game_name
    );
  end if;

  return old;
end;
$$;

drop trigger if exists notify_game_collaborator_removal
  on public.game_collaborators;
create trigger notify_game_collaborator_removal
before delete on public.game_collaborators
for each row execute function public.notify_game_collaborator_removal();

create or replace function public.clear_game_removal_notification_on_join()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.game_removal_notifications
  where user_id = new.user_id
    and game_id = new.game_id;
  return new;
end;
$$;

drop trigger if exists clear_game_removal_notification_on_join
  on public.game_collaborators;
create trigger clear_game_removal_notification_on_join
after insert on public.game_collaborators
for each row execute function public.clear_game_removal_notification_on_join();

revoke all on function public.notify_game_collaborator_removal() from public;
revoke all on function public.notify_game_collaborator_removal() from anon;
revoke all on function public.notify_game_collaborator_removal() from authenticated;
revoke all on function public.clear_game_removal_notification_on_join() from public;
revoke all on function public.clear_game_removal_notification_on_join() from anon;
revoke all on function public.clear_game_removal_notification_on_join() from authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_removal_notifications'
  ) then
    alter publication supabase_realtime
      add table public.game_removal_notifications;
  end if;
end;
$$;
