create table if not exists public.sharing_preference_notifications (
  user_id uuid not null references auth.users(id) on delete cascade,
  changed_user_id uuid not null references auth.users(id) on delete cascade,
  can_invite boolean not null,
  updated_at bigint not null default (
    floor(extract(epoch from clock_timestamp()) * 1000)
  ),
  primary key (user_id, changed_user_id),
  check (user_id <> changed_user_id)
);

alter table public.sharing_preference_notifications enable row level security;
revoke all on table public.sharing_preference_notifications from public;
revoke all on table public.sharing_preference_notifications from anon;
revoke all on table public.sharing_preference_notifications
  from authenticated;
grant select on table public.sharing_preference_notifications
  to authenticated;

drop policy if exists "Users can read sharing preference notifications"
  on public.sharing_preference_notifications;
create policy "Users can read sharing preference notifications"
  on public.sharing_preference_notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.notify_previous_players_of_invite_preference()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
    and old.allow_previous_players_to_invite
      is not distinct from new.allow_previous_players_to_invite then
    return new;
  end if;

  insert into public.sharing_preference_notifications (
    user_id,
    changed_user_id,
    can_invite,
    updated_at
  )
  select distinct
    history.owner_user_id,
    new.user_id,
    new.allow_previous_players_to_invite,
    new.updated_at
  from public.linked_player_history history
  where history.collaborator_user_id = new.user_id
    and history.owner_user_id <> new.user_id
  on conflict (user_id, changed_user_id) do update
  set can_invite = excluded.can_invite,
      updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists notify_previous_players_of_invite_preference
  on public.account_sharing_preferences;
create trigger notify_previous_players_of_invite_preference
after insert or update of allow_previous_players_to_invite
  on public.account_sharing_preferences
for each row
execute function public.notify_previous_players_of_invite_preference();

revoke all on function public.notify_previous_players_of_invite_preference()
  from public;
revoke all on function public.notify_previous_players_of_invite_preference()
  from anon;
revoke all on function public.notify_previous_players_of_invite_preference()
  from authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sharing_preference_notifications'
  ) then
    alter publication supabase_realtime
      add table public.sharing_preference_notifications;
  end if;
end;
$$;
