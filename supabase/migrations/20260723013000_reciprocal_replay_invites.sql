create table if not exists public.account_sharing_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  allow_previous_players_to_invite boolean not null default true,
  updated_at bigint not null default (
    floor(extract(epoch from clock_timestamp()) * 1000)
  )
);

alter table public.account_sharing_preferences enable row level security;
revoke all on table public.account_sharing_preferences from public;
revoke all on table public.account_sharing_preferences from anon;
revoke all on table public.account_sharing_preferences from authenticated;

create or replace function public.get_my_sharing_preferences()
returns table (
  allow_previous_players_to_invite boolean
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select preferences.allow_previous_players_to_invite
      from public.account_sharing_preferences preferences
      where preferences.user_id = auth.uid()
    ),
    true
  );
$$;

revoke all on function public.get_my_sharing_preferences() from public;
revoke all on function public.get_my_sharing_preferences() from anon;
grant execute on function public.get_my_sharing_preferences()
  to authenticated;

create or replace function public.set_allow_previous_players_to_invite(
  p_allow boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to update sharing preferences.'
      using errcode = '42501';
  end if;

  insert into public.account_sharing_preferences (
    user_id,
    allow_previous_players_to_invite,
    updated_at
  ) values (
    auth.uid(),
    coalesce(p_allow, true),
    floor(extract(epoch from clock_timestamp()) * 1000)
  )
  on conflict (user_id) do update
  set allow_previous_players_to_invite =
        excluded.allow_previous_players_to_invite,
      updated_at = excluded.updated_at;

  return coalesce(p_allow, true);
end;
$$;

revoke all on function public.set_allow_previous_players_to_invite(boolean)
  from public;
revoke all on function public.set_allow_previous_players_to_invite(boolean)
  from anon;
grant execute on function public.set_allow_previous_players_to_invite(boolean)
  to authenticated;

create or replace function public.prevent_blocked_automatic_game_addition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_allows_invites boolean;
begin
  if current_setting('plink.owner_added_collaborator', true) <> 'true' then
    return new;
  end if;

  select coalesce(
    (
      select preferences.allow_previous_players_to_invite
      from public.account_sharing_preferences preferences
      where preferences.user_id = new.user_id
    ),
    true
  )
  into v_allows_invites;

  if not v_allows_invites then
    raise exception
      'That account does not allow previous players to add them to games.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_blocked_automatic_game_addition
  on public.game_collaborators;
create trigger prevent_blocked_automatic_game_addition
before insert on public.game_collaborators
for each row execute function public.prevent_blocked_automatic_game_addition();

revoke all on function public.prevent_blocked_automatic_game_addition()
  from public;
revoke all on function public.prevent_blocked_automatic_game_addition()
  from anon;
revoke all on function public.prevent_blocked_automatic_game_addition()
  from authenticated;

create or replace function public.list_replay_invite_candidates(
  p_game_id text
)
returns table (
  candidate_user_id uuid,
  source_player_id text,
  profile_id text,
  player_name text,
  avatar_color text,
  is_previous_owner boolean,
  can_invite boolean
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to view replay players.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.games game
    where game.id = p_game_id
      and (
        game.user_id = auth.uid()
        or exists (
          select 1
          from public.game_collaborators collaborator
          where collaborator.game_id = game.id
            and collaborator.user_id = auth.uid()
        )
      )
  ) then
    raise exception 'You do not have access to that game.'
      using errcode = '42501';
  end if;

  return query
  with source_game as (
    select game.*
    from public.games game
    where game.id = p_game_id
  ),
  connected_accounts as (
    select
      game.user_id as user_id,
      player ->> 'id' as player_id,
      true as previous_owner
    from source_game game
    cross join lateral jsonb_array_elements(
      coalesce(game.players, '[]'::jsonb)
    ) player
    where coalesce((player ->> 'isGameOwner')::boolean, false)

    union all

    select
      collaborator.user_id,
      collaborator.player_id,
      false
    from public.game_collaborators collaborator
    where collaborator.game_id = p_game_id
  )
  select distinct on (connected.user_id)
    connected.user_id,
    connected.player_id,
    profile.id,
    profile.name,
    profile.avatar_color,
    connected.previous_owner,
    coalesce(preferences.allow_previous_players_to_invite, true)
  from connected_accounts connected
  join lateral (
    select account_profile.*
    from public.player_profiles account_profile
    where account_profile.user_id = connected.user_id
      and account_profile.is_account_player = true
    order by account_profile.updated_at desc
    limit 1
  ) profile on true
  left join public.account_sharing_preferences preferences
    on preferences.user_id = connected.user_id
  where connected.user_id <> auth.uid()
  order by
    connected.user_id,
    connected.previous_owner desc,
    profile.updated_at desc;
end;
$$;

revoke all on function public.list_replay_invite_candidates(text)
  from public;
revoke all on function public.list_replay_invite_candidates(text)
  from anon;
grant execute on function public.list_replay_invite_candidates(text)
  to authenticated;

create or replace function public.replay_shared_game(
  p_game_id text,
  p_new_game_id text,
  p_name text,
  p_invited_user_ids uuid[]
)
returns public.games
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_source_game public.games%rowtype;
  v_new_game public.games%rowtype;
  v_source_player jsonb;
  v_new_player jsonb;
  v_players jsonb := '[]'::jsonb;
  v_player_id_map jsonb := '{}'::jsonb;
  v_source_collaborator record;
  v_candidate_user_id uuid;
  v_candidate_profile public.player_profiles%rowtype;
  v_new_player_id text;
  v_name text;
  v_now bigint;
  v_has_collaborators boolean := false;
  v_should_invite boolean;
begin
  if auth.uid() is null then
    raise exception 'Sign in to play again.' using errcode = '42501';
  end if;

  v_name := upper(left(trim(coalesce(p_name, '')), 28));
  if trim(coalesce(p_new_game_id, '')) = '' or v_name = '' then
    raise exception 'The new game details are incomplete.'
      using errcode = '22023';
  end if;

  select *
  into v_source_game
  from public.games game
  where game.id = p_game_id
    and (
      game.user_id = auth.uid()
      or exists (
        select 1
        from public.game_collaborators collaborator
        where collaborator.game_id = game.id
          and collaborator.user_id = auth.uid()
      )
    )
  for update;

  if not found then
    raise exception 'You do not have access to that shared game.'
      using errcode = '42501';
  end if;

  if not v_source_game.is_shared then
    raise exception 'This game is not shared.' using errcode = '22023';
  end if;

  if v_source_game.participant_mode = 'teams' then
    raise exception
      'Connected players are currently available for player games only.'
      using errcode = '22023';
  end if;

  if exists (select 1 from public.games where id = p_new_game_id) then
    raise exception 'That new game already exists.' using errcode = '23505';
  end if;

  v_now := greatest(
    floor(extract(epoch from clock_timestamp()) * 1000),
    v_source_game.updated_at + 1
  );

  for v_source_player in
    select player
    from jsonb_array_elements(coalesce(v_source_game.players, '[]'::jsonb))
      with ordinality as entries(player, position)
    order by position
  loop
    v_candidate_user_id := null;
    v_candidate_profile := null;
    v_should_invite := false;
    v_new_player_id := gen_random_uuid()::text;

    if coalesce((v_source_player ->> 'isGameOwner')::boolean, false) then
      v_candidate_user_id := v_source_game.user_id;
    else
      select collaborator.user_id
      into v_candidate_user_id
      from public.game_collaborators collaborator
      where collaborator.game_id = p_game_id
        and collaborator.player_id = v_source_player ->> 'id'
      limit 1;
    end if;

    if v_candidate_user_id is not null then
      select *
      into v_candidate_profile
      from public.player_profiles profile
      where profile.user_id = v_candidate_user_id
        and profile.is_account_player = true
      order by profile.updated_at desc
      limit 1;
    end if;

    if v_candidate_user_id is not null
      and v_candidate_user_id <> auth.uid()
      and v_candidate_user_id = any(
        coalesce(p_invited_user_ids, array[]::uuid[])
      )
      and coalesce(
        (
          select preferences.allow_previous_players_to_invite
          from public.account_sharing_preferences preferences
          where preferences.user_id = v_candidate_user_id
        ),
        true
      ) then
      v_should_invite := true;
      v_has_collaborators := true;
    end if;

    v_new_player := (
      v_source_player
      - 'joinedViaInvite'
      - 'isGameOwner'
    ) || jsonb_build_object(
      'id', v_new_player_id,
      'score', v_source_game.starting_score,
      'createdAt', v_now,
      'reachedAt', v_now
    );

    if v_candidate_user_id = auth.uid()
      or exists (
        select 1
        from public.player_profiles profile
        where profile.user_id = auth.uid()
          and profile.id = v_source_player ->> 'profileId'
      ) then
      if v_candidate_profile.id is not null
        and v_candidate_user_id = auth.uid() then
        v_new_player := v_new_player || jsonb_build_object(
          'name', v_candidate_profile.name,
          'avatarColor', v_candidate_profile.avatar_color,
          'profileId', v_candidate_profile.id
        );
      end if;
    elsif v_should_invite and v_candidate_profile.id is not null then
      v_new_player := v_new_player || jsonb_build_object(
        'name', v_candidate_profile.name,
        'avatarColor', v_candidate_profile.avatar_color,
        'profileId', v_candidate_profile.id,
        'joinedViaInvite', true
      );
    else
      v_new_player := v_new_player - 'profileId';
    end if;

    v_player_id_map := v_player_id_map || jsonb_build_object(
      v_source_player ->> 'id',
      v_new_player_id
    );
    v_players := v_players || jsonb_build_array(v_new_player);
  end loop;

  v_new_game := v_source_game;
  v_new_game.id := p_new_game_id;
  v_new_game.user_id := auth.uid();
  v_new_game.name := v_name;
  v_new_game.is_shared := v_has_collaborators;
  v_new_game.collaborators_can_manage := false;
  v_new_game.players := v_players;
  v_new_game.score_history := '[]'::jsonb;
  v_new_game.completion_mode := null;
  v_new_game.created_at := v_now;
  v_new_game.updated_at := v_now;
  v_new_game.ended_at := null;

  insert into public.games
  select (v_new_game).*
  returning * into v_new_game;

  perform set_config('plink.owner_added_collaborator', 'true', true);
  for v_source_collaborator in
    select
      connected.user_id,
      connected.player_id
    from (
      select
        v_source_game.user_id as user_id,
        player ->> 'id' as player_id
      from jsonb_array_elements(
        coalesce(v_source_game.players, '[]'::jsonb)
      ) player
      where coalesce((player ->> 'isGameOwner')::boolean, false)

      union all

      select collaborator.user_id, collaborator.player_id
      from public.game_collaborators collaborator
      where collaborator.game_id = p_game_id
    ) connected
    where connected.user_id <> auth.uid()
      and connected.user_id = any(
        coalesce(p_invited_user_ids, array[]::uuid[])
      )
      and coalesce(
        (
          select preferences.allow_previous_players_to_invite
          from public.account_sharing_preferences preferences
          where preferences.user_id = connected.user_id
        ),
        true
      )
  loop
    v_new_player_id := v_player_id_map ->> v_source_collaborator.player_id;
    if v_new_player_id is null then
      continue;
    end if;

    insert into public.game_collaborators (
      game_id,
      user_id,
      player_id,
      joined_at
    ) values (
      p_new_game_id,
      v_source_collaborator.user_id,
      v_new_player_id,
      v_now
    );
  end loop;

  if v_has_collaborators then
    update public.games
    set updated_at = v_now + 1
    where id = p_new_game_id
    returning * into v_new_game;
  end if;

  return v_new_game;
end;
$$;

revoke all on function public.replay_shared_game(
  text,
  text,
  text,
  uuid[]
) from public;
revoke all on function public.replay_shared_game(
  text,
  text,
  text,
  uuid[]
) from anon;
grant execute on function public.replay_shared_game(
  text,
  text,
  text,
  uuid[]
) to authenticated;
