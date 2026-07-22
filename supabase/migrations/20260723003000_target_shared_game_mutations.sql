create or replace function public.rename_shared_game(
  p_game_id text,
  p_name text
)
returns public.games
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game public.games%rowtype;
  v_name text;
  v_now bigint;
begin
  if auth.uid() is null then
    raise exception 'Sign in to rename this game.' using errcode = '42501';
  end if;

  v_name := upper(left(trim(coalesce(p_name, '')), 28));
  if v_name = '' then
    raise exception 'Enter a game name.' using errcode = '22023';
  end if;

  select * into v_game
  from public.games
  where id = p_game_id
  for update;

  if not found or not (
    v_game.user_id = auth.uid()
    or exists (
      select 1
      from public.game_collaborators collaborator
      where collaborator.game_id = p_game_id
        and collaborator.user_id = auth.uid()
    )
  ) then
    raise exception 'You do not have access to rename this game.' using errcode = '42501';
  end if;

  if not v_game.is_shared then
    raise exception 'This game is not shared.' using errcode = '22023';
  end if;

  if v_game.user_id <> auth.uid() and not v_game.collaborators_can_manage then
    raise exception 'The game owner has not allowed collaborators to rename this game.'
      using errcode = '42501';
  end if;

  if v_game.name = v_name then
    return v_game;
  end if;

  v_now := greatest(
    floor(extract(epoch from clock_timestamp()) * 1000),
    v_game.updated_at + 1
  );

  update public.games
  set name = v_name,
      updated_at = v_now
  where id = p_game_id
  returning * into v_game;

  return v_game;
end;
$$;

create or replace function public.add_shared_game_player(
  p_game_id text,
  p_player_id text,
  p_name text,
  p_avatar_color text,
  p_profile_id text default null
)
returns public.games
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game public.games%rowtype;
  v_name text;
  v_avatar_color text;
  v_player jsonb;
  v_players jsonb;
  v_now bigint;
  v_has_ended boolean := false;
  v_participant_count integer;
  v_leader integer;
  v_runner_up integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to add a player.' using errcode = '42501';
  end if;

  v_name := left(trim(coalesce(p_name, '')), 28);
  v_avatar_color := left(trim(coalesce(p_avatar_color, '')), 64);
  if trim(coalesce(p_player_id, '')) = '' or v_name = '' or v_avatar_color = '' then
    raise exception 'Player details are incomplete.' using errcode = '22023';
  end if;

  select * into v_game
  from public.games
  where id = p_game_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Only the game owner can add players.' using errcode = '42501';
  end if;

  if not v_game.is_shared then
    raise exception 'This game is not shared.' using errcode = '22023';
  end if;

  if v_game.participant_mode = 'teams' then
    raise exception 'Shared play is currently available for player games only.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_game.players, '[]'::jsonb)) player
    where player ->> 'id' = p_player_id
  ) then
    raise exception 'That player is already in this game.' using errcode = '22023';
  end if;

  v_now := greatest(
    floor(extract(epoch from clock_timestamp()) * 1000),
    v_game.updated_at + 1
  );
  v_player := jsonb_build_object(
    'id', p_player_id,
    'name', v_name,
    'score', v_game.starting_score,
    'createdAt', v_now,
    'reachedAt', v_now,
    'avatarColor', v_avatar_color
  );
  if p_profile_id is not null and trim(p_profile_id) <> '' then
    v_player := v_player || jsonb_build_object('profileId', p_profile_id);
  end if;
  v_players := jsonb_build_array(v_player)
    || coalesce(v_game.players, '[]'::jsonb);

  v_participant_count := jsonb_array_length(v_players);
  if not v_game.manual_end_only and v_participant_count > 0 then
    if v_game.win_condition = 'reach_zero' then
      select exists (
        select 1 from jsonb_array_elements(v_players) player
        where (player ->> 'score')::integer <= v_game.target_score
      ) into v_has_ended;
    elsif v_game.win_by_two and v_game.win_condition = 'lowest' then
      if v_participant_count >= 2 then
        select score into v_leader from (
          select (player ->> 'score')::integer score
          from jsonb_array_elements(v_players) player
          order by score asc limit 1
        ) scores;
        select score into v_runner_up from (
          select (player ->> 'score')::integer score
          from jsonb_array_elements(v_players) player
          order by score asc offset 1 limit 1
        ) scores;
        select exists (
          select 1 from jsonb_array_elements(v_players) player
          where (player ->> 'score')::integer >= v_game.target_score
        ) and v_runner_up - v_leader >= 2 into v_has_ended;
      end if;
    elsif v_game.win_by_two then
      if v_participant_count >= 2 then
        select score into v_leader from (
          select (player ->> 'score')::integer score
          from jsonb_array_elements(v_players) player
          order by score desc limit 1
        ) scores;
        select score into v_runner_up from (
          select (player ->> 'score')::integer score
          from jsonb_array_elements(v_players) player
          order by score desc offset 1 limit 1
        ) scores;
        v_has_ended := v_leader >= v_game.target_score
          and v_leader - v_runner_up >= 2;
      end if;
    else
      select exists (
        select 1 from jsonb_array_elements(v_players) player
        where (player ->> 'score')::integer >= v_game.target_score
      ) into v_has_ended;
    end if;
  end if;

  update public.games
  set players = v_players,
      completion_mode = null,
      ended_at = case when v_has_ended then coalesce(v_game.ended_at, v_now) else null end,
      updated_at = v_now
  where id = p_game_id
  returning * into v_game;

  return v_game;
end;
$$;

create or replace function public.update_shared_game_player(
  p_game_id text,
  p_player_id text,
  p_name text,
  p_avatar_color text,
  p_profile_id text,
  p_team_id text
)
returns public.games
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game public.games%rowtype;
  v_name text;
  v_avatar_color text;
  v_players jsonb;
  v_now bigint;
begin
  if auth.uid() is null then
    raise exception 'Sign in to update a player.' using errcode = '42501';
  end if;

  v_name := left(trim(coalesce(p_name, '')), 28);
  v_avatar_color := left(trim(coalesce(p_avatar_color, '')), 64);
  if v_name = '' or v_avatar_color = '' then
    raise exception 'Player details are incomplete.' using errcode = '22023';
  end if;

  select * into v_game
  from public.games
  where id = p_game_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Only the game owner can update players.' using errcode = '42501';
  end if;

  if not v_game.is_shared then
    raise exception 'This game is not shared.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.game_collaborators collaborator
    where collaborator.game_id = p_game_id
      and collaborator.player_id = p_player_id
  ) then
    raise exception 'A linked player manages their own account identity.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(coalesce(v_game.players, '[]'::jsonb)) player
    where player ->> 'id' = p_player_id
  ) then
    raise exception 'That player is no longer in this game.' using errcode = '22023';
  end if;

  v_now := greatest(
    floor(extract(epoch from clock_timestamp()) * 1000),
    v_game.updated_at + 1
  );

  select coalesce(
    jsonb_agg(
      case
        when player ->> 'id' = p_player_id then
          case
            when p_team_id is null or trim(p_team_id) = '' then
              (
                case
                  when p_profile_id is null or trim(p_profile_id) = '' then
                    (
                      player
                      || jsonb_build_object(
                        'name', v_name,
                        'avatarColor', v_avatar_color
                      )
                    ) - 'profileId'
                  else
                    player || jsonb_build_object(
                      'name', v_name,
                      'avatarColor', v_avatar_color,
                      'profileId', p_profile_id
                    )
                end
              ) - 'teamId'
            else
              (
                case
                  when p_profile_id is null or trim(p_profile_id) = '' then
                    (
                      player
                      || jsonb_build_object(
                        'name', v_name,
                        'avatarColor', v_avatar_color
                      )
                    ) - 'profileId'
                  else
                    player || jsonb_build_object(
                      'name', v_name,
                      'avatarColor', v_avatar_color,
                      'profileId', p_profile_id
                    )
                end
              ) || jsonb_build_object('teamId', p_team_id)
          end
        else player
      end
      order by position
    ),
    '[]'::jsonb
  ) into v_players
  from jsonb_array_elements(coalesce(v_game.players, '[]'::jsonb))
    with ordinality as entries(player, position);

  update public.games
  set players = v_players,
      updated_at = v_now
  where id = p_game_id
  returning * into v_game;

  return v_game;
end;
$$;

create or replace function public.set_shared_game_collaborator_management(
  p_game_id text,
  p_enabled boolean
)
returns public.games
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game public.games%rowtype;
  v_now bigint;
begin
  if auth.uid() is null then
    raise exception 'Sign in to change collaboration settings.' using errcode = '42501';
  end if;

  select * into v_game
  from public.games
  where id = p_game_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Only the game owner can change collaboration settings.'
      using errcode = '42501';
  end if;

  if not v_game.is_shared then
    raise exception 'This game is not shared.' using errcode = '22023';
  end if;

  if v_game.collaborators_can_manage = p_enabled then
    return v_game;
  end if;

  v_now := greatest(
    floor(extract(epoch from clock_timestamp()) * 1000),
    v_game.updated_at + 1
  );
  update public.games
  set collaborators_can_manage = p_enabled,
      updated_at = v_now
  where id = p_game_id
  returning * into v_game;

  return v_game;
end;
$$;

create or replace function public.update_shared_game_settings_v2(
  p_game_id text,
  p_name text,
  p_score_direction text,
  p_starting_score integer,
  p_target_score integer,
  p_win_condition text,
  p_win_by_two boolean,
  p_manual_end_only boolean,
  p_timer_enabled boolean,
  p_dice_enabled boolean,
  p_timer_mode text,
  p_timer_seconds integer,
  p_collaborators_can_manage boolean
)
returns public.games
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game public.games%rowtype;
  v_now bigint;
begin
  select public.update_shared_game_settings(
    p_game_id,
    p_name,
    p_score_direction,
    p_starting_score,
    p_target_score,
    p_win_condition,
    p_win_by_two,
    p_manual_end_only,
    p_timer_enabled,
    p_dice_enabled,
    p_timer_mode,
    p_timer_seconds
  ) into v_game;

  if v_game.user_id = auth.uid()
    and v_game.collaborators_can_manage is distinct from p_collaborators_can_manage then
    v_now := greatest(
      floor(extract(epoch from clock_timestamp()) * 1000),
      v_game.updated_at + 1
    );
    update public.games
    set collaborators_can_manage = p_collaborators_can_manage,
        updated_at = v_now
    where id = p_game_id
    returning * into v_game;
  end if;

  return v_game;
end;
$$;

revoke all on function public.rename_shared_game(text, text) from public;
revoke all on function public.rename_shared_game(text, text) from anon;
grant execute on function public.rename_shared_game(text, text) to authenticated;

revoke all on function public.add_shared_game_player(text, text, text, text, text)
  from public;
revoke all on function public.add_shared_game_player(text, text, text, text, text)
  from anon;
grant execute on function public.add_shared_game_player(text, text, text, text, text)
  to authenticated;

revoke all on function public.update_shared_game_player(text, text, text, text, text, text)
  from public;
revoke all on function public.update_shared_game_player(text, text, text, text, text, text)
  from anon;
grant execute on function public.update_shared_game_player(text, text, text, text, text, text)
  to authenticated;

revoke all on function public.set_shared_game_collaborator_management(text, boolean)
  from public;
revoke all on function public.set_shared_game_collaborator_management(text, boolean)
  from anon;
grant execute on function public.set_shared_game_collaborator_management(text, boolean)
  to authenticated;

revoke all on function public.update_shared_game_settings_v2(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, text, integer, boolean
) from public;
revoke all on function public.update_shared_game_settings_v2(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, text, integer, boolean
) from anon;
grant execute on function public.update_shared_game_settings_v2(
  text, text, text, integer, integer, text, boolean, boolean,
  boolean, boolean, text, integer, boolean
) to authenticated;
