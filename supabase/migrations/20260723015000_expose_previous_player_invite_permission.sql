drop function if exists public.list_past_linked_players(text);

create function public.list_past_linked_players(p_game_id text)
returns table (
  collaborator_user_id uuid,
  profile_id text,
  player_name text,
  avatar_color text,
  last_linked_at bigint,
  can_invite boolean
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to view linked players.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.games game
    where game.id = p_game_id
      and game.user_id = auth.uid()
      and game.participant_mode <> 'teams'
  ) then
    raise exception 'Only the game owner can view past linked players.'
      using errcode = '42501';
  end if;

  return query
  select
    history.collaborator_user_id,
    profile.id,
    profile.name,
    profile.avatar_color,
    history.last_linked_at,
    coalesce(preferences.allow_previous_players_to_invite, true)
  from public.linked_player_history history
  join lateral (
    select account_profile.*
    from public.player_profiles account_profile
    where account_profile.user_id = history.collaborator_user_id
      and account_profile.is_account_player = true
    order by account_profile.updated_at desc
    limit 1
  ) profile on true
  left join public.account_sharing_preferences preferences
    on preferences.user_id = history.collaborator_user_id
  where history.owner_user_id = auth.uid()
    and not exists (
      select 1
      from public.game_collaborators collaborator
      where collaborator.game_id = p_game_id
        and collaborator.user_id = history.collaborator_user_id
    )
  order by history.last_linked_at desc, profile.name asc;
end;
$$;

revoke all on function public.list_past_linked_players(text) from public;
revoke all on function public.list_past_linked_players(text) from anon;
grant execute on function public.list_past_linked_players(text)
  to authenticated;

drop function if exists public.list_past_invited_players();

create function public.list_past_invited_players()
returns table (
  collaborator_user_id uuid,
  profile_id text,
  player_name text,
  avatar_color text,
  last_linked_at bigint,
  can_invite boolean
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to view invited players.'
      using errcode = '42501';
  end if;

  return query
  select
    history.collaborator_user_id,
    profile.id,
    profile.name,
    profile.avatar_color,
    history.last_linked_at,
    coalesce(preferences.allow_previous_players_to_invite, true)
  from public.linked_player_history history
  join lateral (
    select account_profile.*
    from public.player_profiles account_profile
    where account_profile.user_id = history.collaborator_user_id
      and account_profile.is_account_player = true
    order by account_profile.updated_at desc
    limit 1
  ) profile on true
  left join public.account_sharing_preferences preferences
    on preferences.user_id = history.collaborator_user_id
  where history.owner_user_id = auth.uid()
  order by history.last_linked_at desc, profile.name asc;
end;
$$;

revoke all on function public.list_past_invited_players() from public;
revoke all on function public.list_past_invited_players() from anon;
grant execute on function public.list_past_invited_players()
  to authenticated;
